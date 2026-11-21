-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "profileImage" TEXT,
    "phone" TEXT,
    "district" TEXT,
    "institutionName" TEXT,
    "instituteType" TEXT,
    "academicYear" TEXT,
    "rollNumber" TEXT,
    "section" TEXT,
    "groupName" TEXT,
    "designation" TEXT,
    "subject" TEXT,
    "experience" TEXT,
    "classId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuthEmailSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderName" TEXT NOT NULL DEFAULT '',
    "senderEmail" TEXT NOT NULL DEFAULT '',
    "appBaseUrl" TEXT NOT NULL DEFAULT '',
    "resetEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
CREATE TABLE "SeenPassageOne" (
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
    CONSTRAINT "SeenPassageOne_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeenPassageTwo" (
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
    CONSTRAINT "SeenPassageTwo_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnseenComposition" (
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
    CONSTRAINT "UnseenComposition_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnseenComposition_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "passage" TEXT NOT NULL DEFAULT '',
    "passageSource" TEXT NOT NULL DEFAULT 'manual',
    "paragraphBlockId" TEXT,
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

-- CreateTable
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

-- CreateTable
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
    "passage" TEXT NOT NULL DEFAULT '',
    "passageSource" TEXT NOT NULL DEFAULT 'manual',
    "paragraphBlockId" TEXT,
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
    "answerType" TEXT NOT NULL DEFAULT 'both',
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
    "passage" TEXT NOT NULL DEFAULT '',
    "passageSource" TEXT NOT NULL DEFAULT 'manual',
    "paragraphBlockId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GapFillExercise_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GapFillFirstPaper" (
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
    "passage" TEXT NOT NULL DEFAULT '',
    "passageSource" TEXT NOT NULL DEFAULT 'manual',
    "paragraphBlockId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GapFillFirstPaper_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GapFillSecondPaper" (
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
    CONSTRAINT "GapFillSecondPaper_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "ContentBlock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "passage" TEXT NOT NULL DEFAULT '',
    "passageSource" TEXT NOT NULL DEFAULT 'manual',
    "paragraphBlockId" TEXT,
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
    "passage" TEXT NOT NULL DEFAULT '',
    "passageSource" TEXT NOT NULL DEFAULT 'manual',
    "paragraphBlockId" TEXT,
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
CREATE TABLE "PartsOfSpeech" (
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

-- CreateTable
CREATE TABLE "SubjectMatchingSentencesBlock" (
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

-- CreateTable
CREATE TABLE "SubjectRearrangeSentenceBlock" (
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

-- CreateTable
CREATE TABLE "SubjectQuestionFromPoemsBlock" (
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

-- CreateTable
CREATE TABLE "SubjectQuestionFromStoryBlock" (
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

-- CreateTable
CREATE TABLE "SubjectEnglishSecondPaperBlock" (
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

-- CreateTable
CREATE TABLE "SubjectPartsOfSpeechBlock" (
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

-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ModelQuestionImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "boardId" TEXT,
    "academicYearId" TEXT,
    "fileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'file_uploaded',
    "questionsJson" TEXT NOT NULL DEFAULT '[]',
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModelQuestionImport_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ModelQuestionImport_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ModelQuestionImport_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ModelQuestionImport_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ModelQuestionImport_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "UploadedFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModelQuestionSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "boardId" TEXT,
    "academicYearId" TEXT,
    "name" TEXT NOT NULL,
    "editorContentId" TEXT,
    "publishedAt" DATETIME,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModelQuestionSet_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ModelQuestionSet_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ModelQuestionSet_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ModelQuestionSet_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModelQuestionSetBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "setId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL DEFAULT '',
    "passage" TEXT NOT NULL DEFAULT '',
    "question" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL DEFAULT '[]',
    "answer" TEXT NOT NULL DEFAULT '',
    "marks" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModelQuestionSetBlock_setId_fkey" FOREIGN KEY ("setId") REFERENCES "ModelQuestionSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_role_idx" ON "User"("organizationId", "role");

-- CreateIndex
CREATE INDEX "User_classId_idx" ON "User"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_usedAt_idx" ON "PasswordResetToken"("userId", "expiresAt", "usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthEmailSetting_organizationId_key" ON "AuthEmailSetting"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_entityName_entityId_idx" ON "AuditLog"("organizationId", "entityName", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Class_slug_key" ON "Class"("slug");

-- CreateIndex
CREATE INDEX "Class_organizationId_status_sortOrder_idx" ON "Class"("organizationId", "status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_slug_key" ON "Subject"("slug");

-- CreateIndex
CREATE INDEX "Subject_organizationId_classId_status_sortOrder_idx" ON "Subject"("organizationId", "classId", "status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_slug_key" ON "Unit"("slug");

-- CreateIndex
CREATE INDEX "Unit_organizationId_classId_subjectId_status_sortOrder_idx" ON "Unit"("organizationId", "classId", "subjectId", "status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_slug_key" ON "Lesson"("slug");

-- CreateIndex
CREATE INDEX "Lesson_organizationId_unitId_status_sortOrder_idx" ON "Lesson"("organizationId", "unitId", "status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE INDEX "Topic_organizationId_lessonId_status_sortOrder_idx" ON "Topic"("organizationId", "lessonId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "Content_classId_subjectId_unitId_lessonId_topicId_organizationId_idx" ON "Content"("classId", "subjectId", "unitId", "lessonId", "topicId", "organizationId");

-- CreateIndex
CREATE INDEX "Content_organizationId_classId_subjectId_unitId_lessonId_idx" ON "Content"("organizationId", "classId", "subjectId", "unitId", "lessonId");

-- CreateIndex
CREATE INDEX "Content_topicId_idx" ON "Content"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "SeenPassageOne_contentBlockId_key" ON "SeenPassageOne"("contentBlockId");

-- CreateIndex
CREATE INDEX "SeenPassageOne_organizationId_contentId_idx" ON "SeenPassageOne"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "SeenPassageTwo_contentBlockId_key" ON "SeenPassageTwo"("contentBlockId");

-- CreateIndex
CREATE INDEX "SeenPassageTwo_organizationId_contentId_idx" ON "SeenPassageTwo"("organizationId", "contentId");

-- CreateIndex
CREATE INDEX "UnseenComposition_organizationId_classId_subjectId_idx" ON "UnseenComposition"("organizationId", "classId", "subjectId");

-- CreateIndex
CREATE INDEX "ContentBlock_contentId_sortOrder_idx" ON "ContentBlock"("contentId", "sortOrder");

-- CreateIndex
CREATE INDEX "ContentBlock_boardId_academicYearId_idx" ON "ContentBlock"("boardId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "Paragraph_contentBlockId_key" ON "Paragraph"("contentBlockId");

-- CreateIndex
CREATE INDEX "Paragraph_organizationId_contentId_idx" ON "Paragraph"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "Vocabulary_contentBlockId_key" ON "Vocabulary"("contentBlockId");

-- CreateIndex
CREATE INDEX "Vocabulary_organizationId_contentId_idx" ON "Vocabulary"("organizationId", "contentId");

-- CreateIndex
CREATE INDEX "VocabularyEntry_vocabularyId_sortOrder_idx" ON "VocabularyEntry"("vocabularyId", "sortOrder");

-- CreateIndex
CREATE INDEX "VocabularyEntry_organizationId_idx" ON "VocabularyEntry"("organizationId");

-- CreateIndex
CREATE INDEX "StorageConfiguration_organizationId_isActive_idx" ON "StorageConfiguration"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "StorageConfiguration_organizationId_provider_idx" ON "StorageConfiguration"("organizationId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "StorageConfiguration_organizationId_name_key" ON "StorageConfiguration"("organizationId", "name");

-- CreateIndex
CREATE INDEX "UploadedFile_vocabularyEntryId_isCurrent_status_idx" ON "UploadedFile"("vocabularyEntryId", "isCurrent", "status");

-- CreateIndex
CREATE INDEX "UploadedFile_organizationId_status_createdAt_idx" ON "UploadedFile"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "UploadedFile_organizationId_ownerType_ownerId_idx" ON "UploadedFile"("organizationId", "ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "UploadedFile_path_idx" ON "UploadedFile"("path");

-- CreateIndex
CREATE INDEX "UploadedFile_storageConfigurationId_idx" ON "UploadedFile"("storageConfigurationId");

-- CreateIndex
CREATE UNIQUE INDEX "SynonymsAntonyms_contentBlockId_key" ON "SynonymsAntonyms"("contentBlockId");

-- CreateIndex
CREATE INDEX "SynonymsAntonyms_organizationId_contentId_idx" ON "SynonymsAntonyms"("organizationId", "contentId");

-- CreateIndex
CREATE INDEX "SynonymsAntonymsEntry_synonymsAntonymsId_sortOrder_idx" ON "SynonymsAntonymsEntry"("synonymsAntonymsId", "sortOrder");

-- CreateIndex
CREATE INDEX "SynonymsAntonymsEntry_organizationId_idx" ON "SynonymsAntonymsEntry"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GapFillExercise_contentBlockId_key" ON "GapFillExercise"("contentBlockId");

-- CreateIndex
CREATE INDEX "GapFillExercise_organizationId_contentId_idx" ON "GapFillExercise"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "GapFillFirstPaper_contentBlockId_key" ON "GapFillFirstPaper"("contentBlockId");

-- CreateIndex
CREATE INDEX "GapFillFirstPaper_organizationId_contentId_idx" ON "GapFillFirstPaper"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "GapFillSecondPaper_contentBlockId_key" ON "GapFillSecondPaper"("contentBlockId");

-- CreateIndex
CREATE INDEX "GapFillSecondPaper_organizationId_contentId_idx" ON "GapFillSecondPaper"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "McqSection_contentBlockId_key" ON "McqSection"("contentBlockId");

-- CreateIndex
CREATE INDEX "McqSection_organizationId_contentId_idx" ON "McqSection"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionAnswerExercise_contentBlockId_key" ON "QuestionAnswerExercise"("contentBlockId");

-- CreateIndex
CREATE INDEX "QuestionAnswerExercise_organizationId_contentId_idx" ON "QuestionAnswerExercise"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "TableCompletionExercise_contentBlockId_key" ON "TableCompletionExercise"("contentBlockId");

-- CreateIndex
CREATE INDEX "TableCompletionExercise_organizationId_contentId_idx" ON "TableCompletionExercise"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "ColumnMatchingExercise_contentBlockId_key" ON "ColumnMatchingExercise"("contentBlockId");

-- CreateIndex
CREATE INDEX "ColumnMatchingExercise_organizationId_contentId_idx" ON "ColumnMatchingExercise"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "RearrangeSentenceExercise_contentBlockId_key" ON "RearrangeSentenceExercise"("contentBlockId");

-- CreateIndex
CREATE INDEX "RearrangeSentenceExercise_organizationId_contentId_idx" ON "RearrangeSentenceExercise"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionFromPoems_contentBlockId_key" ON "QuestionFromPoems"("contentBlockId");

-- CreateIndex
CREATE INDEX "QuestionFromPoems_organizationId_contentId_idx" ON "QuestionFromPoems"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionFromStory_contentBlockId_key" ON "QuestionFromStory"("contentBlockId");

-- CreateIndex
CREATE INDEX "QuestionFromStory_organizationId_contentId_idx" ON "QuestionFromStory"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "TrueFalseExercise_contentBlockId_key" ON "TrueFalseExercise"("contentBlockId");

-- CreateIndex
CREATE INDEX "TrueFalseExercise_organizationId_contentId_idx" ON "TrueFalseExercise"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "InformationTransfer_contentBlockId_key" ON "InformationTransfer"("contentBlockId");

-- CreateIndex
CREATE INDEX "InformationTransfer_organizationId_contentId_idx" ON "InformationTransfer"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "SubstitutionTable_contentBlockId_key" ON "SubstitutionTable"("contentBlockId");

-- CreateIndex
CREATE INDEX "SubstitutionTable_organizationId_contentId_idx" ON "SubstitutionTable"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "RightFormOfVerb_contentBlockId_key" ON "RightFormOfVerb"("contentBlockId");

-- CreateIndex
CREATE INDEX "RightFormOfVerb_organizationId_contentId_idx" ON "RightFormOfVerb"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "Narration_contentBlockId_key" ON "Narration"("contentBlockId");

-- CreateIndex
CREATE INDEX "Narration_organizationId_contentId_idx" ON "Narration"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "ChangingSentence_contentBlockId_key" ON "ChangingSentence"("contentBlockId");

-- CreateIndex
CREATE INDEX "ChangingSentence_organizationId_contentId_idx" ON "ChangingSentence"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "PunctuationAndCapitalization_contentBlockId_key" ON "PunctuationAndCapitalization"("contentBlockId");

-- CreateIndex
CREATE INDEX "PunctuationAndCapitalization_organizationId_contentId_idx" ON "PunctuationAndCapitalization"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "Preposition_contentBlockId_key" ON "Preposition"("contentBlockId");

-- CreateIndex
CREATE INDEX "Preposition_organizationId_contentId_idx" ON "Preposition"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "SuffixAndPrefix_contentBlockId_key" ON "SuffixAndPrefix"("contentBlockId");

-- CreateIndex
CREATE INDEX "SuffixAndPrefix_organizationId_contentId_idx" ON "SuffixAndPrefix"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "PartsOfSpeech_contentBlockId_key" ON "PartsOfSpeech"("contentBlockId");

-- CreateIndex
CREATE INDEX "PartsOfSpeech_organizationId_contentId_idx" ON "PartsOfSpeech"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "TagQuestion_contentBlockId_key" ON "TagQuestion"("contentBlockId");

-- CreateIndex
CREATE INDEX "TagQuestion_organizationId_contentId_idx" ON "TagQuestion"("organizationId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "Connector_contentBlockId_key" ON "Connector"("contentBlockId");

-- CreateIndex
CREATE INDEX "Connector_organizationId_contentId_idx" ON "Connector"("organizationId", "contentId");

-- CreateIndex
CREATE INDEX "SubjectMatchingSentencesBlock_organizationId_classId_subjectId_sortOrder_idx" ON "SubjectMatchingSentencesBlock"("organizationId", "classId", "subjectId", "sortOrder");

-- CreateIndex
CREATE INDEX "SubjectMatchingSentencesBlock_organizationId_boardId_academicYearId_idx" ON "SubjectMatchingSentencesBlock"("organizationId", "boardId", "academicYearId");

-- CreateIndex
CREATE INDEX "SubjectRearrangeSentenceBlock_organizationId_classId_subjectId_sortOrder_idx" ON "SubjectRearrangeSentenceBlock"("organizationId", "classId", "subjectId", "sortOrder");

-- CreateIndex
CREATE INDEX "SubjectRearrangeSentenceBlock_organizationId_boardId_academicYearId_idx" ON "SubjectRearrangeSentenceBlock"("organizationId", "boardId", "academicYearId");

-- CreateIndex
CREATE INDEX "SubjectQuestionFromPoemsBlock_organizationId_classId_subjectId_sortOrder_idx" ON "SubjectQuestionFromPoemsBlock"("organizationId", "classId", "subjectId", "sortOrder");

-- CreateIndex
CREATE INDEX "SubjectQuestionFromPoemsBlock_organizationId_boardId_academicYearId_idx" ON "SubjectQuestionFromPoemsBlock"("organizationId", "boardId", "academicYearId");

-- CreateIndex
CREATE INDEX "SubjectQuestionFromStoryBlock_organizationId_classId_subjectId_sortOrder_idx" ON "SubjectQuestionFromStoryBlock"("organizationId", "classId", "subjectId", "sortOrder");

-- CreateIndex
CREATE INDEX "SubjectQuestionFromStoryBlock_organizationId_boardId_academicYearId_idx" ON "SubjectQuestionFromStoryBlock"("organizationId", "boardId", "academicYearId");

-- CreateIndex
CREATE INDEX "SubjectEnglishSecondPaperBlock_organizationId_classId_subjectId_kind_sortOrder_idx" ON "SubjectEnglishSecondPaperBlock"("organizationId", "classId", "subjectId", "kind", "sortOrder");

-- CreateIndex
CREATE INDEX "SubjectEnglishSecondPaperBlock_organizationId_boardId_academicYearId_idx" ON "SubjectEnglishSecondPaperBlock"("organizationId", "boardId", "academicYearId");

-- CreateIndex
CREATE INDEX "SubjectPartsOfSpeechBlock_organizationId_classId_subjectId_kind_sortOrder_idx" ON "SubjectPartsOfSpeechBlock"("organizationId", "classId", "subjectId", "kind", "sortOrder");

-- CreateIndex
CREATE INDEX "SubjectPartsOfSpeechBlock_organizationId_boardId_academicYearId_idx" ON "SubjectPartsOfSpeechBlock"("organizationId", "boardId", "academicYearId");

-- CreateIndex
CREATE INDEX "Board_organizationId_isActive_name_idx" ON "Board"("organizationId", "isActive", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Board_organizationId_name_key" ON "Board"("organizationId", "name");

-- CreateIndex
CREATE INDEX "AcademicYear_organizationId_isActive_year_idx" ON "AcademicYear"("organizationId", "isActive", "year");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_organizationId_year_key" ON "AcademicYear"("organizationId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ModelQuestionImport_fileId_key" ON "ModelQuestionImport"("fileId");

-- CreateIndex
CREATE INDEX "ModelQuestionImport_organizationId_classId_subjectId_createdAt_idx" ON "ModelQuestionImport"("organizationId", "classId", "subjectId", "createdAt");

-- CreateIndex
CREATE INDEX "ModelQuestionImport_organizationId_classId_subjectId_boardId_academicYearId_idx" ON "ModelQuestionImport"("organizationId", "classId", "subjectId", "boardId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelQuestionSet_editorContentId_key" ON "ModelQuestionSet"("editorContentId");

-- CreateIndex
CREATE INDEX "ModelQuestionSet_organizationId_classId_subjectId_createdAt_idx" ON "ModelQuestionSet"("organizationId", "classId", "subjectId", "createdAt");

-- CreateIndex
CREATE INDEX "ModelQuestionSet_organizationId_classId_subjectId_boardId_academicYearId_idx" ON "ModelQuestionSet"("organizationId", "classId", "subjectId", "boardId", "academicYearId");

-- CreateIndex
CREATE INDEX "ModelQuestionSetBlock_organizationId_setId_sortOrder_idx" ON "ModelQuestionSetBlock"("organizationId", "setId", "sortOrder");


-- CreateIndex
CREATE INDEX "ModelQuestionSet_organizationId_classId_subjectId_publishedAt_idx" ON "ModelQuestionSet"("organizationId", "classId", "subjectId", "publishedAt");
