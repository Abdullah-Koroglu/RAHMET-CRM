-- Monthly student charges intentionally start empty. Existing course/session account
-- entries are preserved as legacy history and are not backfilled into this model.
CREATE TABLE "rahmet_crm"."student_monthly_charge" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "billing_month" DATE NOT NULL,
    "expected_amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_monthly_charge_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "rahmet_crm"."student_account_entry"
ADD COLUMN "monthly_charge_id" UUID;

CREATE UNIQUE INDEX "student_monthly_charge_student_id_billing_month_key"
ON "rahmet_crm"."student_monthly_charge"("student_id", "billing_month");

CREATE INDEX "student_monthly_charge_billing_month_idx"
ON "rahmet_crm"."student_monthly_charge"("billing_month");

CREATE INDEX "student_account_entry_monthly_charge_id_idx"
ON "rahmet_crm"."student_account_entry"("monthly_charge_id");

ALTER TABLE "rahmet_crm"."student_monthly_charge"
ADD CONSTRAINT "student_monthly_charge_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "rahmet_crm"."student"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rahmet_crm"."student_monthly_charge"
ADD CONSTRAINT "student_monthly_charge_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "rahmet_crm"."app_user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rahmet_crm"."student_account_entry"
ADD CONSTRAINT "student_account_entry_monthly_charge_id_fkey"
FOREIGN KEY ("monthly_charge_id") REFERENCES "rahmet_crm"."student_monthly_charge"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
