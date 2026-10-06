PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS "SeenPassageOne" (
  "id" TEXT NOT NULL PRIMARY KEY,
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
  CONSTRAINT "SeenPassageOne_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SeenPassageOne_contentId_key" ON "SeenPassageOne"("contentId");
CREATE INDEX IF NOT EXISTS "SeenPassageOne_organizationId_contentId_idx" ON "SeenPassageOne"("organizationId", "contentId");

CREATE TABLE IF NOT EXISTS "SeenPassageTwo" (
  "id" TEXT NOT NULL PRIMARY KEY,
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
  CONSTRAINT "SeenPassageTwo_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SeenPassageTwo_contentId_key" ON "SeenPassageTwo"("contentId");
CREATE INDEX IF NOT EXISTS "SeenPassageTwo_organizationId_contentId_idx" ON "SeenPassageTwo"("organizationId", "contentId");

ALTER TABLE "InformationTransfer" ADD COLUMN "passage" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InformationTransfer" ADD COLUMN "passageSource" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "InformationTransfer" ADD COLUMN "paragraphBlockId" TEXT;

WITH ranked AS (
  SELECT p.*, ROW_NUMBER() OVER (
    PARTITION BY p."contentId"
    ORDER BY cb."sortOrder" ASC, cb."createdAt" ASC, p."createdAt" ASC
  ) AS rn
  FROM "Paragraph" p
  JOIN "ContentBlock" cb ON cb."id" = p."contentBlockId"
)
INSERT OR IGNORE INTO "SeenPassageOne" (
  "id","contentId","classId","subjectId","unitId","lessonId","topicId","body",
  "organizationId","createdBy","updatedBy","createdAt","updatedAt"
)
SELECT 'seen1_' || "contentId", "contentId","classId","subjectId","unitId","lessonId","topicId","body",
       "organizationId","createdBy","updatedBy","createdAt","updatedAt"
FROM ranked WHERE rn = 1;

WITH ranked AS (
  SELECT p.*, ROW_NUMBER() OVER (
    PARTITION BY p."contentId"
    ORDER BY cb."sortOrder" ASC, cb."createdAt" ASC, p."createdAt" ASC
  ) AS rn
  FROM "Paragraph" p
  JOIN "ContentBlock" cb ON cb."id" = p."contentBlockId"
)
INSERT OR IGNORE INTO "SeenPassageTwo" (
  "id","contentId","classId","subjectId","unitId","lessonId","topicId","body",
  "organizationId","createdBy","updatedBy","createdAt","updatedAt"
)
SELECT 'seen2_' || "contentId", "contentId","classId","subjectId","unitId","lessonId","topicId","body",
       "organizationId","createdBy","updatedBy","createdAt","updatedAt"
FROM ranked WHERE rn = 2;

INSERT OR IGNORE INTO "SeenPassageTwo" (
  "id","contentId","classId","subjectId","unitId","lessonId","topicId","body",
  "organizationId","createdBy","updatedBy","createdAt","updatedAt"
)
SELECT 'seen2_' || "contentId", "contentId","classId","subjectId","unitId","lessonId","topicId",'',
       "organizationId","createdBy","updatedBy","createdAt","updatedAt"
FROM "SeenPassageOne";

PRAGMA foreign_keys=ON;
