CREATE TABLE IF NOT EXISTS "UnseenComposition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "documentJson" TEXT NOT NULL DEFAULT '{"version":1,"blocks":[]}',
  "organizationId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "UnseenComposition_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UnseenComposition_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UnseenComposition_organizationId_classId_subjectId_idx"
ON "UnseenComposition"("organizationId", "classId", "subjectId");
