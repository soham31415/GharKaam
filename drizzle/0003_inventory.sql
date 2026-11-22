CREATE TYPE "public"."inventory_event_type" AS ENUM('restocked', 'flagged_low', 'unflagged', 'used', 'adjusted');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"type" "inventory_event_type" NOT NULL,
	"quantity" numeric(10, 2),
	"profile_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category_id" uuid,
	"unit" text,
	"usual_quantity" numeric(10, 2),
	"restock_rrule" text,
	"last_restocked_on" date,
	"restock_counted_from" date,
	"next_due_on" date,
	"is_low" boolean DEFAULT false NOT NULL,
	"low_flagged_by" uuid,
	"low_flagged_at" timestamp with time zone,
	"is_one_off" boolean DEFAULT false NOT NULL,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory_events" ADD CONSTRAINT "inventory_events_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_events" ADD CONSTRAINT "inventory_events_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_low_flagged_by_profiles_id_fk" FOREIGN KEY ("low_flagged_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_unique" ON "categories" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "inventory_events_item_idx" ON "inventory_events" USING btree ("item_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_events_created_idx" ON "inventory_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inventory_items_active_idx" ON "inventory_items" USING btree ("archived_at","is_low","next_due_on");--> statement-breakpoint
CREATE INDEX "inventory_items_category_idx" ON "inventory_items" USING btree ("category_id");