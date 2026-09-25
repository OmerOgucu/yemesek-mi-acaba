-- AlterTable
ALTER TABLE "User" ADD COLUMN "marketingWithdrawnAt" DATETIME;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN "threat" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Report" ADD COLUMN "threatAt" DATETIME;
