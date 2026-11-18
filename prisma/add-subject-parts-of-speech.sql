BEGIN;

CREATE TABLE IF NOT EXISTS "SubjectPartsOfSpeechBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'parts-of-speech',
    "boardId" TEXT,
    "academicYearId" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "instruction" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "documentJson" TEXT NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "SubjectPartsOfSpeechBlock_organizationId_classId_subjectId_kind_sortOrder_idx"
ON "SubjectPartsOfSpeechBlock"("organizationId", "classId", "subjectId", "kind", "sortOrder");

CREATE INDEX IF NOT EXISTS "SubjectPartsOfSpeechBlock_organizationId_boardId_academicYearId_idx"
ON "SubjectPartsOfSpeechBlock"("organizationId", "boardId", "academicYearId");

COMMIT;
