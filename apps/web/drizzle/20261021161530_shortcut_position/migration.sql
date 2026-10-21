ALTER TABLE "shortcuts" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "shortcuts" SET "position" = ranked.rn FROM (SELECT "id", ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "created_at") - 1 AS rn FROM "shortcuts") AS ranked WHERE "shortcuts"."id" = ranked."id";
