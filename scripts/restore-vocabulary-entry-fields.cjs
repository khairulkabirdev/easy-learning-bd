/*
 * eLesson - non-destructive VocabularyEntry schema/client repair.
 *
 * - Preserves the existing prisma/schema.prisma (adds only four missing fields).
 * - Creates backups of the schema and SQLite database before changes.
 * - Creates ONLY missing VocabularyEntry columns; never deletes or recreates data.
 * - Regenerates Prisma Client so the page's select query recognizes the fields.
 *
 * Stop the Next.js server before running:
 *   node scripts/restore-vocabulary-entry-fields.cjs
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = process.cwd();
const schemaPath = path.join(root, "prisma", "schema.prisma");
const fieldNames = ["partOfSpeech", "pronunciation", "synonyms", "antonyms"];

function fail(message) {
  throw new Error(message);
}

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) fail("DATABASE_URL is missing and .env does not exist.");
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith("#")) continue;
    const match = line.match(/^DATABASE_URL\s*=\s*(.+)$/);
    if (!match) continue;
    let value = match[1].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return value;
  }
  fail("DATABASE_URL not found in .env. No files changed.");
}

function sqliteFilePath(databaseUrl) {
  if (!databaseUrl.startsWith("file:")) {
    fail("This repair only supports file: SQLite databases. No files changed.");
  }
  const uriPath = databaseUrl.slice("file:".length).split("?")[0];
  if (!uriPath || uriPath === ":memory:") fail("A persistent SQLite file is required.");
  const rawPath = decodeURIComponent(uriPath);
  if (path.isAbsolute(rawPath) || /^[A-Za-z]:[\\/]/.test(rawPath)) return path.normalize(rawPath);
  // Prisma SQLite URLs are resolved relative to the Prisma schema directory.
  return path.resolve(path.dirname(schemaPath), rawPath);
}

function findModel(schema) {
  const match = /(^model\s+VocabularyEntry\s*\{\r?\n)([\s\S]*?)(^\})/m.exec(schema);
  if (!match) fail("model VocabularyEntry was not found in prisma/schema.prisma. No changes made.");
  if (!/^\s*word\s+String\b/m.test(match[2])) {
    fail("VocabularyEntry.word is missing or not a String; review schema manually before changing it.");
  }
  return match;
}

function amendedSchema(schema) {
  const match = findModel(schema);
  const body = match[2];
  const missing = [];
  for (const name of fieldNames) {
    const found = new RegExp(`^\\s*${name}\\s+(\\S+)`, "m").exec(body);
    if (found) {
      if (found[1] !== "String" && found[1] !== "String?") {
        fail(`VocabularyEntry.${name} has type ${found[1]}; refusing to change an existing field.`);
      }
    } else {
      missing.push(name);
    }
  }
  if (!missing.length) return { schema, missing };

  const newline = schema.includes("\r\n") ? "\r\n" : "\n";
  const newFieldLines = missing
    .map((name) => `  ${name.padEnd(17, " ")} String   @default("")${newline}`)
    .join("");
  const updatedBody = body.replace(/^(\s*word\s+String[^\r\n]*\r?\n)/m, `$1${newFieldLines}`);
  if (updatedBody === body) fail("Could not safely insert the new fields after VocabularyEntry.word.");
  const start = match.index + match[1].length;
  const updated = schema.slice(0, start) + updatedBody + schema.slice(start + body.length);
  return { schema: updated, missing };
}

async function main() {
  if (!fs.existsSync(schemaPath)) fail("Run from the eLesson project root; prisma/schema.prisma was not found.");
  const databasePath = sqliteFilePath(readDatabaseUrl());
  if (!fs.existsSync(databasePath)) fail(`Database file not found: ${databasePath}. No files changed.`);

  // A non-empty write-ahead log can contain committed transactions not yet in the DB file.
  // Stop here rather than making a potentially incomplete file-copy backup.
  const walPath = databasePath + "-wal";
  if (fs.existsSync(walPath) && fs.statSync(walPath).size > 0) {
    fail(`Nonempty SQLite WAL detected (${walPath}). Stop all app connections and checkpoint/back up the DB safely before running this tool.`);
  }

  const originalSchema = fs.readFileSync(schemaPath, "utf8");
  const result = amendedSchema(originalSchema); // Validate before any file changes.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(root, "backups", `vocabulary-entry-${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(schemaPath, path.join(backupDir, "schema.prisma"), fs.constants.COPYFILE_EXCL);
  fs.copyFileSync(databasePath, path.join(backupDir, path.basename(databasePath)), fs.constants.COPYFILE_EXCL);
  console.log(`Backups created in ${path.relative(root, backupDir)}.`);

  if (result.missing.length) {
    fs.writeFileSync(schemaPath, result.schema, "utf8");
    console.log(`Added missing Prisma schema fields: ${result.missing.join(", ")}`);
  } else {
    console.log("All four fields already exist in prisma/schema.prisma.");
  }

  const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
  if (!fs.existsSync(prismaCli)) {
    fail("Local Prisma CLI is missing. Run npm install, then rerun this script. Backups and schema changes are preserved.");
  }
  execFileSync(process.execPath, [prismaCli, "generate", "--schema", schemaPath], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: readDatabaseUrl() },
  });

  const { PrismaClient } = require(path.join(root, "generated", "prisma", "client"));
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe('PRAGMA table_info("VocabularyEntry")');
    if (!rows.length) fail("The VocabularyEntry table does not exist. Nothing was altered.");
    const present = new Set(rows.map((row) => String(row.name)));
    const before = await prisma.$queryRawUnsafe('SELECT COUNT(*) AS total FROM "VocabularyEntry"');
    for (const name of fieldNames) {
      if (present.has(name)) {
        console.log(`Kept existing database column VocabularyEntry.${name}`);
        continue;
      }
      // Whitelisted field names and a constant SQL definition; never drops/rebuilds tables.
      await prisma.$executeRawUnsafe(`ALTER TABLE "VocabularyEntry" ADD COLUMN "${name}" TEXT NOT NULL DEFAULT ''`);
      console.log(`Added database column VocabularyEntry.${name}`);
    }
    const after = await prisma.$queryRawUnsafe('SELECT COUNT(*) AS total FROM "VocabularyEntry"');
    if (String(before[0].total) !== String(after[0].total)) fail("VocabularyEntry row count unexpectedly changed.");
    const integrity = await prisma.$queryRawUnsafe("PRAGMA integrity_check");
    if (!integrity.some((row) => String(row.integrity_check).toLowerCase() === "ok")) {
      fail("SQLite integrity_check failed. Restore from the backup before continuing.");
    }
    console.log(`Verified ${String(after[0].total)} existing vocabulary rows; database integrity OK.`);
    console.log("Repair finished. Restart Next.js to reload the regenerated Prisma Client.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`Repair stopped: ${error.message}`);
  process.exitCode = 1;
});
