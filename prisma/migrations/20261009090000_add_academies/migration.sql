CREATE TYPE "rahmet_crm"."AcademyType" AS ENUM ('PRIMARY', 'MIDDLE', 'HIGH');

CREATE TABLE "rahmet_crm"."guardian" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "guardian_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rahmet_crm"."academy_enrollment" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "academy" "rahmet_crm"."AcademyType" NOT NULL,
    "fee_amount" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "academy_enrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rahmet_crm"."academy_payment" (
    "id" UUID NOT NULL,
    "academy_enrollment_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid_on" DATE NOT NULL,
    "note" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "academy_payment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "guardian_student_id_idx" ON "rahmet_crm"."guardian"("student_id");
CREATE UNIQUE INDEX "academy_enrollment_student_id_academy_key" ON "rahmet_crm"."academy_enrollment"("student_id", "academy");
CREATE INDEX "academy_enrollment_academy_is_active_idx" ON "rahmet_crm"."academy_enrollment"("academy", "is_active");
CREATE INDEX "academy_payment_academy_enrollment_id_paid_on_idx" ON "rahmet_crm"."academy_payment"("academy_enrollment_id", "paid_on");

ALTER TABLE "rahmet_crm"."guardian" ADD CONSTRAINT "guardian_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "rahmet_crm"."student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rahmet_crm"."academy_enrollment" ADD CONSTRAINT "academy_enrollment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "rahmet_crm"."student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rahmet_crm"."academy_payment" ADD CONSTRAINT "academy_payment_academy_enrollment_id_fkey" FOREIGN KEY ("academy_enrollment_id") REFERENCES "rahmet_crm"."academy_enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rahmet_crm"."academy_payment" ADD CONSTRAINT "academy_payment_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "rahmet_crm"."app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
