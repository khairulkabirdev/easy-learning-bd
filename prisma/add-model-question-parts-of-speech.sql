BEGIN;
CREATE TABLE IF NOT EXISTS "PartsOfSpeech" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contentBlockId" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "topicId" TEXT,
  "question" TEXT NOT NULL DEFAULT '',
  "answer" TEXT NOT NULL DEFAULT '',
  "details" TEXT NOT NULL DEFAULT '',
  "organizationId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PartsOfSpeech_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PartsOfSpeech_contentBlockId_key" ON "PartsOfSpeech"("contentBlockId");
CREATE INDEX IF NOT EXISTS "PartsOfSpeech_organizationId_contentId_idx" ON "PartsOfSpeech"("organizationId", "contentId");
COMMIT;
