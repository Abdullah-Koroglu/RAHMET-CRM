CREATE TABLE "rahmet_crm"."student_monthly_carryover_line" (
    "id" UUID NOT NULL,
    "monthly_charge_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "source_month" DATE NOT NULL,
    "lesson_count" INTEGER NOT NULL,
    "unit_amount" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "student_monthly_carryover_line_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_monthly_carryover_line_monthly_charge_id_enrollment_id_source_month_key"
  ON "rahmet_crm"."student_monthly_carryover_line"("monthly_charge_id", "enrollment_id", "source_month");
CREATE INDEX "student_monthly_carryover_line_source_month_idx"
  ON "rahmet_crm"."student_monthly_carryover_line"("source_month");

ALTER TABLE "rahmet_crm"."student_monthly_carryover_line"
  ADD CONSTRAINT "student_monthly_carryover_line_monthly_charge_id_fkey"
  FOREIGN KEY ("monthly_charge_id") REFERENCES "rahmet_crm"."student_monthly_charge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rahmet_crm"."student_monthly_carryover_line"
  ADD CONSTRAINT "student_monthly_carryover_line_enrollment_id_fkey"
  FOREIGN KEY ("enrollment_id") REFERENCES "rahmet_crm"."enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rahmet_crm"."student_monthly_carryover_line"
  ADD CONSTRAINT "student_monthly_carryover_line_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "rahmet_crm"."app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
