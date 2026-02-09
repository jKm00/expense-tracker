CREATE TYPE "public"."fixed_snapshot_type" AS ENUM('expense', 'income');--> statement-breakpoint
CREATE TABLE "monthly_fixed_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"type" "fixed_snapshot_type" NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_fixed_snapshot_unique" UNIQUE("user_id","year","month","type","name")
);
--> statement-breakpoint
ALTER TABLE "monthly_fixed_snapshot" ADD CONSTRAINT "monthly_fixed_snapshot_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_fixed_snapshot" ADD CONSTRAINT "monthly_fixed_snapshot_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;