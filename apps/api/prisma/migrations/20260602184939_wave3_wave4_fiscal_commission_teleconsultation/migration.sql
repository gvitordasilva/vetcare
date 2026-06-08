-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('MEI', 'SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL');

-- CreateEnum
CREATE TYPE "FiscalDocumentType" AS ENUM ('NFE', 'NFSE');

-- CreateEnum
CREATE TYPE "FiscalDocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'AUTHORIZED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TeleconsultationStatus" AS ENUM ('WAITING', 'ACTIVE', 'ENDED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN     "commissionAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "ie" TEXT,
ADD COLUMN     "im" TEXT,
ADD COLUMN     "taxRegime" "TaxRegime";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "commissionRate" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "FiscalDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "type" "FiscalDocumentType" NOT NULL,
    "status" "FiscalDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "number" TEXT,
    "series" TEXT,
    "accessKey" TEXT,
    "xmlUrl" TEXT,
    "pdfUrl" TEXT,
    "protocol" TEXT,
    "issuedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeleconsultationRoom" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "patientId" TEXT NOT NULL,
    "vetId" TEXT NOT NULL,
    "roomUrl" TEXT NOT NULL,
    "dailyRoomName" TEXT NOT NULL,
    "status" "TeleconsultationStatus" NOT NULL DEFAULT 'WAITING',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeleconsultationRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FiscalDocument_invoiceId_key" ON "FiscalDocument"("invoiceId");

-- CreateIndex
CREATE INDEX "FiscalDocument_tenantId_status_idx" ON "FiscalDocument"("tenantId", "status");

-- CreateIndex
CREATE INDEX "FiscalDocument_tenantId_issuedAt_idx" ON "FiscalDocument"("tenantId", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeleconsultationRoom_appointmentId_key" ON "TeleconsultationRoom"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeleconsultationRoom_dailyRoomName_key" ON "TeleconsultationRoom"("dailyRoomName");

-- CreateIndex
CREATE INDEX "TeleconsultationRoom_tenantId_status_idx" ON "TeleconsultationRoom"("tenantId", "status");

-- CreateIndex
CREATE INDEX "TeleconsultationRoom_tenantId_scheduledAt_idx" ON "TeleconsultationRoom"("tenantId", "scheduledAt");

-- AddForeignKey
ALTER TABLE "FiscalDocument" ADD CONSTRAINT "FiscalDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalDocument" ADD CONSTRAINT "FiscalDocument_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeleconsultationRoom" ADD CONSTRAINT "TeleconsultationRoom_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeleconsultationRoom" ADD CONSTRAINT "TeleconsultationRoom_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeleconsultationRoom" ADD CONSTRAINT "TeleconsultationRoom_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeleconsultationRoom" ADD CONSTRAINT "TeleconsultationRoom_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
