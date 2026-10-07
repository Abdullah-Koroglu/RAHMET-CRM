ALTER TABLE "rahmet_crm"."student_account_entry"
ADD COLUMN "payment_request_id" UUID;

CREATE UNIQUE INDEX "student_account_entry_payment_request_id_key"
ON "rahmet_crm"."student_account_entry"("payment_request_id");
