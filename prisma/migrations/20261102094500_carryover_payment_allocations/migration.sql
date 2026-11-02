CREATE TABLE "rahmet_crm"."student_carryover_payment_allocation" (
    "id" UUID NOT NULL,
    "carryover_line_id" UUID NOT NULL,
    "payment_entry_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "student_carryover_payment_allocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_carryover_payment_allocation_carryover_line_id_payment_entry_id_key"
ON "rahmet_crm"."student_carryover_payment_allocation"("carryover_line_id", "payment_entry_id");

CREATE INDEX "student_carryover_payment_allocation_payment_entry_id_idx"
ON "rahmet_crm"."student_carryover_payment_allocation"("payment_entry_id");

ALTER TABLE "rahmet_crm"."student_carryover_payment_allocation"
ADD CONSTRAINT "student_carryover_payment_allocation_carryover_line_id_fkey"
FOREIGN KEY ("carryover_line_id") REFERENCES "rahmet_crm"."student_monthly_carryover_line"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rahmet_crm"."student_carryover_payment_allocation"
ADD CONSTRAINT "student_carryover_payment_allocation_payment_entry_id_fkey"
FOREIGN KEY ("payment_entry_id") REFERENCES "rahmet_crm"."student_account_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
