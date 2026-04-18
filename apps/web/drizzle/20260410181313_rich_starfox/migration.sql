-- Add the column as nullable so we can populate existing rows
ALTER TABLE "transactions" ADD COLUMN "date" timestamp;

-- For all existing rows, copy the created_at value into date
UPDATE "transactions" SET "date" = "created_at";

-- Now that existing rows have values, make the column NOT NULL
ALTER TABLE "transactions" ALTER COLUMN "date" SET NOT NULL;
