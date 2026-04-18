-- Add the column as nullable so we can backfill existing rows
ALTER TABLE "recurring" ADD COLUMN "type" "entry_type";

-- Backfill existing rows with the default value 'expense'
UPDATE "recurring" SET "type" = 'expense' WHERE "type" IS NULL;

-- Make the column NOT NULL now that existing rows have values
ALTER TABLE "recurring" ALTER COLUMN "type" SET NOT NULL;
