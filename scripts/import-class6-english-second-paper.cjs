/* eslint-disable no-console */
/**
 * Non-destructive, idempotent Class 6 English 2nd Paper practice importer.
 *
 * Run from project root after npm install / prisma generate:
 *   node scripts/import-class6-english-second-paper.cjs
 *   node scripts/import-class6-english-second-paper.cjs --dry-run
 *
 * Keeps existing content and skips records whose deterministic IDs already exist.
 */
const fs = require("node:fs");
const path = require("node:path");

function loadEnv() {
  const envFile = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envFile)) return;
  const lines = fs.readFileSync(envFile, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}
loadEnv();

if (!process.env.DATABASE_URL?.startsWith("file:")) {
  console.error("Expected a SQLite DATABASE_URL=file:... in .env. Nothing changed.");
  process.exit(1);
}

const datasetPath = path.join(process.cwd(), "data", "class6-english-second-paper.json");
const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
const { PrismaClient } = require("../generated/prisma/client");
const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function main() {
  if (dataset.records.length !== 200 || new Set(dataset.records.map((record) => record.id)).size !== 200) {
    throw new Error("Expected exactly 200 unique practice records. No changes made.");
  }
  const subject = await prisma.subject.findFirst({
    where: { id: dataset.subjectId, classId: dataset.classId },
    select: { id: true, name: true, slug: true, organizationId: true },
  });
  if (!subject || !/english|ইংরেজি/i.test(`${subject.name} ${subject.slug}`) || !/2nd|second/i.test(`${subject.name} ${subject.slug}`)) {
    throw new Error("The expected Class 6 English 2nd Paper subject was not found. No changes made.");
  }
  const admin = await prisma.user.findFirst({
    where: { organizationId: subject.organizationId, role: "admin" },
    select: { id: true },
  });
  if (!admin) throw new Error("An organization administrator must exist before importing.");

  const already = await prisma.subjectEnglishSecondPaperBlock.findMany({
    where: { id: { in: dataset.records.map((item) => item.id) }, organizationId: subject.organizationId },
    select: { id: true },
  });
  const ids = new Set(already.map((item) => item.id));
  const toCreate = dataset.records.filter((item) => !ids.has(item.id));
  const counts = Object.fromEntries([...new Set(dataset.records.map((r) => r.kind))].map((kind) => [kind, toCreate.filter((r) => r.kind === kind).length]));
  console.log(`Class 6 English 2nd Paper: ${toCreate.length} to import, ${ids.size} already present.`);
  console.table(counts);
  if (dryRun || toCreate.length === 0) {
    console.log(dryRun ? "Dry run: no database changes made." : "All supplied records are already present.");
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.subjectEnglishSecondPaperBlock.createMany({
      data: toCreate.map((record) => ({
        ...record,
        organizationId: subject.organizationId,
        createdBy: admin.id,
        updatedBy: admin.id,
      })),
    });
  }, { timeout: 60000 });
  console.log(`Inserted ${toCreate.length} records. Your existing content was not modified.`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
