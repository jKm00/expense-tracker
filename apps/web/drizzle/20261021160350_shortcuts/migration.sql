CREATE TYPE "home_widget_type" AS ENUM('quick_log', 'shortcuts');--> statement-breakpoint
CREATE TABLE "shortcut_products" (
	"shortcut_id" uuid,
	"product_id" uuid,
	CONSTRAINT "shortcut_products_pkey" PRIMARY KEY("shortcut_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "shortcuts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"store" text,
	"type" "entry_type" NOT NULL,
	"price" numeric(10,2),
	"show_on_home" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "home_widgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"type" "home_widget_type" NOT NULL,
	"position" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "shortcuts_user_id_idx" ON "shortcuts" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "home_widgets_user_type_idx" ON "home_widgets" ("user_id","type");--> statement-breakpoint
ALTER TABLE "shortcut_products" ADD CONSTRAINT "shortcut_products_shortcut_id_shortcuts_id_fkey" FOREIGN KEY ("shortcut_id") REFERENCES "shortcuts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "shortcut_products" ADD CONSTRAINT "shortcut_products_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "shortcuts" ADD CONSTRAINT "shortcuts_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "home_widgets" ADD CONSTRAINT "home_widgets_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;