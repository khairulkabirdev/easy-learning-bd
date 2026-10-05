-- Add Passage / linked Paragraph support to Vocabulary blocks.
-- Run once after replacing schema.prisma.

ALTER TABLE "Vocabulary" ADD COLUMN "passage" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Vocabulary" ADD COLUMN "passageSource" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Vocabulary" ADD COLUMN "paragraphBlockId" TEXT;
