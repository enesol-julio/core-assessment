CREATE TABLE "allowed_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain" text NOT NULL,
	"added_by" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calibration_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sample_size" integer NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"params" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "golden_test_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" text NOT NULL,
	"quality_level" text NOT NULL,
	"response_text" text NOT NULL,
	"consensus_score" numeric(3, 1) NOT NULL,
	"acceptable_min" numeric(3, 1) NOT NULL,
	"acceptable_max" numeric(3, 1) NOT NULL,
	"response_data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "golden_test_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"passed" boolean NOT NULL,
	"mad" numeric(4, 3) NOT NULL,
	"range_compliance_rate" numeric(4, 3) NOT NULL,
	"extreme_miss_count" integer NOT NULL,
	"results" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"total_latency_ms" integer,
	"total_cost_usd" numeric(8, 4),
	"metadata" jsonb,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"profile_version" integer DEFAULT 1 NOT NULL,
	"user_id" uuid NOT NULL,
	"composite_score" numeric(5, 2) NOT NULL,
	"classification" text NOT NULL,
	"fitness_rating" text NOT NULL,
	"organization" text NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"percentile_rank" integer,
	"relative_fitness_tier" text,
	"profile_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"assessment_version" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"response_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"organization" text NOT NULL,
	"role" text DEFAULT 'test_taker' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "allowed_domains_domain_unique" ON "allowed_domains" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "calibration_snapshots_is_current_idx" ON "calibration_snapshots" USING btree ("is_current");--> statement-breakpoint
CREATE INDEX "golden_test_responses_question_id_idx" ON "golden_test_responses" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "otp_tokens_email_idx" ON "otp_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "otp_tokens_expires_at_idx" ON "otp_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "pipeline_runs_response_id_idx" ON "pipeline_runs" USING btree ("response_id");--> statement-breakpoint
CREATE INDEX "pipeline_runs_status_idx" ON "pipeline_runs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_response_version_unique" ON "profiles" USING btree ("response_id","profile_version");--> statement-breakpoint
CREATE INDEX "profiles_organization_idx" ON "profiles" USING btree ("organization");--> statement-breakpoint
CREATE INDEX "profiles_fitness_rating_idx" ON "profiles" USING btree ("fitness_rating");--> statement-breakpoint
CREATE INDEX "profiles_classification_idx" ON "profiles" USING btree ("classification");--> statement-breakpoint
CREATE INDEX "profiles_completed_at_idx" ON "profiles" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "profiles_composite_score_desc_idx" ON "profiles" USING btree ("composite_score" DESC);--> statement-breakpoint
CREATE INDEX "responses_user_id_idx" ON "responses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "responses_completed_at_idx" ON "responses" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");