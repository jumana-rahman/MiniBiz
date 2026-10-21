-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionPlan_new" AS ENUM ('TRIAL', 'BASIC', 'PRO');
ALTER TABLE "public"."Company" ALTER COLUMN "subscriptionPlan" DROP DEFAULT;
ALTER TABLE "Company" ALTER COLUMN "subscriptionPlan" TYPE "SubscriptionPlan_new" USING ("subscriptionPlan"::text::"SubscriptionPlan_new");
ALTER TYPE "SubscriptionPlan" RENAME TO "SubscriptionPlan_old";
ALTER TYPE "SubscriptionPlan_new" RENAME TO "SubscriptionPlan";
DROP TYPE "public"."SubscriptionPlan_old";
ALTER TABLE "Company" ALTER COLUMN "subscriptionPlan" SET DEFAULT 'TRIAL';
COMMIT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "InvoiceItem" DROP COLUMN "amount",
ADD COLUMN     "lineTotal" DECIMAL(12,2) NOT NULL;
