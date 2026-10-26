-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "lastUsedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'published',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "iconType" TEXT NOT NULL DEFAULT 'none',
    "iconLibrary" TEXT NOT NULL DEFAULT '',
    "iconName" TEXT NOT NULL DEFAULT '',
    "iconColor" TEXT NOT NULL DEFAULT '',
    "imagePath" TEXT NOT NULL DEFAULT '',
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'published',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "iconType" TEXT NOT NULL DEFAULT 'none',
    "iconLibrary" TEXT NOT NULL DEFAULT '',
    "iconName" TEXT NOT NULL DEFAULT '',
    "iconColor" TEXT NOT NULL DEFAULT '',
    "imagePath" TEXT NOT NULL DEFAULT '',
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'published',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "iconType" TEXT NOT NULL DEFAULT 'none',
    "iconLibrary" TEXT NOT NULL DEFAULT '',
    "iconName" TEXT NOT NULL DEFAULT '',
    "iconColor" TEXT NOT NULL DEFAULT '',
    "imagePath" TEXT NOT NULL DEFAULT '',
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Unit_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Unit_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "lessonNumber" TEXT NOT NULL DEFAULT '',
    "shortDescription" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'published',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "iconType" TEXT NOT NULL DEFAULT 'none',
    "iconLibrary" TEXT NOT NULL DEFAULT '',
    "iconName" TEXT NOT NULL DEFAULT '',
    "iconColor" TEXT NOT NULL DEFAULT '',
    "imagePath" TEXT NOT NULL DEFAULT '',
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lesson_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "topicNumber" TEXT NOT NULL DEFAULT '',
    "shortDescription" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'published',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "iconType" TEXT NOT NULL DEFAULT 'none',
    "iconLibrary" TEXT NOT NULL DEFAULT '',
    "iconName" TEXT NOT NULL DEFAULT '',
    "iconColor" TEXT NOT NULL DEFAULT '',
    "imagePath" TEXT NOT NULL DEFAULT '',
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Topic_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT '',
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "topicId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Content_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Content_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Content_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Content_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Content_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "boardId" TEXT,
    "academicYearId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContentBlock_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ContentBlock_boardId_academicYearId_idx"
ON "ContentBlock"("boardId", "academicYearId");

-- CreateTable
CREATE TABLE "Paragraph" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentBlockId" TEXT NOT NULL,
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
    CONSTRAINT "Paragraph_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vocabulary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentBlockId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "topicId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vocabulary_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VocabularyEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vocabularyId" TEXT NOT NULL,
    "word" TEXT NOT NULL DEFAULT '',
    "meaning" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "imagePath" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VocabularyEntry_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Storage provider configurations are organization-scoped. Secret values are encrypted by the application.
CREATE TABLE "StorageConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'local-private',
    "endpoint" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL DEFAULT 'auto',
    "bucket" TEXT NOT NULL DEFAULT '',
    "accessKeyId" TEXT NOT NULL DEFAULT '',
    "secretAccessKeyEncrypted" TEXT NOT NULL DEFAULT '',
    "sessionTokenEncrypted" TEXT NOT NULL DEFAULT '',
    "localRoot" TEXT NOT NULL DEFAULT 'storage/private',
    "forcePathStyle" BOOLEAN NOT NULL DEFAULT false,
    "publicBaseUrl" TEXT NOT NULL DEFAULT '',
    "privateBucket" TEXT NOT NULL DEFAULT '',
    "maxImageSizeMb" INTEGER NOT NULL DEFAULT 20,
    "maxVideoSizeMb" INTEGER NOT NULL DEFAULT 1024,
    "maxModelSizeMb" INTEGER NOT NULL DEFAULT 500,
    "pathPrefix" TEXT NOT NULL DEFAULT 'uploads',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "everActivated" BOOLEAN NOT NULL DEFAULT false,
    "lastTestStatus" TEXT NOT NULL DEFAULT 'unknown',
    "lastTestMessage" TEXT NOT NULL DEFAULT '',
    "lastTestedAt" DATETIME,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "StorageConfiguration_organizationId_name_key"
ON "StorageConfiguration"("organizationId", "name");
CREATE INDEX "StorageConfiguration_organizationId_isActive_idx"
ON "StorageConfiguration"("organizationId", "isActive");
CREATE INDEX "StorageConfiguration_organizationId_provider_idx"
ON "StorageConfiguration"("organizationId", "provider");
CREATE UNIQUE INDEX "StorageConfiguration_one_active_per_org_key"
ON "StorageConfiguration"("organizationId") WHERE "isActive" = true;

-- Generic upload/file lifecycle tracker. Vocabulary item images are the first
-- relation using it; future uploads should attach to this same table.
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purpose" TEXT NOT NULL DEFAULT '',
    "ownerType" TEXT NOT NULL DEFAULT '',
    "ownerId" TEXT NOT NULL DEFAULT '',
    "vocabularyEntryId" TEXT,
    "storageConfigurationId" TEXT,
    "url" TEXT NOT NULL DEFAULT '',
    "path" TEXT NOT NULL DEFAULT '',
    "originalName" TEXT NOT NULL DEFAULT '',
    "sourceMimeType" TEXT NOT NULL DEFAULT '',
    "mimeType" TEXT NOT NULL DEFAULT '',
    "extension" TEXT NOT NULL DEFAULT '',
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "checksumSha256" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "replacedAt" DATETIME,
    "deletedAt" DATETIME,
    "storageDeletedAt" DATETIME,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UploadedFile_vocabularyEntryId_fkey" FOREIGN KEY ("vocabularyEntryId") REFERENCES "VocabularyEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UploadedFile_storageConfigurationId_fkey" FOREIGN KEY ("storageConfigurationId") REFERENCES "StorageConfiguration" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "UploadedFile_vocabularyEntryId_isCurrent_status_idx"
ON "UploadedFile"("vocabularyEntryId", "isCurrent", "status");
CREATE INDEX "UploadedFile_organizationId_status_createdAt_idx"
ON "UploadedFile"("organizationId", "status", "createdAt");
CREATE INDEX "UploadedFile_organizationId_ownerType_ownerId_idx"
ON "UploadedFile"("organizationId", "ownerType", "ownerId");
CREATE INDEX "UploadedFile_path_idx"
ON "UploadedFile"("path");
CREATE INDEX "UploadedFile_storageConfigurationId_idx"
ON "UploadedFile"("storageConfigurationId");
CREATE UNIQUE INDEX "UploadedFile_vocabulary_current_active_key"
ON "UploadedFile"("vocabularyEntryId")
WHERE "vocabularyEntryId" IS NOT NULL
  AND "purpose" = 'vocabulary-item-image'
  AND "isCurrent" = true
  AND "status" = 'active';

-- CreateTable
CREATE TABLE "SynonymsAntonyms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentBlockId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "topicId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SynonymsAntonyms_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SynonymsAntonymsEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "synonymsAntonymsId" TEXT NOT NULL,
    "word" TEXT NOT NULL DEFAULT '',
    "meanings" TEXT NOT NULL DEFAULT '',
    "synonyms" TEXT NOT NULL DEFAULT '',
    "antonyms" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SynonymsAntonymsEntry_synonymsAntonymsId_fkey" FOREIGN KEY ("synonymsAntonymsId") REFERENCES "SynonymsAntonyms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GapFillExercise" (
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
    CONSTRAINT "GapFillExercise_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "McqSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentBlockId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "topicId" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "documentJson" TEXT NOT NULL DEFAULT '{"questions":[]}',
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "McqSection_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "QuestionFromPoems" (
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
    CONSTRAINT "QuestionFromPoems_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionFromStory" (
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
    CONSTRAINT "QuestionFromStory_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrueFalseExercise" (
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
    "passage" TEXT NOT NULL DEFAULT '',
    "documentJson" TEXT NOT NULL DEFAULT '{"rows":[]}',
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrueFalseExercise_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InformationTransfer" (
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
    "documentJson" TEXT NOT NULL DEFAULT '{"rows":[]}',
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InformationTransfer_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubstitutionTable" (
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
    CONSTRAINT "SubstitutionTable_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RightFormOfVerb" (
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
    CONSTRAINT "RightFormOfVerb_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Narration" (
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
    CONSTRAINT "Narration_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChangingSentence" (
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
    CONSTRAINT "ChangingSentence_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PunctuationAndCapitalization" (
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
    CONSTRAINT "PunctuationAndCapitalization_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Preposition" (
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
    CONSTRAINT "Preposition_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SuffixAndPrefix" (
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
    CONSTRAINT "SuffixAndPrefix_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TagQuestion" (
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
    CONSTRAINT "TagQuestion_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Connector" (
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
    CONSTRAINT "Connector_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Class_slug_key" ON "Class"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_slug_key" ON "Subject"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_slug_key" ON "Unit"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_slug_key" ON "Lesson"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE INDEX "Content_classId_subjectId_unitId_lessonId_topicId_organizationId_idx" ON "Content"("classId", "subjectId", "unitId", "lessonId", "topicId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Paragraph_contentBlockId_key" ON "Paragraph"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "Vocabulary_contentBlockId_key" ON "Vocabulary"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "SynonymsAntonyms_contentBlockId_key" ON "SynonymsAntonyms"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "GapFillExercise_contentBlockId_key" ON "GapFillExercise"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "McqSection_contentBlockId_key" ON "McqSection"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionAnswerExercise_contentBlockId_key" ON "QuestionAnswerExercise"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "TableCompletionExercise_contentBlockId_key" ON "TableCompletionExercise"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "ColumnMatchingExercise_contentBlockId_key" ON "ColumnMatchingExercise"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "RearrangeSentenceExercise_contentBlockId_key" ON "RearrangeSentenceExercise"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionFromPoems_contentBlockId_key" ON "QuestionFromPoems"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionFromStory_contentBlockId_key" ON "QuestionFromStory"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "TrueFalseExercise_contentBlockId_key" ON "TrueFalseExercise"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "InformationTransfer_contentBlockId_key" ON "InformationTransfer"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "SubstitutionTable_contentBlockId_key" ON "SubstitutionTable"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "RightFormOfVerb_contentBlockId_key" ON "RightFormOfVerb"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "Narration_contentBlockId_key" ON "Narration"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "ChangingSentence_contentBlockId_key" ON "ChangingSentence"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "PunctuationAndCapitalization_contentBlockId_key" ON "PunctuationAndCapitalization"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "Preposition_contentBlockId_key" ON "Preposition"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "SuffixAndPrefix_contentBlockId_key" ON "SuffixAndPrefix"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "TagQuestion_contentBlockId_key" ON "TagQuestion"("contentBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "Connector_contentBlockId_key" ON "Connector"("contentBlockId");


-- Subject-level English First Paper section blocks. These records intentionally
-- do not require Unit / Lesson / Topic assignments.
CREATE TABLE IF NOT EXISTS "SubjectMatchingSentencesBlock" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "boardId" TEXT,
  "academicYearId" TEXT,
  "title" TEXT NOT NULL DEFAULT '',
  "instruction" TEXT NOT NULL DEFAULT '',
  "details" TEXT NOT NULL DEFAULT '',
  "documentJson" TEXT NOT NULL DEFAULT '{"version":2,"columns":[],"rows":[],"answers":[]}',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "organizationId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "SubjectMatchingSentencesBlock_organizationId_classId_subjectId_sortOrder_idx"
ON "SubjectMatchingSentencesBlock"("organizationId", "classId", "subjectId", "sortOrder");
CREATE INDEX IF NOT EXISTS "SubjectMatchingSentencesBlock_organizationId_boardId_academicYearId_idx"
ON "SubjectMatchingSentencesBlock"("organizationId", "boardId", "academicYearId");

CREATE TABLE IF NOT EXISTS "SubjectRearrangeSentenceBlock" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "boardId" TEXT,
  "academicYearId" TEXT,
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
);
CREATE INDEX IF NOT EXISTS "SubjectRearrangeSentenceBlock_organizationId_classId_subjectId_sortOrder_idx"
ON "SubjectRearrangeSentenceBlock"("organizationId", "classId", "subjectId", "sortOrder");
CREATE INDEX IF NOT EXISTS "SubjectRearrangeSentenceBlock_organizationId_boardId_academicYearId_idx"
ON "SubjectRearrangeSentenceBlock"("organizationId", "boardId", "academicYearId");

CREATE TABLE IF NOT EXISTS "SubjectQuestionFromPoemsBlock" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "boardId" TEXT,
  "academicYearId" TEXT,
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
);
CREATE INDEX IF NOT EXISTS "SubjectQuestionFromPoemsBlock_organizationId_classId_subjectId_sortOrder_idx"
ON "SubjectQuestionFromPoemsBlock"("organizationId", "classId", "subjectId", "sortOrder");
CREATE INDEX IF NOT EXISTS "SubjectQuestionFromPoemsBlock_organizationId_boardId_academicYearId_idx"
ON "SubjectQuestionFromPoemsBlock"("organizationId", "boardId", "academicYearId");

CREATE TABLE IF NOT EXISTS "SubjectQuestionFromStoryBlock" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "boardId" TEXT,
  "academicYearId" TEXT,
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
);
CREATE INDEX IF NOT EXISTS "SubjectQuestionFromStoryBlock_organizationId_classId_subjectId_sortOrder_idx"
ON "SubjectQuestionFromStoryBlock"("organizationId", "classId", "subjectId", "sortOrder");
CREATE INDEX IF NOT EXISTS "SubjectQuestionFromStoryBlock_organizationId_boardId_academicYearId_idx"
ON "SubjectQuestionFromStoryBlock"("organizationId", "boardId", "academicYearId");

-- Admin-only Board / Year master data.
CREATE TABLE IF NOT EXISTS "Board" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "organizationId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "Board_organizationId_name_key"
ON "Board"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "Board_organizationId_isActive_name_idx"
ON "Board"("organizationId", "isActive", "name");

CREATE TABLE IF NOT EXISTS "AcademicYear" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "year" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "organizationId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicYear_organizationId_year_key"
ON "AcademicYear"("organizationId", "year");
CREATE INDEX IF NOT EXISTS "AcademicYear_organizationId_isActive_year_idx"
ON "AcademicYear"("organizationId", "isActive", "year");

-- Subject-level English 2nd Paper question-type blocks. These records do not
-- require Unit / Lesson / Topic assignments.
CREATE TABLE IF NOT EXISTS "SubjectEnglishSecondPaperBlock" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS "SubjectEnglishSecondPaperBlock_organizationId_classId_subjectId_kind_sortOrder_idx"
ON "SubjectEnglishSecondPaperBlock"("organizationId", "classId", "subjectId", "kind", "sortOrder");
CREATE INDEX IF NOT EXISTS "SubjectEnglishSecondPaperBlock_organizationId_boardId_academicYearId_idx"
ON "SubjectEnglishSecondPaperBlock"("organizationId", "boardId", "academicYearId");
