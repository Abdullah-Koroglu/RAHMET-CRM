CREATE TYPE "rahmet_crm"."LessonSessionStatus" AS ENUM ('PLANNED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "rahmet_crm"."StudentAccountEntryType" AS ENUM ('PAYMENT', 'SESSION_CHARGE', 'SESSION_REVERSAL');

ALTER TABLE "rahmet_crm"."course"
ADD COLUMN "monthly_session_count" INTEGER NOT NULL DEFAULT 4,
ADD CONSTRAINT "course_monthly_session_count_positive_check" CHECK ("monthly_session_count" > 0);

ALTER TABLE "rahmet_crm"."enrollment"
ADD COLUMN "monthly_session_count" INTEGER NOT NULL DEFAULT 4,
ADD CONSTRAINT "enrollment_monthly_session_count_positive_check" CHECK ("monthly_session_count" > 0);

CREATE TABLE "rahmet_crm"."lesson_session" (
  "id" UUID NOT NULL,
  "course_id" UUID NOT NULL,
  "session_date" DATE NOT NULL,
  "status" "rahmet_crm"."LessonSessionStatus" NOT NULL DEFAULT 'PLANNED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "lesson_session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lesson_session_course_id_session_date_key" ON "rahmet_crm"."lesson_session"("course_id", "session_date");
CREATE INDEX "lesson_session_course_id_session_date_idx" ON "rahmet_crm"."lesson_session"("course_id", "session_date");
ALTER TABLE "rahmet_crm"."lesson_session" ADD CONSTRAINT "lesson_session_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "rahmet_crm"."course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "rahmet_crm"."student_account_entry" (
  "id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "enrollment_id" UUID,
  "lesson_session_id" UUID,
  "entry_type" "rahmet_crm"."StudentAccountEntryType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "occurred_on" DATE NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_account_entry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_account_entry_amount_nonzero_check" CHECK ("amount" <> 0)
);
CREATE UNIQUE INDEX "student_account_entry_lesson_session_id_enrollment_id_entry_type_key" ON "rahmet_crm"."student_account_entry"("lesson_session_id", "enrollment_id", "entry_type");
CREATE INDEX "student_account_entry_student_id_occurred_on_idx" ON "rahmet_crm"."student_account_entry"("student_id", "occurred_on");
CREATE INDEX "student_account_entry_enrollment_id_idx" ON "rahmet_crm"."student_account_entry"("enrollment_id");
ALTER TABLE "rahmet_crm"."student_account_entry" ADD CONSTRAINT "student_account_entry_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "rahmet_crm"."student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rahmet_crm"."student_account_entry" ADD CONSTRAINT "student_account_entry_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "rahmet_crm"."enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rahmet_crm"."student_account_entry" ADD CONSTRAINT "student_account_entry_lesson_session_id_fkey" FOREIGN KEY ("lesson_session_id") REFERENCES "rahmet_crm"."lesson_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rahmet_crm"."student_account_entry" ADD CONSTRAINT "student_account_entry_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "rahmet_crm"."app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
