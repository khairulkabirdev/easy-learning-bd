/*
 * eLesson: additive repair for ModelQuestionSet.editorContentId.
 * This script never creates a database, deletes records, drops tables, or resets migrations.
 * Stop Next.js and other SQLite writers before running.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const schemaFile = path.join(projectRoot, "prisma", "schema.prisma");

function requireExistingFile(file, label) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`${label} not found: ${file}. Aborting; no database will be created.`);
  }
}

function readLocalEnv() {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(projectRoot, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      const value = match[2];
      process.env[match[1]] = /^["'].*["']$/.test(value) ? value.slice(1, -1) : value;
    }
  }
}

function locateDatabase() {
  const url = process.env.DATABASE_URL;
  if (typeof url !== "string" || !url.startsWith("file:")) {
    throw new Error("Expected an existing SQLite DATABASE_URL=file:...; no changes made.");
  }
  const raw = decodeURIComponent(url.slice(5).split("?")[0]);
  if (!raw || raw === ":memory:") throw new Error("Refusing an empty or in-memory SQLite database URL.");
  // Prisma resolves relative file URLs relative to prisma/schema.prisma.
  return path.isAbsolute(raw) ? raw : path.resolve(path.dirname(schemaFile), raw);
}

function plannedSchemaUpdate(original) {
  const modelMatch = original.match(/^model\s+ModelQuestionSet\s*\{[\s\S]*?^\}/m);
  if (!modelMatch) throw new Error("ModelQuestionSet model missing in schema.prisma. Aborting.");
  const model = modelMatch[0];
  const field = model.match(/^\s*editorContentId\s+([^\r\n]+)$/m);
  let changed;
  if (!field) {
    changed = model.replace(/^(\s*name\s+String\b[^\r\n]*)$/m, "$1\n  editorContentId String? @unique");
    if (changed === model) throw new Error("ModelQuestionSet.name field not found. Aborting rather than guessing where to insert.");
  } else {
    if (!/^String\?(?:\s|$)/.test(field[1])) {
      throw new Error("Existing editorContentId has an unexpected Prisma type. Aborting to avoid changing your schema incorrectly.");
    }
    changed = /@unique\b/.test(field[1]) ? model : model.replace(field[0], `${field[0]} @unique`);
  }
  return original.replace(model, changed);
}

function backUp(dbFile) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(projectRoot, "backups", `model-question-editor-content-id-${stamp}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(dbFile, path.join(dir, path.basename(dbFile)));
  fs.copyFileSync(schemaFile, path.join(dir, "schema.prisma"));
  console.log(`Backup created: ${dir}`);
}

function generatePrisma() {
  const packageFile = require.resolve("prisma/package.json", { paths: [projectRoot] });
  const prismaPkg = JSON.parse(fs.readFileSync(packageFile, "utf8"));
  const cliRelative = typeof prismaPkg.bin === "string" ? prismaPkg.bin : prismaPkg.bin?.prisma;
  if (!cliRelative) throw new Error("Prisma CLI executable was not found in the installed Prisma package.");
  const cli = path.resolve(path.dirname(packageFile), cliRelative);
  requireExistingFile(cli, "Prisma CLI");
  console.log("Regenerating Prisma Client from your current schema...");
  const result = spawnSync(process.execPath, [cli, "generate", "--schema", schemaFile], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error("Prisma generation failed. Your data is preserved. After fixing the CLI error, run `npx prisma generate`.");
  }
}

async function main() {
  requireExistingFile(schemaFile, "Prisma schema");
  readLocalEnv();
  const dbFile = locateDatabase();
  requireExistingFile(dbFile, "Current SQLite database");
  for (const suffix of ["-wal", "-journal"]) {
    const auxiliary = `${dbFile}${suffix}`;
    if (fs.existsSync(auxiliary) && fs.statSync(auxiliary).size > 0) {
      throw new Error(`Active SQLite journal exists: ${auxiliary}. Stop database writers and close SQLite tools before retrying. Do NOT delete the journal.`);
    }
  }

  const originalSchema = fs.readFileSync(schemaFile, "utf8");
  const updatedSchema = plannedSchemaUpdate(originalSchema); // Validate before touching anything.
  const { PrismaClient } = require(path.join(projectRoot, "generated", "prisma", "client"));
  const client = new PrismaClient();

  try {
    const found = await client.$queryRawUnsafe(
      'SELECT name FROM sqlite_master WHERE type = \'table\' AND name = \'ModelQuestionSet\''
    );
    if (found.length !== 1) {
      throw new Error("ModelQuestionSet table is missing from the current database. Refusing to create a new database/table. Check DATABASE_URL.");
    }
    const beforeCount = await client.$queryRawUnsafe('SELECT COUNT(*) AS count FROM "ModelQuestionSet"');
    const before = String(beforeCount[0].count);
    const columns = await client.$queryRawUnsafe('PRAGMA table_info("ModelQuestionSet")');
    const hasColumn = columns.some((col) => col.name === "editorContentId");
    const integrityBefore = await client.$queryRawUnsafe("PRAGMA integrity_check");
    if (integrityBefore[0]?.integrity_check !== "ok") throw new Error("Existing database integrity check failed; aborting without modifications.");

    backUp(dbFile);
    await client.$transaction(async (tx) => {
      if (!hasColumn) {
        await tx.$executeRawUnsafe('ALTER TABLE "ModelQuestionSet" ADD COLUMN "editorContentId" TEXT');
        console.log("Added nullable editorContentId column (all existing values remain untouched).");
      } else {
        console.log("Database column already exists; preserving its values.");
      }
      await tx.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "ModelQuestionSet_editorContentId_key" ON "ModelQuestionSet"("editorContentId")');
    });

    const afterCount = await client.$queryRawUnsafe('SELECT COUNT(*) AS count FROM "ModelQuestionSet"');
    if (String(afterCount[0].count) !== before) throw new Error("ModelQuestionSet record count unexpectedly changed. Stop and review the backup.");
    const integrityAfter = await client.$queryRawUnsafe("PRAGMA integrity_check");
    if (integrityAfter[0]?.integrity_check !== "ok") throw new Error("SQLite integrity check failed. Stop and review the backup.");
    console.log(`ModelQuestionSet records preserved: ${before}; SQLite integrity: ok.`);
  } finally {
    await client.$disconnect();
  }

  if (updatedSchema !== originalSchema) {
    fs.writeFileSync(schemaFile, updatedSchema, "utf8");
    console.log("Updated only ModelQuestionSet.editorContentId in existing schema.prisma.");
  } else {
    console.log("Prisma schema already contains the correct optional unique field.");
  }
  generatePrisma();
  console.log("Done. Restart `npm run dev` and reload the Model Question page.");
}

main().catch((err) => {
  console.error(`Repair stopped: ${err instanceof Error ? err.message : String(err)}`);
  console.error("No user records were deleted. Keep the backup before retrying.");
  process.exitCode = 1;
});
