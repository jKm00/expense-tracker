CREATE TABLE "analytics_chart_preferences" (
	"user_id" text PRIMARY KEY,
	"hide_untagged" boolean DEFAULT false NOT NULL,
	"hide_unknown_product" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_excluded_products" (
	"user_id" text,
	"product_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_excluded_products_pkey" PRIMARY KEY("user_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "analytics_excluded_tags" (
	"user_id" text,
	"tag_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_excluded_tags_pkey" PRIMARY KEY("user_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "analytics_chart_preferences" ADD CONSTRAINT "analytics_chart_preferences_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "analytics_excluded_products" ADD CONSTRAINT "analytics_excluded_products_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "analytics_excluded_products" ADD CONSTRAINT "analytics_excluded_products_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "analytics_excluded_tags" ADD CONSTRAINT "analytics_excluded_tags_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "analytics_excluded_tags" ADD CONSTRAINT "analytics_excluded_tags_tag_id_tags_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE;