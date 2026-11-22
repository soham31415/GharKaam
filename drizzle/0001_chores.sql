CREATE TYPE "public"."assignment_mode" AS ENUM('fixed', 'rotation', 'anyone');--> statement-breakpoint
CREATE TYPE "public"."occurrence_status" AS ENUM('pending', 'done', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."schedule_mode" AS ENUM('fixed', 'after_completion');--> statement-breakpoint
CREATE TABLE "chore_occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chore_id" uuid NOT NULL,
	"due_date" date NOT NULL,
	"assignee_id" uuid,
	"rotation_index" integer,
	"status" "occurrence_status" DEFAULT 'pending' NOT NULL,
	"closed_by" uuid,
	"closed_at" timestamp with time zone,
	"previous_occurrence_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chore_occurrences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chore_rotation_members" (
	"chore_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "chore_rotation_members_chore_id_position_pk" PRIMARY KEY("chore_id","position")
);
--> statement-breakpoint
ALTER TABLE "chore_rotation_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"rrule" text,
	"start_date" date NOT NULL,
	"schedule_mode" "schedule_mode" DEFAULT 'fixed' NOT NULL,
	"assignment_mode" "assignment_mode" DEFAULT 'fixed' NOT NULL,
	"assignee_id" uuid,
	"created_by" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chore_occurrences" ADD CONSTRAINT "chore_occurrences_chore_id_chores_id_fk" FOREIGN KEY ("chore_id") REFERENCES "public"."chores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chore_occurrences" ADD CONSTRAINT "chore_occurrences_assignee_id_profiles_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chore_occurrences" ADD CONSTRAINT "chore_occurrences_closed_by_profiles_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chore_occurrences" ADD CONSTRAINT "chore_occurrences_previous_occurrence_id_chore_occurrences_id_fk" FOREIGN KEY ("previous_occurrence_id") REFERENCES "public"."chore_occurrences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chore_rotation_members" ADD CONSTRAINT "chore_rotation_members_chore_id_chores_id_fk" FOREIGN KEY ("chore_id") REFERENCES "public"."chores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chore_rotation_members" ADD CONSTRAINT "chore_rotation_members_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chores" ADD CONSTRAINT "chores_assignee_id_profiles_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chores" ADD CONSTRAINT "chores_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chore_occurrences_one_pending" ON "chore_occurrences" USING btree ("chore_id") WHERE "chore_occurrences"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "chore_occurrences_status_due_idx" ON "chore_occurrences" USING btree ("status","due_date");--> statement-breakpoint
CREATE INDEX "chore_occurrences_assignee_idx" ON "chore_occurrences" USING btree ("assignee_id","status");--> statement-breakpoint
CREATE INDEX "chore_occurrences_closed_idx" ON "chore_occurrences" USING btree ("closed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chore_rotation_members_unique_profile" ON "chore_rotation_members" USING btree ("chore_id","profile_id");--> statement-breakpoint
CREATE INDEX "chores_active_idx" ON "chores" USING btree ("archived_at");