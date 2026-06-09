-- Migration: billing_subscription
-- Adds full billing schema: Subscription, BillingPayment, BillingEvent tables,
-- new enums, and removes FREE from the Plan enum.

-- ─── Step 1: Safety — migrate any existing FREE tenants to PRO ─────────────
UPDATE "Tenant" SET "plan" = 'PRO' WHERE "plan" = 'FREE';

-- ─── Step 2: Create new enums ───────────────────────────────────────────────
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');
CREATE TYPE "BillingPaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'RECEIVED', 'OVERDUE', 'REFUNDED', 'CANCELLED');

-- ─── Step 3: Replace Plan enum (remove FREE) ────────────────────────────────
-- Note: only alter Tenant here; Subscription table doesn't exist yet.
BEGIN;
CREATE TYPE "Plan_new" AS ENUM ('PRO', 'ENTERPRISE');
ALTER TABLE "Tenant" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "Tenant" ALTER COLUMN "plan" TYPE "Plan_new" USING ("plan"::text::"Plan_new");
ALTER TYPE "Plan" RENAME TO "Plan_old";
ALTER TYPE "Plan_new" RENAME TO "Plan";
DROP TYPE "Plan_old";
ALTER TABLE "Tenant" ALTER COLUMN "plan" SET DEFAULT 'PRO';
COMMIT;

-- ─── Step 4: Add new columns to Tenant ─────────────────────────────────────
ALTER TABLE "Tenant"
  ADD COLUMN "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN "asaasCustomerId" TEXT;

-- ─── Step 5: Create Subscription table ─────────────────────────────────────
CREATE TABLE "Subscription" (
    "id"                  TEXT NOT NULL,
    "tenantId"            TEXT NOT NULL,
    "plan"                "Plan" NOT NULL,
    "status"              "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "billingCycle"        "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "asaasSubscriptionId" TEXT,
    "currentPeriodStart"  TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd"    TIMESTAMP(3) NOT NULL,
    "cancelledAt"         TIMESTAMP(3),
    "cancelReason"        TEXT,
    "priceInCents"        INTEGER NOT NULL,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- ─── Step 6: Create BillingPayment table ────────────────────────────────────
CREATE TABLE "BillingPayment" (
    "id"             TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "asaasChargeId"  TEXT,
    "amountInCents"  INTEGER NOT NULL,
    "status"         "BillingPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod"  TEXT,
    "dueDate"        TIMESTAMP(3) NOT NULL,
    "paidAt"         TIMESTAMP(3),
    "pixQrCode"      TEXT,
    "pixCopiaECola"  TEXT,
    "boletoUrl"      TEXT,
    "boletoBarCode"  TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("id")
);

-- ─── Step 7: Create BillingEvent table ──────────────────────────────────────
CREATE TABLE "BillingEvent" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "event"       TEXT NOT NULL,
    "payload"     JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- ─── Step 8: Unique indexes ──────────────────────────────────────────────────
CREATE UNIQUE INDEX "Subscription_tenantId_key"           ON "Subscription"("tenantId");
CREATE UNIQUE INDEX "Subscription_asaasSubscriptionId_key" ON "Subscription"("asaasSubscriptionId");
CREATE UNIQUE INDEX "BillingPayment_asaasChargeId_key"    ON "BillingPayment"("asaasChargeId");

-- ─── Step 9: Performance indexes ────────────────────────────────────────────
CREATE INDEX "Subscription_status_idx"             ON "Subscription"("status");
CREATE INDEX "BillingPayment_status_dueDate_idx"   ON "BillingPayment"("status", "dueDate");
CREATE INDEX "BillingEvent_tenantId_processedAt_idx" ON "BillingEvent"("tenantId", "processedAt");

-- ─── Step 10: Foreign keys ───────────────────────────────────────────────────
ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillingPayment"
  ADD CONSTRAINT "BillingPayment_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillingEvent"
  ADD CONSTRAINT "BillingEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
