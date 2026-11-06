CREATE TYPE "rahmet_crm"."WorkshopRegistrationStatus" AS ENUM ('ACTIVE', 'CANCELLED');

CREATE TABLE "rahmet_crm"."workshop" (
  "id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "event_date" DATE NOT NULL,
  "default_fee_amount" DECIMAL(12,2) NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workshop_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rahmet_crm"."workshop_registration" (
  "id" UUID NOT NULL,
  "workshop_id" UUID NOT NULL,
  "student_id" UUID,
  "participant_name" TEXT NOT NULL,
  "participant_phone" TEXT,
  "expected_amount" DECIMAL(12,2) NOT NULL,
  "status" "rahmet_crm"."WorkshopRegistrationStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workshop_registration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rahmet_crm"."workshop_payment" (
  "id" UUID NOT NULL,
  "workshop_registration_id" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "paid_on" DATE NOT NULL,
  "note" TEXT,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workshop_payment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workshop_event_date_idx" ON "rahmet_crm"."workshop"("event_date");
CREATE UNIQUE INDEX "workshop_registration_workshop_id_student_id_key" ON "rahmet_crm"."workshop_registration"("workshop_id", "student_id");
CREATE INDEX "workshop_registration_workshop_id_status_idx" ON "rahmet_crm"."workshop_registration"("workshop_id", "status");
CREATE INDEX "workshop_payment_workshop_registration_id_paid_on_idx" ON "rahmet_crm"."workshop_payment"("workshop_registration_id", "paid_on");

ALTER TABLE "rahmet_crm"."workshop" ADD CONSTRAINT "workshop_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "rahmet_crm"."app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rahmet_crm"."workshop_registration" ADD CONSTRAINT "workshop_registration_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "rahmet_crm"."workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rahmet_crm"."workshop_registration" ADD CONSTRAINT "workshop_registration_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "rahmet_crm"."student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rahmet_crm"."workshop_payment" ADD CONSTRAINT "workshop_payment_workshop_registration_id_fkey" FOREIGN KEY ("workshop_registration_id") REFERENCES "rahmet_crm"."workshop_registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rahmet_crm"."workshop_payment" ADD CONSTRAINT "workshop_payment_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "rahmet_crm"."app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
