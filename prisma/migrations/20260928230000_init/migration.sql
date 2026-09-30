-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "rahmet_crm";

-- CreateEnum
CREATE TYPE "rahmet_crm"."AcademicYearStatus" AS ENUM ('PLANNED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "rahmet_crm"."EmploymentType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "rahmet_crm"."CourseStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "rahmet_crm"."SourceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "rahmet_crm"."PreRegistrationStatus" AS ENUM ('NEW', 'IN_REVIEW', 'CONTACTED', 'APPROVED', 'REJECTED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "rahmet_crm"."ActivityType" AS ENUM ('NOTE', 'STATUS_CHANGE', 'ASSIGNMENT', 'VALIDATION', 'CONVERSION');

-- CreateEnum
CREATE TYPE "rahmet_crm"."EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "rahmet_crm"."IntegrationStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "rahmet_crm"."AppRole" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');

-- CreateTable
CREATE TABLE "rahmet_crm"."app_user" (
    "id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "rahmet_crm"."AppRole" NOT NULL DEFAULT 'OPERATOR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rahmet_crm"."academic_year" (
    "id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "rahmet_crm"."AcademicYearStatus" NOT NULL DEFAULT 'PLANNED',

    CONSTRAINT "academic_year_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rahmet_crm"."teacher" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "employment_type" "rahmet_crm"."EmploymentType" NOT NULL DEFAULT 'EXTERNAL',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rahmet_crm"."course" (
    "id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "student_fee_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "teacher_fee_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "rahmet_crm"."CourseStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rahmet_crm"."external_registration_source" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'GOOGLE_FORMS_SHEET',
    "spreadsheet_id" TEXT NOT NULL,
    "spreadsheet_url" TEXT NOT NULL,
    "sheet_gid" TEXT NOT NULL,
    "sheet_name" TEXT,
    "status" "rahmet_crm"."SourceStatus" NOT NULL DEFAULT 'PAUSED',
    "secret_reference" TEXT,
    "sync_cursor" TEXT,
    "last_synced_row" INTEGER,
    "last_sync_at" TIMESTAMP(3),
    "last_webhook_at" TIMESTAMP(3),
    "last_success_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_registration_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rahmet_crm"."pre_registration" (
    "id" UUID NOT NULL,
    "external_source_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "source_submitted_at" TIMESTAMP(3),
    "source_course_label" TEXT,
    "full_name" TEXT NOT NULL,
    "phone_raw" TEXT NOT NULL,
    "phone_normalized" TEXT,
    "birth_date" DATE,
    "district" TEXT,
    "previous_participant" BOOLEAN,
    "previous_course" TEXT,
    "marital_status" TEXT,
    "children_count" INTEGER,
    "education_level" TEXT,
    "discovery_channel" TEXT,
    "status" "rahmet_crm"."PreRegistrationStatus" NOT NULL DEFAULT 'NEW',
    "assigned_operator_id" UUID,
    "validation_errors" JSONB,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pre_registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rahmet_crm"."pre_registration_activity" (
    "id" UUID NOT NULL,
    "pre_registration_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "activity_type" "rahmet_crm"."ActivityType" NOT NULL,
    "from_status" "rahmet_crm"."PreRegistrationStatus",
    "to_status" "rahmet_crm"."PreRegistrationStatus",
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pre_registration_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rahmet_crm"."student" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "birth_date" DATE,
    "district" TEXT,
    "address" TEXT,
    "class_level" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rahmet_crm"."enrollment" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "enrollment_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "rahmet_crm"."EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "agreed_fee_amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rahmet_crm"."pre_registration_conversion" (
    "pre_registration_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "enrollment_id" UUID,
    "converted_by_user_id" UUID NOT NULL,
    "converted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pre_registration_conversion_pkey" PRIMARY KEY ("pre_registration_id")
);

-- CreateTable
CREATE TABLE "rahmet_crm"."integration_event" (
    "id" UUID NOT NULL,
    "external_source_id" UUID NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "status" "rahmet_crm"."IntegrationStatus" NOT NULL DEFAULT 'RECEIVED',
    "attempt_count" INTEGER NOT NULL DEFAULT 1,
    "last_error_code" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "integration_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "rahmet_crm"."app_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "academic_year_display_name_key" ON "rahmet_crm"."academic_year"("display_name");

-- CreateIndex
CREATE UNIQUE INDEX "course_academic_year_id_name_key" ON "rahmet_crm"."course"("academic_year_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "external_registration_source_provider_spreadsheet_id_sheet__key" ON "rahmet_crm"."external_registration_source"("provider", "spreadsheet_id", "sheet_gid");

-- CreateIndex
CREATE UNIQUE INDEX "external_registration_source_id_course_id_key" ON "rahmet_crm"."external_registration_source"("id", "course_id");

-- CreateIndex
CREATE INDEX "pre_registration_status_received_at_idx" ON "rahmet_crm"."pre_registration"("status", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "pre_registration_external_source_id_source_record_id_key" ON "rahmet_crm"."pre_registration"("external_source_id", "source_record_id");

-- CreateIndex
CREATE INDEX "student_phone_idx" ON "rahmet_crm"."student"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_student_id_course_id_key" ON "rahmet_crm"."enrollment"("student_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "pre_registration_conversion_enrollment_id_key" ON "rahmet_crm"."pre_registration_conversion"("enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_event_external_source_id_source_record_id_key" ON "rahmet_crm"."integration_event"("external_source_id", "source_record_id");

-- AddForeignKey
ALTER TABLE "rahmet_crm"."course" ADD CONSTRAINT "course_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "rahmet_crm"."academic_year"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rahmet_crm"."course" ADD CONSTRAINT "course_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "rahmet_crm"."teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rahmet_crm"."external_registration_source" ADD CONSTRAINT "external_registration_source_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "rahmet_crm"."course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rahmet_crm"."external_registration_source" ADD CONSTRAINT "external_registration_source_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "rahmet_crm"."app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rahmet_crm"."pre_registration" ADD CONSTRAINT "pre_registration_external_source_id_course_id_fkey" FOREIGN KEY ("external_source_id", "course_id") REFERENCES "rahmet_crm"."external_registration_source"("id", "course_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rahmet_crm"."pre_registration" ADD CONSTRAINT "pre_registration_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "rahmet_crm"."course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rahmet_crm"."pre_registration" ADD CONSTRAINT "pre_registration_assigned_operator_id_fkey" FOREIGN KEY ("assigned_operator_id") REFERENCES "rahmet_crm"."app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rahmet_crm"."pre_registration_activity" ADD CONSTRAINT "pre_registration_activity_pre_registration_id_fkey" FOREIGN KEY ("pre_registration_id") REFERENCES "rahmet_crm"."pre_registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rahmet_crm"."pre_registration_activity" ADD CONSTRAINT "pre_registration_activity_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "rahmet_crm"."app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rahmet_crm"."enrollment" ADD CONSTRAINT "enrollment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "rahmet_crm"."student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rahmet_crm"."enrollment" ADD CONSTRAINT "enrollment_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "rahmet_crm"."course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rahmet_crm"."pre_registration_conversion" ADD CONSTRAINT "pre_registration_conversion_pre_registration_id_fkey" FOREIGN KEY ("pre_registration_id") REFERENCES "rahmet_crm"."pre_registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rahmet_crm"."pre_registration_conversion" ADD CONSTRAINT "pre_registration_conversion_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "rahmet_crm"."student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rahmet_crm"."pre_registration_conversion" ADD CONSTRAINT "pre_registration_conversion_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "rahmet_crm"."enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rahmet_crm"."pre_registration_conversion" ADD CONSTRAINT "pre_registration_conversion_converted_by_user_id_fkey" FOREIGN KEY ("converted_by_user_id") REFERENCES "rahmet_crm"."app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rahmet_crm"."integration_event" ADD CONSTRAINT "integration_event_external_source_id_fkey" FOREIGN KEY ("external_source_id") REFERENCES "rahmet_crm"."external_registration_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A course can have only one active external registration source.
CREATE UNIQUE INDEX "external_registration_source_one_active_per_course"
ON "rahmet_crm"."external_registration_source" ("course_id")
WHERE "status" = 'ACTIVE';
