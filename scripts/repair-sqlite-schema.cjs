/* eslint-disable no-console */
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const crypto = require("node:crypto");
const path = require("node:path");

function loadLocalEnvIfNeeded() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadLocalEnvIfNeeded();

if (!process.env.DATABASE_URL?.startsWith("file:")) {
  console.error("This repair script is only for the current SQLite setup (DATABASE_URL=file:...).");
  process.exit(1);
}

let PrismaClient;
try {
  ({ PrismaClient } = require("../generated/prisma/client"));
} catch (error) {
  console.error("Prisma client is missing. Run `npm run prisma:generate` first.");
  throw error;
}

const prisma = new PrismaClient();

const indexes = [
  ["User_organizationId_role_idx", 'CREATE INDEX IF NOT EXISTS "User_organizationId_role_idx" ON "User"("organizationId", "role")'],
  ["User_classId_idx", 'CREATE INDEX IF NOT EXISTS "User_classId_idx" ON "User"("classId")'],
  ["AuthSession_userId_expiresAt_idx", 'CREATE INDEX IF NOT EXISTS "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt")'],
  ["PasswordResetToken_userId_expiresAt_usedAt_idx", 'CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_expiresAt_usedAt_idx" ON "PasswordResetToken"("userId", "expiresAt", "usedAt")'],
  ["AuditLog_organizationId_createdAt_idx", 'CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt")'],
  ["AuditLog_organizationId_entityName_entityId_idx", 'CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_entityName_entityId_idx" ON "AuditLog"("organizationId", "entityName", "entityId")'],
  ["Class_organizationId_status_sortOrder_idx", 'CREATE INDEX IF NOT EXISTS "Class_organizationId_status_sortOrder_idx" ON "Class"("organizationId", "status", "sortOrder")'],
  ["Subject_organizationId_classId_status_sortOrder_idx", 'CREATE INDEX IF NOT EXISTS "Subject_organizationId_classId_status_sortOrder_idx" ON "Subject"("organizationId", "classId", "status", "sortOrder")'],
  ["Unit_organizationId_classId_subjectId_status_sortOrder_idx", 'CREATE INDEX IF NOT EXISTS "Unit_organizationId_classId_subjectId_status_sortOrder_idx" ON "Unit"("organizationId", "classId", "subjectId", "status", "sortOrder")'],
  ["Lesson_organizationId_unitId_status_sortOrder_idx", 'CREATE INDEX IF NOT EXISTS "Lesson_organizationId_unitId_status_sortOrder_idx" ON "Lesson"("organizationId", "unitId", "status", "sortOrder")'],
  ["Topic_organizationId_lessonId_status_sortOrder_idx", 'CREATE INDEX IF NOT EXISTS "Topic_organizationId_lessonId_status_sortOrder_idx" ON "Topic"("organizationId", "lessonId", "status", "sortOrder")'],
  ["Content_organizationId_classId_subjectId_unitId_lessonId_idx", 'CREATE INDEX IF NOT EXISTS "Content_organizationId_classId_subjectId_unitId_lessonId_idx" ON "Content"("organizationId", "classId", "subjectId", "unitId", "lessonId")'],
  ["Content_topicId_idx", 'CREATE INDEX IF NOT EXISTS "Content_topicId_idx" ON "Content"("topicId")'],
  ["ContentBlock_contentId_sortOrder_idx", 'CREATE INDEX IF NOT EXISTS "ContentBlock_contentId_sortOrder_idx" ON "ContentBlock"("contentId", "sortOrder")'],
  ["Paragraph_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "Paragraph_organizationId_contentId_idx" ON "Paragraph"("organizationId", "contentId")'],
  ["SeenPassageOne_contentBlockId_key", 'CREATE UNIQUE INDEX IF NOT EXISTS "SeenPassageOne_contentBlockId_key" ON "SeenPassageOne"("contentBlockId")'],
  ["SeenPassageOne_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "SeenPassageOne_organizationId_contentId_idx" ON "SeenPassageOne"("organizationId", "contentId")'],
  ["SeenPassageTwo_contentBlockId_key", 'CREATE UNIQUE INDEX IF NOT EXISTS "SeenPassageTwo_contentBlockId_key" ON "SeenPassageTwo"("contentBlockId")'],
  ["SeenPassageTwo_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "SeenPassageTwo_organizationId_contentId_idx" ON "SeenPassageTwo"("organizationId", "contentId")'],
  ["Vocabulary_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "Vocabulary_organizationId_contentId_idx" ON "Vocabulary"("organizationId", "contentId")'],
  ["VocabularyEntry_vocabularyId_sortOrder_idx", 'CREATE INDEX IF NOT EXISTS "VocabularyEntry_vocabularyId_sortOrder_idx" ON "VocabularyEntry"("vocabularyId", "sortOrder")'],
  ["VocabularyEntry_organizationId_idx", 'CREATE INDEX IF NOT EXISTS "VocabularyEntry_organizationId_idx" ON "VocabularyEntry"("organizationId")'],
  ["SynonymsAntonyms_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "SynonymsAntonyms_organizationId_contentId_idx" ON "SynonymsAntonyms"("organizationId", "contentId")'],
  ["SynonymsAntonymsEntry_synonymsAntonymsId_sortOrder_idx", 'CREATE INDEX IF NOT EXISTS "SynonymsAntonymsEntry_synonymsAntonymsId_sortOrder_idx" ON "SynonymsAntonymsEntry"("synonymsAntonymsId", "sortOrder")'],
  ["SynonymsAntonymsEntry_organizationId_idx", 'CREATE INDEX IF NOT EXISTS "SynonymsAntonymsEntry_organizationId_idx" ON "SynonymsAntonymsEntry"("organizationId")'],
  ["GapFillExercise_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "GapFillExercise_organizationId_contentId_idx" ON "GapFillExercise"("organizationId", "contentId")'],
  ["GapFillFirstPaper_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "GapFillFirstPaper_organizationId_contentId_idx" ON "GapFillFirstPaper"("organizationId", "contentId")'],
  ["GapFillSecondPaper_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "GapFillSecondPaper_organizationId_contentId_idx" ON "GapFillSecondPaper"("organizationId", "contentId")'],
  ["McqSection_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "McqSection_organizationId_contentId_idx" ON "McqSection"("organizationId", "contentId")'],
  ["QuestionAnswerExercise_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "QuestionAnswerExercise_organizationId_contentId_idx" ON "QuestionAnswerExercise"("organizationId", "contentId")'],
  ["TableCompletionExercise_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "TableCompletionExercise_organizationId_contentId_idx" ON "TableCompletionExercise"("organizationId", "contentId")'],
  ["ColumnMatchingExercise_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "ColumnMatchingExercise_organizationId_contentId_idx" ON "ColumnMatchingExercise"("organizationId", "contentId")'],
  ["RearrangeSentenceExercise_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "RearrangeSentenceExercise_organizationId_contentId_idx" ON "RearrangeSentenceExercise"("organizationId", "contentId")'],
  ["QuestionFromPoems_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "QuestionFromPoems_organizationId_contentId_idx" ON "QuestionFromPoems"("organizationId", "contentId")'],
  ["QuestionFromStory_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "QuestionFromStory_organizationId_contentId_idx" ON "QuestionFromStory"("organizationId", "contentId")'],
  ["TrueFalseExercise_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "TrueFalseExercise_organizationId_contentId_idx" ON "TrueFalseExercise"("organizationId", "contentId")'],
  ["InformationTransfer_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "InformationTransfer_organizationId_contentId_idx" ON "InformationTransfer"("organizationId", "contentId")'],
  ["SubstitutionTable_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "SubstitutionTable_organizationId_contentId_idx" ON "SubstitutionTable"("organizationId", "contentId")'],
  ["RightFormOfVerb_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "RightFormOfVerb_organizationId_contentId_idx" ON "RightFormOfVerb"("organizationId", "contentId")'],
  ["Narration_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "Narration_organizationId_contentId_idx" ON "Narration"("organizationId", "contentId")'],
  ["ChangingSentence_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "ChangingSentence_organizationId_contentId_idx" ON "ChangingSentence"("organizationId", "contentId")'],
  ["PunctuationAndCapitalization_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "PunctuationAndCapitalization_organizationId_contentId_idx" ON "PunctuationAndCapitalization"("organizationId", "contentId")'],
  ["Preposition_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "Preposition_organizationId_contentId_idx" ON "Preposition"("organizationId", "contentId")'],
  ["SuffixAndPrefix_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "SuffixAndPrefix_organizationId_contentId_idx" ON "SuffixAndPrefix"("organizationId", "contentId")'],
  ["TagQuestion_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "TagQuestion_organizationId_contentId_idx" ON "TagQuestion"("organizationId", "contentId")'],
  ["Connector_organizationId_contentId_idx", 'CREATE INDEX IF NOT EXISTS "Connector_organizationId_contentId_idx" ON "Connector"("organizationId", "contentId")'],
];

async function sqliteTableExists(name) {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT "name" FROM "sqlite_master" WHERE "type" = \'table\' AND "name" = ?',
    name,
  );
  return rows.length > 0;
}

async function ensureEnglishFirstPaperSectionTables() {
  const exerciseColumns = `
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentBlockId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "topicId" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "instruction" TEXT NOT NULL DEFAULT '',
    "question" TEXT NOT NULL DEFAULT '',
    "answer" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "documentJson" TEXT NOT NULL DEFAULT '{"rows":[]}',
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  `;

  const oldRearrangeTable = await sqliteTableExists("SentenceOrderingExercise");
  const newRearrangeTable = await sqliteTableExists("RearrangeSentenceExercise");

  if (oldRearrangeTable && !newRearrangeTable) {
    await prisma.$executeRawUnsafe('ALTER TABLE "SentenceOrderingExercise" RENAME TO "RearrangeSentenceExercise"');
    console.log("Renamed SentenceOrderingExercise to RearrangeSentenceExercise.");
  } else {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "RearrangeSentenceExercise" (
      ${exerciseColumns},
      CONSTRAINT "RearrangeSentenceExercise_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`);

    if (oldRearrangeTable) {
      await prisma.$executeRawUnsafe(`
        INSERT OR IGNORE INTO "RearrangeSentenceExercise" (
          "id","contentBlockId","contentId","classId","subjectId","unitId","lessonId","topicId",
          "title","instruction","question","answer","details","documentJson","organizationId",
          "createdBy","updatedBy","createdAt","updatedAt"
        )
        SELECT
          "id","contentBlockId","contentId","classId","subjectId","unitId","lessonId","topicId",
          "title","instruction","question","answer","details","documentJson","organizationId",
          "createdBy","updatedBy","createdAt","updatedAt"
        FROM "SentenceOrderingExercise"
      `);
      await prisma.$executeRawUnsafe('DROP TABLE "SentenceOrderingExercise"');
      console.log("Merged legacy SentenceOrderingExercise rows into RearrangeSentenceExercise.");
    }
  }

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "QuestionFromPoems" (
    ${exerciseColumns},
    CONSTRAINT "QuestionFromPoems_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "QuestionFromStory" (
    ${exerciseColumns},
    CONSTRAINT "QuestionFromStory_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`);

  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "RearrangeSentenceExercise_contentBlockId_key" ON "RearrangeSentenceExercise"("contentBlockId")');
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "QuestionFromPoems_contentBlockId_key" ON "QuestionFromPoems"("contentBlockId")');
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "QuestionFromStory_contentBlockId_key" ON "QuestionFromStory"("contentBlockId")');

  await prisma.$executeRawUnsafe('UPDATE "ContentBlock" SET "kind" = \'rearrange-sentence\' WHERE "kind" = \'sentence-ordering\'');
}

async function ensureSeenPassageTables() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SeenPassageOne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentBlockId" TEXT,
    "contentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "topicId" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SeenPassageOne_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeenPassageOne_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SeenPassageTwo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentBlockId" TEXT,
    "contentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "topicId" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SeenPassageTwo_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeenPassageTwo_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`);

  await ensureColumn("SeenPassageOne", "contentBlockId", "TEXT");
  await ensureColumn("SeenPassageTwo", "contentBlockId", "TEXT");

  // The old fixed-slot design allowed only one row per content. Repeatable blocks must remove that restriction.
  await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS "SeenPassageOne_contentId_key"');
  await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS "SeenPassageTwo_contentId_key"');
}

async function migrateLegacySeenPassages() {
  const rankedSql = `
    SELECT p.*, ROW_NUMBER() OVER (
      PARTITION BY p."contentId"
      ORDER BY cb."sortOrder" ASC, cb."createdAt" ASC, p."createdAt" ASC
    ) AS rn
    FROM "Paragraph" p
    JOIN "ContentBlock" cb ON cb."id" = p."contentBlockId"
  `;

  // Preserve pre-fixed-slot Paragraph data without creating duplicates.
  await prisma.$executeRawUnsafe(`
    INSERT INTO "SeenPassageOne" (
      "id","contentId","classId","subjectId","unitId","lessonId","topicId","body",
      "organizationId","createdBy","updatedBy","createdAt","updatedAt"
    )
    SELECT 'seen1_' || p."contentId", p."contentId",p."classId",p."subjectId",p."unitId",p."lessonId",p."topicId",p."body",
           p."organizationId",p."createdBy",p."updatedBy",p."createdAt",p."updatedAt"
    FROM (${rankedSql}) p
    WHERE p.rn = 1
      AND NOT EXISTS (SELECT 1 FROM "SeenPassageOne" s WHERE s."contentId" = p."contentId")
  `);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "SeenPassageTwo" (
      "id","contentId","classId","subjectId","unitId","lessonId","topicId","body",
      "organizationId","createdBy","updatedBy","createdAt","updatedAt"
    )
    SELECT 'seen2_' || p."contentId", p."contentId",p."classId",p."subjectId",p."unitId",p."lessonId",p."topicId",p."body",
           p."organizationId",p."createdBy",p."updatedBy",p."createdAt",p."updatedAt"
    FROM (${rankedSql}) p
    WHERE p.rn = 2
      AND NOT EXISTS (SELECT 1 FROM "SeenPassageTwo" s WHERE s."contentId" = p."contentId")
  `);

  // If the previous fixed design created Passage 2 as an empty slot, keep that slot as a normal movable block.
  await prisma.$executeRawUnsafe(`
    INSERT INTO "SeenPassageTwo" (
      "id","contentId","classId","subjectId","unitId","lessonId","topicId","body",
      "organizationId","createdBy","updatedBy","createdAt","updatedAt"
    )
    SELECT 'seen2_' || s."contentId", s."contentId",s."classId",s."subjectId",s."unitId",s."lessonId",s."topicId",'',
           s."organizationId",s."createdBy",s."updatedBy",s."createdAt",s."updatedAt"
    FROM "SeenPassageOne" s
    WHERE NOT EXISTS (SELECT 1 FROM "SeenPassageTwo" t WHERE t."contentId" = s."contentId")
  `);

  const oneRows = await prisma.$queryRawUnsafe('SELECT "id", "contentId", "contentBlockId" FROM "SeenPassageOne" ORDER BY "createdAt", "id"');
  const twoRows = await prisma.$queryRawUnsafe('SELECT "id", "contentId", "contentBlockId" FROM "SeenPassageTwo" ORDER BY "createdAt", "id"');
  const rows = [
    ...oneRows.map((row) => ({ ...row, kind: "seen-passage-one", table: "SeenPassageOne" })),
    ...twoRows.map((row) => ({ ...row, kind: "seen-passage-two", table: "SeenPassageTwo" })),
  ];

  const byContent = new Map();
  for (const row of rows) {
    if (row.contentBlockId) continue;
    const list = byContent.get(row.contentId) || [];
    list.push(row);
    byContent.set(row.contentId, list);
  }

  for (const [contentId, pendingRows] of byContent) {
    const existingBlocks = await prisma.contentBlock.findMany({
      where: { contentId, kind: { in: ["seen-passage-one", "seen-passage-two"] } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, kind: true },
    });
    const unusedByKind = {
      "seen-passage-one": existingBlocks.filter((block) => block.kind === "seen-passage-one").map((block) => block.id),
      "seen-passage-two": existingBlocks.filter((block) => block.kind === "seen-passage-two").map((block) => block.id),
    };

    const rowsNeedingNewBlocks = pendingRows.filter((row) => unusedByKind[row.kind].length === 0);
    if (rowsNeedingNewBlocks.length > 0) {
      await prisma.contentBlock.updateMany({
        where: { contentId },
        data: { sortOrder: { increment: rowsNeedingNewBlocks.length } },
      });
    }

    let nextFrontOrder = 0;
    for (const row of pendingRows) {
      let blockId = unusedByKind[row.kind].shift();
      if (!blockId) {
        const created = await prisma.contentBlock.create({
          data: { contentId, kind: row.kind, sortOrder: nextFrontOrder++ },
          select: { id: true },
        });
        blockId = created.id;
      }
      await prisma.$executeRawUnsafe(`UPDATE "${row.table}" SET "contentBlockId" = ? WHERE "id" = ?`, blockId, row.id);
    }
  }

  // Convert legacy synthetic references to the first real repeatable block of each label.
  const contentIds = [...new Set(rows.map((row) => row.contentId))];
  const linkedTables = ["Vocabulary", "SynonymsAntonyms", "GapFillExercise", "GapFillFirstPaper", "McqSection", "InformationTransfer"];
  for (const contentId of contentIds) {
    const firstPassage = await prisma.contentBlock.findFirst({
      where: { contentId, kind: "seen-passage-one" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    const firstPassageTwo = await prisma.contentBlock.findFirst({
      where: { contentId, kind: "seen-passage-two" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    for (const table of linkedTables) {
      if (firstPassage) {
        await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "paragraphBlockId" = ? WHERE "contentId" = ? AND "paragraphBlockId" = '__seen_passage_one__'`, firstPassage.id, contentId);
      }
      if (firstPassageTwo) {
        await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "paragraphBlockId" = ? WHERE "contentId" = ? AND "paragraphBlockId" = '__seen_passage_two__'`, firstPassageTwo.id, contentId);
      }
    }
  }
}


async function ensureSubjectLevelFirstPaperSectionTables() {
  const tables = [
    ["SubjectMatchingSentencesBlock", "ColumnMatchingExercise"],
    ["SubjectRearrangeSentenceBlock", "RearrangeSentenceExercise"],
    ["SubjectQuestionFromPoemsBlock", "QuestionFromPoems"],
    ["SubjectQuestionFromStoryBlock", "QuestionFromStory"],
  ];

  for (const [table] of tables) {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "${table}" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "classId" TEXT NOT NULL,
      "subjectId" TEXT NOT NULL,
      "title" TEXT NOT NULL DEFAULT '',
      "instruction" TEXT NOT NULL DEFAULT '',
      "details" TEXT NOT NULL DEFAULT '',
      "documentJson" TEXT NOT NULL DEFAULT '{"version":1,"rows":[]}',
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "organizationId" TEXT NOT NULL,
      "createdBy" TEXT NOT NULL,
      "updatedBy" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "${table}_organizationId_classId_subjectId_sortOrder_idx" ON "${table}"("organizationId", "classId", "subjectId", "sortOrder")`,
    );
  }

  // Preserve any records created through the previous Unit/Lesson/Topic based
  // workflow by copying them once into the new subject-level tables. The old
  // content records remain untouched for backward compatibility.
  for (const [target, source] of tables) {
    if (!(await sqliteTableExists(source))) continue;
    await prisma.$executeRawUnsafe(`
      INSERT OR IGNORE INTO "${target}" (
        "id", "classId", "subjectId", "title", "instruction", "details",
        "documentJson", "sortOrder", "organizationId", "createdBy", "updatedBy",
        "createdAt", "updatedAt"
      )
      SELECT
        s."id", s."classId", s."subjectId", COALESCE(s."title", ''),
        COALESCE(s."instruction", ''), COALESCE(s."details", ''),
        COALESCE(s."documentJson", '{"version":1,"rows":[]}'),
        CAST(ROW_NUMBER() OVER (
          PARTITION BY s."organizationId", s."classId", s."subjectId"
          ORDER BY s."createdAt" ASC, s."id" ASC
        ) - 1 AS INTEGER),
        s."organizationId", s."createdBy", s."updatedBy", s."createdAt", s."updatedAt"
      FROM "${source}" s
    `);
  }
}

async function ensureColumn(table, name, definition) {
  const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
  if (columns.some((column) => column.name === name)) return false;
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${definition}`);
  console.log(`Added ${table}.${name}`);
  return true;
}

async function migrateProfileTempImages() {
  const users = await prisma.user.findMany({
    where: { profileImage: { startsWith: "/uploads/temp/" } },
    select: { id: true, profileImage: true },
  });
  const publicRoot = path.join(process.cwd(), "public");
  const tempRoot = path.join(publicRoot, "uploads", "temp");
  const profileRoot = path.join(publicRoot, "uploads", "profiles");
  await fsp.mkdir(profileRoot, { recursive: true });

  let migrated = 0;
  for (const user of users) {
    if (!user.profileImage) continue;
    const source = path.resolve(publicRoot, user.profileImage.replace(/^\/+/, ""));
    const relative = path.relative(tempRoot, source);
    if (relative.startsWith("..") || path.isAbsolute(relative)) continue;

    try {
      const extension = path.extname(source).toLowerCase() || ".img";
      const target = path.join(profileRoot, `${crypto.randomUUID()}${extension}`);
      await fsp.rename(source, target);
      const publicPath = `/${path.relative(publicRoot, target).replace(/\\/g, "/")}`;
      await prisma.user.update({ where: { id: user.id }, data: { profileImage: publicPath } });
      migrated += 1;
    } catch (error) {
      if (error?.code === "ENOENT") {
        await prisma.user.update({ where: { id: user.id }, data: { profileImage: null } });
      } else {
        throw error;
      }
    }
  }
  return migrated;
}

async function main() {
  await ensureEnglishFirstPaperSectionTables();
  await ensureSubjectLevelFirstPaperSectionTables();
  await ensureSeenPassageTables();
  await ensureColumn("Vocabulary", "passage", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn("Vocabulary", "passageSource", "TEXT NOT NULL DEFAULT 'manual'");
  await ensureColumn("Vocabulary", "paragraphBlockId", "TEXT");
  await ensureColumn("InformationTransfer", "passage", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn("InformationTransfer", "passageSource", "TEXT NOT NULL DEFAULT 'manual'");
  await ensureColumn("InformationTransfer", "paragraphBlockId", "TEXT");
  await migrateLegacySeenPassages();

  for (const [name, sql] of indexes) {
    await prisma.$executeRawUnsafe(sql);
    console.log(`Ensured index ${name}`);
  }

  const now = new Date();
  const expiredSessions = await prisma.authSession.deleteMany({ where: { expiresAt: { lte: now } } });
  const expiredResetTokens = await prisma.passwordResetToken.deleteMany({
    where: { OR: [{ expiresAt: { lte: now } }, { usedAt: { not: null } }] },
  });
  const migratedProfiles = await migrateProfileTempImages();
  console.log(`Removed ${expiredSessions.count} expired sessions and ${expiredResetTokens.count} expired/used reset tokens.`);
  console.log(`Migrated ${migratedProfiles} profile image(s) out of temporary storage.`);

  const integrity = await prisma.$queryRawUnsafe("PRAGMA integrity_check");
  const ok = integrity.some((row) => String(row.integrity_check).toLowerCase() === "ok");
  if (!ok) throw new Error("SQLite integrity_check failed.");

  console.log("SQLite schema repair complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
