-- Add block-level Passage + Paragraph linking to MCQ, Gap Fill, Fill in the Blanks, and Synonyms / Antonyms.
-- SQLite / Prisma db execute compatible.

ALTER TABLE "McqSection" ADD COLUMN "passage" TEXT NOT NULL DEFAULT '';
ALTER TABLE "McqSection" ADD COLUMN "passageSource" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "McqSection" ADD COLUMN "paragraphBlockId" TEXT;

ALTER TABLE "GapFillExercise" ADD COLUMN "passage" TEXT NOT NULL DEFAULT '';
ALTER TABLE "GapFillExercise" ADD COLUMN "passageSource" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "GapFillExercise" ADD COLUMN "paragraphBlockId" TEXT;

ALTER TABLE "GapFillFirstPaper" ADD COLUMN "passage" TEXT NOT NULL DEFAULT '';
ALTER TABLE "GapFillFirstPaper" ADD COLUMN "passageSource" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "GapFillFirstPaper" ADD COLUMN "paragraphBlockId" TEXT;

ALTER TABLE "SynonymsAntonyms" ADD COLUMN "passage" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SynonymsAntonyms" ADD COLUMN "passageSource" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "SynonymsAntonyms" ADD COLUMN "paragraphBlockId" TEXT;
