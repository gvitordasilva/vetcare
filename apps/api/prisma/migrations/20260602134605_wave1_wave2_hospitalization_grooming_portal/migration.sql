-- CreateEnum
CREATE TYPE "HospitalizationStatus" AS ENUM ('ADMITTED', 'OBSERVATION', 'DISCHARGED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "HospitalizationSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "reminderSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "portalActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "portalPasswordHash" TEXT;

-- CreateTable
CREATE TABLE "OwnerRefreshToken" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospitalization" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "responsibleVetId" TEXT NOT NULL,
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "severity" "HospitalizationSeverity" NOT NULL DEFAULT 'MEDIUM',
    "room" TEXT,
    "status" "HospitalizationStatus" NOT NULL DEFAULT 'ADMITTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hospitalization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalizationEvolution" (
    "id" TEXT NOT NULL,
    "hospitalizationId" TEXT NOT NULL,
    "vetId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "heartRate" INTEGER,
    "respiratoryRate" INTEGER,
    "description" TEXT NOT NULL,

    CONSTRAINT "HospitalizationEvolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalizationPrescription" (
    "id" TEXT NOT NULL,
    "hospitalizationId" TEXT NOT NULL,
    "medication" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "route" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "HospitalizationPrescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionApplication" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedById" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PrescriptionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroomingPackage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalSessions" INTEGER NOT NULL,
    "usedSessions" INTEGER NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroomingPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OwnerRefreshToken_token_key" ON "OwnerRefreshToken"("token");

-- CreateIndex
CREATE INDEX "Hospitalization_tenantId_status_idx" ON "Hospitalization"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Hospitalization_tenantId_patientId_idx" ON "Hospitalization"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "GroomingPackage_tenantId_active_idx" ON "GroomingPackage"("tenantId", "active");

-- CreateIndex
CREATE INDEX "GroomingPackage_tenantId_patientId_idx" ON "GroomingPackage"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_scheduledAt_reminderSent_idx" ON "Appointment"("tenantId", "scheduledAt", "reminderSent");

-- AddForeignKey
ALTER TABLE "OwnerRefreshToken" ADD CONSTRAINT "OwnerRefreshToken_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hospitalization" ADD CONSTRAINT "Hospitalization_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hospitalization" ADD CONSTRAINT "Hospitalization_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hospitalization" ADD CONSTRAINT "Hospitalization_responsibleVetId_fkey" FOREIGN KEY ("responsibleVetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalizationEvolution" ADD CONSTRAINT "HospitalizationEvolution_hospitalizationId_fkey" FOREIGN KEY ("hospitalizationId") REFERENCES "Hospitalization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalizationEvolution" ADD CONSTRAINT "HospitalizationEvolution_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalizationPrescription" ADD CONSTRAINT "HospitalizationPrescription_hospitalizationId_fkey" FOREIGN KEY ("hospitalizationId") REFERENCES "Hospitalization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionApplication" ADD CONSTRAINT "PrescriptionApplication_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "HospitalizationPrescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionApplication" ADD CONSTRAINT "PrescriptionApplication_appliedById_fkey" FOREIGN KEY ("appliedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroomingPackage" ADD CONSTRAINT "GroomingPackage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroomingPackage" ADD CONSTRAINT "GroomingPackage_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
