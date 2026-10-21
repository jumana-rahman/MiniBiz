-- Drop the denormalized usage counters.
-- Usage is now derived from the live rows (Customer / Invoice) so the numbers
-- can never drift out of sync with the data they describe.
ALTER TABLE "Company" DROP COLUMN "customersCount";
ALTER TABLE "Company" DROP COLUMN "invoicesCount";
