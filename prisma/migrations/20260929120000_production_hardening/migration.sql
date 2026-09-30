-- Authentication, audit, resilient integration delivery, and private source support.
CREATE TYPE "rahmet_crm"."SourceAccessMode" AS ENUM ('PUBLIC_CSV', 'WEBHOOK_ONLY');

ALTER TABLE "rahmet_crm"."app_user"
ADD COLUMN "password_hash" TEXT,
ADD COLUMN "failed_login_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "locked_until" TIMESTAMP(3),
ADD COLUMN "last_login_at" TIMESTAMP(3);

CREATE TABLE "rahmet_crm"."user_session" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_session_token_hash_key"
ON "rahmet_crm"."user_session"("token_hash");
CREATE INDEX "user_session_user_id_expires_at_idx"
ON "rahmet_crm"."user_session"("user_id", "expires_at");
ALTER TABLE "rahmet_crm"."user_session"
ADD CONSTRAINT "user_session_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "rahmet_crm"."app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "rahmet_crm"."audit_log" (
  "id" UUID NOT NULL,
  "actor_user_id" UUID,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "request_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_log_entity_type_entity_id_created_at_idx"
ON "rahmet_crm"."audit_log"("entity_type", "entity_id", "created_at");
CREATE INDEX "audit_log_actor_user_id_created_at_idx"
ON "rahmet_crm"."audit_log"("actor_user_id", "created_at");
ALTER TABLE "rahmet_crm"."audit_log"
ADD CONSTRAINT "audit_log_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "rahmet_crm"."app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "rahmet_crm"."external_registration_source"
ADD COLUMN "access_mode" "rahmet_crm"."SourceAccessMode" NOT NULL DEFAULT 'PUBLIC_CSV',
ADD COLUMN "retry_attempt_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "next_retry_at" TIMESTAMP(3),
ADD COLUMN "last_full_scan_at" TIMESTAMP(3),
ADD COLUMN "last_incremental_at" TIMESTAMP(3);

ALTER TABLE "rahmet_crm"."academic_year"
ADD CONSTRAINT "academic_year_date_order_check" CHECK ("end_date" >= "start_date");
ALTER TABLE "rahmet_crm"."course"
ADD CONSTRAINT "course_student_fee_nonnegative_check" CHECK ("student_fee_amount" >= 0),
ADD CONSTRAINT "course_teacher_fee_nonnegative_check" CHECK ("teacher_fee_amount" >= 0);
ALTER TABLE "rahmet_crm"."pre_registration"
ADD CONSTRAINT "pre_registration_children_nonnegative_check" CHECK ("children_count" IS NULL OR "children_count" >= 0);
ALTER TABLE "rahmet_crm"."external_registration_source"
ADD CONSTRAINT "external_source_retry_nonnegative_check" CHECK ("retry_attempt_count" >= 0 AND "consecutive_failures" >= 0);

ALTER TABLE "rahmet_crm"."integration_event"
ADD COLUMN "event_key" TEXT,
ADD COLUMN "event_type" TEXT NOT NULL DEFAULT 'WEBHOOK',
ALTER COLUMN "source_record_id" DROP NOT NULL,
ALTER COLUMN "payload_hash" DROP NOT NULL;

UPDATE "rahmet_crm"."integration_event"
SET "event_key" = "external_source_id"::text || ':' || "source_record_id"
WHERE "event_key" IS NULL;

ALTER TABLE "rahmet_crm"."integration_event"
ALTER COLUMN "event_key" SET NOT NULL;

DROP INDEX "rahmet_crm"."integration_event_external_source_id_source_record_id_key";
CREATE UNIQUE INDEX "integration_event_event_key_key"
ON "rahmet_crm"."integration_event"("event_key");
CREATE INDEX "integration_event_external_source_id_status_received_at_idx"
ON "rahmet_crm"."integration_event"("external_source_id", "status", "received_at");
