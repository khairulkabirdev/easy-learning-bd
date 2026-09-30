-- One-time migration: add item-based JSON storage to Information Transfer.
-- Existing question/answer/details columns are intentionally preserved for legacy compatibility.
ALTER TABLE "InformationTransfer"
ADD COLUMN "documentJson" TEXT NOT NULL DEFAULT '{"rows":[]}';
