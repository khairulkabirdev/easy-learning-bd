import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, chmod, open, stat } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

// Delete children first, including legacy standalone exercise tables. Never accept
// SQL identifiers from a form. The curriculum and account tables are not targets.
const CONTENT_TABLES = [
  "ModelQuestionSetBlock", "ModelQuestionSet", "ModelQuestionImport",
  "VocabularyEntry", "SynonymsAntonymsEntry", "Paragraph", "Vocabulary",
  "SynonymsAntonyms", "GapFillExercise", "GapFillFirstPaper", "GapFillSecondPaper",
  "McqSection", "QuestionAnswerExercise", "TableCompletionExercise",
  "ColumnMatchingExercise", "RearrangeSentenceExercise", "QuestionFromPoems",
  "QuestionFromStory", "TrueFalseExercise", "InformationTransfer", "SubstitutionTable",
  "RightFormOfVerb", "Narration", "ChangingSentence", "PunctuationAndCapitalization",
  "Preposition", "SuffixAndPrefix", "PartsOfSpeech", "TagQuestion", "Connector",
  "SeenPassageOne", "SeenPassageTwo", "ContentBlock", "Content", "UnseenComposition",
  "SubjectMatchingSentencesBlock", "SubjectRearrangeSentenceBlock",
  "SubjectQuestionFromPoemsBlock", "SubjectQuestionFromStoryBlock",
  "SubjectEnglishSecondPaperBlock", "SubjectPartsOfSpeechBlock",
] as const;
const KNOWN_PROTECTED = new Set([
  "Class", "Subject", "Unit", "Lesson", "User", "AuthSession", "PasswordResetToken",
  "AuthEmailSetting", "AuditLog", "Board", "AcademicYear", "StorageConfiguration",
  "UploadedFile", "StudentDailyGoal", "_prisma_migrations",
]);
export class CleanupError extends Error {}
export const CLEANUP_CONFIRMATION = "CLEAR CONTENT";
const options = { maxWait: 15_000, timeout: 120_000 };
type Reader = Pick<Prisma.TransactionClient, "$queryRawUnsafe" | "$executeRawUnsafe">;
export type CleanupTable = { name: string; count: number; disposition: "content" | "topic" | "protected" };
export type CleanupPreview = { tables: CleanupTable[]; token: string; blocked: string };
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';
const count = async (db: Reader, name: string) => Number((await db.$queryRawUnsafe<{ count: bigint | number }[]>(`SELECT COUNT(*) AS count FROM ${quote(name)}`))[0].count);
const json = (value: unknown) => JSON.stringify(value, (_, v) => typeof v === "bigint" ? v.toString() : v);

async function inspect(db: Reader, organizationId: string): Promise<CleanupPreview> {
  const names = (await db.$queryRawUnsafe<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )).map(row => row.name);
  const targets = new Set<string>([...CONTENT_TABLES, "Topic"]);
  // This is a maintenance operation for a single-organization SQLite deployment.
  // Do not disclose other organizations' counts or risk cross-tenant cascades.
  for (const name of names) {
    const cols = await db.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info(${quote(name)})`);
    if (cols.some(col => col.name === "organizationId")) {
      const other = await db.$queryRawUnsafe<{ count: bigint | number }[]>(
        `SELECT COUNT(*) AS count FROM ${quote(name)} WHERE organizationId IS NULL OR organizationId <> ?`, organizationId,
      );
      if (Number(other[0].count) > 0) return { tables: [], token: "", blocked: "Database cleanup is available only on a single-organization database." };
    }
  }
  const missing = [...targets, "Class", "Subject", "Unit", "Lesson", "User", "AuditLog", "UploadedFile"].filter(name => !names.includes(name));
  const unknown = names.filter(name => !targets.has(name) && !KNOWN_PROTECTED.has(name));
  let blocked = missing.length ? `Required database tables are missing: ${missing.join(", ")}. Run the existing schema repair first.` : "";
  if (unknown.length) blocked = `Unreviewed database tables detected: ${unknown.join(", ")}. Review their relationships before enabling cleanup.`;
  // Prevent an unexpected FK from deleting protected rows. Only UploadedFile's
  // existing SET NULL reference to VocabularyEntry is intentionally permitted.
  for (const name of names) {
    if (targets.has(name)) continue;
    const refs = await db.$queryRawUnsafe<{ table: string; from: string; on_delete: string }[]>(`PRAGMA foreign_key_list(${quote(name)})`);
    if (refs.some(ref => targets.has(ref.table) && !(name === "UploadedFile" && ref.table === "VocabularyEntry" && ref.from === "vocabularyEntryId" && ref.on_delete === "SET NULL"))) {
      blocked = "A protected table references content unexpectedly. Cleanup is blocked until its relationships are reviewed.";
    }
  }
  const tables: CleanupTable[] = [];
  const hash = createHash("sha256");
  for (const name of names) {
    const disposition = name === "Topic" ? "topic" : targets.has(name) ? "content" : "protected";
    tables.push({ name, count: await count(db, name), disposition });
    if (disposition !== "protected" || name === "UploadedFile") {
      // Fingerprint the actual rows, not just counts, to reject stale previews.
      hash.update(name + "\n");
      hash.update(json(await db.$queryRawUnsafe<unknown[]>(`SELECT * FROM ${quote(name)} ORDER BY id`)));
    }
  }
  return { tables, token: hash.digest("hex"), blocked };
}

export async function getDatabaseCleanupPreview(organizationId: string) {
  return prisma.$transaction(tx => inspect(tx, organizationId), options);
}

async function assertIntegrity(db: Reader) {
  const quick = await db.$queryRawUnsafe<Record<string, string>[]>("PRAGMA quick_check");
  if (quick.length !== 1 || Object.values(quick[0])[0] !== "ok") throw new CleanupError("SQLite integrity check failed.");
  if ((await db.$queryRawUnsafe<unknown[]>("PRAGMA foreign_key_check")).length) throw new CleanupError("SQLite foreign-key check failed.");
}

async function backupDatabase() {
  const databases = await prisma.$queryRawUnsafe<{ name: string; file: string }[]>("PRAGMA database_list");
  const source = databases.find(db => db.name === "main")?.file;
  if (!source || !path.isAbsolute(source)) throw new CleanupError("A persistent SQLite file is required for cleanup.");
  const dir = path.join(path.dirname(source), ".database-cleanup-backups");
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
  const filename = `before-content-cleanup-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.db`;
  const destination = path.join(dir, filename);
  // VACUUM INTO makes a consistent SQLite backup even when WAL is in use.
  // It must run outside the interactive transaction; failure aborts cleanup.
  await prisma.$executeRawUnsafe("VACUUM INTO ?", destination);
  await chmod(destination, 0o600);
  const file = await open(destination, "r");
  try {
    const header = Buffer.alloc(16);
    await file.read(header, 0, 16, 0);
    if (header.toString("binary") !== "SQLite format 3\u0000" || (await stat(destination)).size < 100) throw new CleanupError("SQLite backup verification failed.");
  } finally { await file.close(); }
  return filename;
}

export async function clearDatabaseContent(input: {
  organizationId: string; userId: string; userName: string; token: string; includeTopics: boolean;
}) {
  const initial = await getDatabaseCleanupPreview(input.organizationId);
  if (initial.blocked) throw new CleanupError(initial.blocked);
  if (initial.token !== input.token) throw new CleanupError("Content changed after the preview. Refresh the page before trying again.");
  const targets = new Set<string>(input.includeTopics ? [...CONTENT_TABLES, "Topic"] : CONTENT_TABLES);
  if (!initial.tables.some(t => targets.has(t.name) && t.count > 0)) return { deleted: 0, backup: "" };
  await assertIntegrity(prisma);
  const backup = await backupDatabase();
  return prisma.$transaction(async tx => {
    const before = await inspect(tx, input.organizationId);
    if (before.blocked || before.token !== initial.token) throw new CleanupError("Database changed during backup. No records were deleted. Refresh the page.");
    const foreignKeys = await tx.$queryRawUnsafe<{ foreign_keys: bigint | number }[]>("PRAGMA foreign_keys");
    if (Number(foreignKeys[0]?.foreign_keys) !== 1) throw new CleanupError("SQLite foreign-key enforcement is disabled.");
    await assertIntegrity(tx);
    // Full-table DELETE is safe only after the single-org and schema checks above.
    for (const name of targets) await tx.$executeRawUnsafe(`DELETE FROM ${quote(name)}`);
    await assertIntegrity(tx);
    for (const table of before.tables) {
      const expected = targets.has(table.name) ? 0 : table.count;
      if (await count(tx, table.name) !== expected) throw new CleanupError(`Unexpected record count in ${table.name}; cleanup rolled back.`);
    }
    const deleted = before.tables.filter(t => targets.has(t.name)).reduce((sum, t) => sum + t.count, 0);
    // Record the audit in the same transaction so a failed audit cannot leave an unreported deletion.
    await tx.auditLog.create({ data: {
      userId: input.userId, userName: input.userName, organizationId: input.organizationId,
      action: "delete", entityName: "DatabaseContentCleanup", entityId: "content",
      changes: JSON.stringify({ backup, deleted, includeTopics: input.includeTopics, tables: before.tables.filter(t => targets.has(t.name)) }),
    } });
    return { deleted, backup };
  }, options);
}
