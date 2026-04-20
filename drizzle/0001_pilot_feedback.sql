CREATE TABLE "pilot_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"overall_rating" integer NOT NULL,
	"clarity_rating" integer NOT NULL,
	"difficulty_rating" integer NOT NULL,
	"fairness_rating" integer NOT NULL,
	"timing_comments" text,
	"question_comments" text,
	"ux_issues" text,
	"additional_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pilot_feedback" ADD CONSTRAINT "pilot_feedback_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_feedback" ADD CONSTRAINT "pilot_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pilot_feedback_response_unique" ON "pilot_feedback" USING btree ("response_id");--> statement-breakpoint
CREATE INDEX "pilot_feedback_user_idx" ON "pilot_feedback" USING btree ("user_id");