/*
 * eLesson: non-destructive UploadedFile.sortOrder repair.
 *
 * Fixes PrismaClientValidationError: Unknown argument `sortOrder` while
 * ordering VocabularyEntry.uploadedFiles. Does not replace the current
 * Prisma schema or delete, reset, seed, or rebuild any existing tables.
 *
 * Stop all app/SQLite writers, then from the project root run:
 *   node scripts/repair-uploaded-file-sort-order.cjs
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const root = process.cwd();
const schemaPath = path.join(root, "prisma", "schema.prisma");

function fail(message) {
  throw new Error(message);
}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // Match Next.js' development env-file precedence without installing dotenv.
  for (const filename of [".env.development.local", ".env.local", ".env.development", ".env"]) {
    const filenameAbs = path.join(root, filename);
    if (!fs.existsSync(filenameAbs)) continue;
    const data = fs.readFileSync(filenameAbs, "utf8");
    for (const line of data.split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      let value = match[1].trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else {
        value = value.replace(/\s+#.*$/, "");
      }
      if (!value) fail(`DATABASE_URL in ${filename} is empty.`);
      return value;
    }
  }
  fail("DATABASE_URL is not set. No files changed.");
}

function getDatabasePath(url) {
  if (!url.startsWith("file:")) {
    fail("This repair supports only SQLite DATABASE_URL=file:... . No files changed.");
  }
  let raw;
  try {
    raw = decodeURIComponent(url.slice(5).split("?")[0]);
  } catch {
    fail("DATABASE_URL contains an invalid encoded path.");
  }
  if (!raw || raw === ":memory:") fail("A persistent SQLite file is required.");
  return path.isAbsolute(raw) || /^[A-Za-z]:[\\/]/.test(raw)
    ? path.normalize(raw)
    : path.resolve(path.dirname(schemaPath), raw);
}

function planSchemaPatch(original) {
  const match = /(^model\s+UploadedFile\s*\{\r?\n)([\s\S]*?)(^\})/m.exec(original);
  if (!match) fail("Prisma model UploadedFile was not found. No changes made.");
  const body = match[2];
  if (/^\s*@@map\s*\(/m.test(body)) {
    fail("UploadedFile uses a mapped SQL table. Review manually before changing it.");
  }
  for (const name of ["id", "vocabularyEntryId", "createdAt", "isCurrent"]) {
    if (!new RegExp(`^\\s*${name}\\s+`, "m").test(body)) {
      fail(`UploadedFile.${name} is missing. Review model manually.`);
    }
  }
  const existingField = /^\s*sortOrder\s+(\S+)([^\r\n]*)$/m.exec(body);
  if (existingField) {
    if (existingField[1] !== "Int" || /@map\s*\(/.test(existingField[2])) {
      fail("UploadedFile.sortOrder already exists with a different type/mapping. No changes made.");
    }
    return { changed: false, result: original };
  }
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  const updated = body.replace(
    /^(\s*isCurrent\s+Boolean[^\r\n]*\r?\n)/m,
    `$1  sortOrder          Int      @default(0)${newline}`,
  );
  if (updated === body) fail("Could not safely insert sortOrder into UploadedFile model.");
  const offset = match.index + match[1].length;
  return { changed: true, result: original.slice(0, offset) + updated + original.slice(offset + body.length) };
}

function sha256(filename) {
  return crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
}

function backupExistingFiles(databasePath) {
  // A nonempty WAL contains transactions not necessarily present in the main .db.
  // An offline file-copy backup would risk omitting them, so fail closed.
  for (const suffix of ["-wal", "-journal"]) {
    const candidate = databasePath + suffix;
    if (fs.existsSync(candidate) && fs.statSync(candidate).size > 0) {
      fail(`${candidate} is not empty. Stop all SQLite writers and make a consistent database backup/checkpoint before retrying. Do NOT delete journal files.`);
    }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const name = `uploaded-file-sort-order-${stamp}-${crypto.randomBytes(3).toString("hex")}`;
  const backupDir = path.join(root, "backups", name);
  fs.mkdirSync(backupDir, { recursive: true });
  const dbBackup = path.join(backupDir, path.basename(databasePath));
  const schemaBackup = path.join(backupDir, "schema.prisma");
  fs.copyFileSync(databasePath, dbBackup, fs.constants.COPYFILE_EXCL);
  fs.copyFileSync(schemaPath, schemaBackup, fs.constants.COPYFILE_EXCL);
  if (sha256(databasePath) !== sha256(dbBackup) || sha256(schemaPath) !== sha256(schemaBackup)) {
    fail("Backup verification failed. No schema or database changes made.");
  }
  console.log(`Verified backups: ${path.relative(root, backupDir)}`);
  return backupDir;
}

async function inspectTableCounts(prisma) {
  const tables = await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  const counts = new Map();
  for (const row of tables) {
    const name = String(row.name);
    const safeQuoted = `"${name.replace(/"/g, '""')}"`;
    const values = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS total FROM ${safeQuoted}`);
    counts.set(name, String(values[0].total));
  }
  return counts;
}

async function verifyIntegrity(prisma) {
  const rows = await prisma.$queryRawUnsafe("PRAGMA integrity_check");
  if (!rows.some((row) => String(row.integrity_check).toLowerCase() === "ok")) {
    fail("SQLite integrity_check did not return ok. Do not continue without reviewing your backup.");
  }
}

async function main() {
  if (!fs.existsSync(schemaPath)) fail("Run from the eLesson project root (missing prisma/schema.prisma).");
  const databaseUrl = getDatabaseUrl();
  const databasePath = getDatabasePath(databaseUrl);
  if (!fs.existsSync(databasePath) || fs.statSync(databasePath).size === 0) {
    fail(`Existing SQLite database not found or empty: ${databasePath}. No files changed.`);
  }
  const cli = path.join(root, "node_modules", "prisma", "build", "index.js");
  if (!fs.existsSync(cli)) fail("Prisma CLI is missing from node_modules. Install existing project dependencies first; no files changed.");

  const original = fs.readFileSync(schemaPath, "utf8");
  const patch = planSchemaPatch(original);
  backupExistingFiles(databasePath); // Entire DB and current schema, before any changes.

  if (patch.changed) {
    fs.writeFileSync(schemaPath, patch.result, "utf8");
    console.log("Added UploadedFile.sortOrder Int @default(0) to existing Prisma schema.");
  } else {
    console.log("UploadedFile.sortOrder is already declared in Prisma schema.");
  }
  console.log("Regenerating Prisma Client from your current schema...");
  execFileSync(process.execPath, [cli, "generate", "--schema", schemaPath], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  const clientFile = path.join(root, "generated", "prisma", "client");
  let PrismaClient;
  try {
    ({ PrismaClient } = require(clientFile));
  } catch {
    fail("Could not load the generated Prisma Client at generated/prisma/client. Review generator output; backups are available.");
  }
  const prisma = new PrismaClient();
  try {
    await verifyIntegrity(prisma);
    const tableRows = await prisma.$queryRawUnsafe('PRAGMA table_info("UploadedFile")');
    if (!tableRows.length) fail('Database table "UploadedFile" is missing. Nothing was altered.');
    const before = await inspectTableCounts(prisma);
    if (tableRows.some((row) => String(row.name) === "sortOrder")) {
      console.log("UploadedFile.sortOrder already exists in SQLite; existing values preserved.");
    } else {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "UploadedFile" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0',
      );
      console.log("Added UploadedFile.sortOrder to SQLite (existing rows default to 0).");
    }
    const after = await inspectTableCounts(prisma);
    if (before.size !== after.size) fail("Table count changed unexpectedly. Check backups.");
    for (const [table, oldCount] of before) {
      if (after.get(table) !== oldCount) {
        fail(`Row count changed unexpectedly in ${table}. Check backups.`);
      }
    }
    await verifyIntegrity(prisma);
    await prisma.uploadedFile.findMany({ take: 1, select: { id: true, sortOrder: true } });
    console.log(`Success: ${before.size} existing table row counts preserved; integrity ok.`);
    console.log("Restart Next.js to load the regenerated Prisma Client.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`Safe repair stopped: ${error.message}`);
  process.exitCode = 1;
});
