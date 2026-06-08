-- AlterTable
ALTER TABLE "Vaccine" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Appointment_tenantId_idx" ON "Appointment"("tenantId");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_vetId_scheduledAt_idx" ON "Appointment"("tenantId", "vetId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_patientId_scheduledAt_idx" ON "Appointment"("tenantId", "patientId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_status_idx" ON "Appointment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Consultation_tenantId_idx" ON "Consultation"("tenantId");

-- CreateIndex
CREATE INDEX "Consultation_tenantId_patientId_idx" ON "Consultation"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "Consultation_tenantId_vetId_idx" ON "Consultation"("tenantId", "vetId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_paidAt_idx" ON "Invoice"("tenantId", "paidAt");

-- CreateIndex
CREATE INDEX "Vaccine_tenantId_idx" ON "Vaccine"("tenantId");

-- CreateIndex
CREATE INDEX "Vaccine_tenantId_patientId_idx" ON "Vaccine"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "Vaccine_tenantId_nextDoseAt_reminderSent_idx" ON "Vaccine"("tenantId", "nextDoseAt", "reminderSent");
