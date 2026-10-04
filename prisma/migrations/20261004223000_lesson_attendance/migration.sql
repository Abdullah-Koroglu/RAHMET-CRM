CREATE TYPE "rahmet_crm"."AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

CREATE TABLE "rahmet_crm"."lesson_attendance" (
  "id" UUID NOT NULL,
  "lesson_session_id" UUID NOT NULL,
  "enrollment_id" UUID NOT NULL,
  "status" "rahmet_crm"."AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
  "marked_by_user_id" UUID NOT NULL,
  "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lesson_attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lesson_attendance_lesson_session_id_enrollment_id_key" ON "rahmet_crm"."lesson_attendance"("lesson_session_id", "enrollment_id");
CREATE INDEX "lesson_attendance_enrollment_id_idx" ON "rahmet_crm"."lesson_attendance"("enrollment_id");
ALTER TABLE "rahmet_crm"."lesson_attendance" ADD CONSTRAINT "lesson_attendance_lesson_session_id_fkey" FOREIGN KEY ("lesson_session_id") REFERENCES "rahmet_crm"."lesson_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rahmet_crm"."lesson_attendance" ADD CONSTRAINT "lesson_attendance_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "rahmet_crm"."enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rahmet_crm"."lesson_attendance" ADD CONSTRAINT "lesson_attendance_marked_by_user_id_fkey" FOREIGN KEY ("marked_by_user_id") REFERENCES "rahmet_crm"."app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
