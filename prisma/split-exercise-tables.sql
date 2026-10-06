PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- Keep the existing mixed table temporarily so all current data can be copied.
ALTER TABLE "QuestionAnswerExercise" RENAME TO "_QuestionAnswerExercise_legacy";
DROP INDEX IF EXISTS "QuestionAnswerExercise_contentBlockId_key";

CREATE TABLE "QuestionAnswerExercise" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuestionAnswerExercise_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TableCompletionExercise" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TableCompletionExercise_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ColumnMatchingExercise" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ColumnMatchingExercise_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RearrangeSentenceExercise" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RearrangeSentenceExercise_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "QuestionAnswerExercise" (
  "id","contentBlockId","contentId","classId","subjectId","unitId","lessonId","topicId",
  "title","instruction","question","answer","details","documentJson","organizationId",
  "createdBy","updatedBy","createdAt","updatedAt"
)
SELECT
  "id","contentBlockId","contentId","classId","subjectId","unitId","lessonId","topicId",
  "title","instruction","question","answer","details","documentJson","organizationId",
  "createdBy","updatedBy","createdAt","updatedAt"
FROM "_QuestionAnswerExercise_legacy"
WHERE "layoutKind" = 'question-answer';

INSERT INTO "TableCompletionExercise" (
  "id","contentBlockId","contentId","classId","subjectId","unitId","lessonId","topicId",
  "title","instruction","question","answer","details","documentJson","organizationId",
  "createdBy","updatedBy","createdAt","updatedAt"
)
SELECT
  "id","contentBlockId","contentId","classId","subjectId","unitId","lessonId","topicId",
  "title","instruction","question","answer","details","documentJson","organizationId",
  "createdBy","updatedBy","createdAt","updatedAt"
FROM "_QuestionAnswerExercise_legacy"
WHERE "layoutKind" = 'table-completion';

INSERT INTO "ColumnMatchingExercise" (
  "id","contentBlockId","contentId","classId","subjectId","unitId","lessonId","topicId",
  "title","instruction","question","answer","details","documentJson","organizationId",
  "createdBy","updatedBy","createdAt","updatedAt"
)
SELECT
  "id","contentBlockId","contentId","classId","subjectId","unitId","lessonId","topicId",
  "title","instruction","question","answer","details","documentJson","organizationId",
  "createdBy","updatedBy","createdAt","updatedAt"
FROM "_QuestionAnswerExercise_legacy"
WHERE "layoutKind" = 'column-matching';

INSERT INTO "RearrangeSentenceExercise" (
  "id","contentBlockId","contentId","classId","subjectId","unitId","lessonId","topicId",
  "title","instruction","question","answer","details","documentJson","organizationId",
  "createdBy","updatedBy","createdAt","updatedAt"
)
SELECT
  "id","contentBlockId","contentId","classId","subjectId","unitId","lessonId","topicId",
  "title","instruction","question","answer","details","documentJson","organizationId",
  "createdBy","updatedBy","createdAt","updatedAt"
FROM "_QuestionAnswerExercise_legacy"
WHERE "layoutKind" = 'sentence-ordering';

CREATE UNIQUE INDEX "QuestionAnswerExercise_contentBlockId_key" ON "QuestionAnswerExercise"("contentBlockId");
CREATE UNIQUE INDEX "TableCompletionExercise_contentBlockId_key" ON "TableCompletionExercise"("contentBlockId");
CREATE UNIQUE INDEX "ColumnMatchingExercise_contentBlockId_key" ON "ColumnMatchingExercise"("contentBlockId");
CREATE UNIQUE INDEX "RearrangeSentenceExercise_contentBlockId_key" ON "RearrangeSentenceExercise"("contentBlockId");

UPDATE "ContentBlock" SET "kind" = 'rearrange-sentence' WHERE "kind" = 'sentence-ordering';

DROP TABLE "_QuestionAnswerExercise_legacy";

COMMIT;
PRAGMA foreign_keys=ON;
