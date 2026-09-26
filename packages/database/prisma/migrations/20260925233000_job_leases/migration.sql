-- Lease ownership so a crashed worker can be told from the worker that still holds the job.
ALTER TABLE "MailJob" ADD COLUMN "leaseOwner" TEXT;
ALTER TABLE "CleanupJob" ADD COLUMN "leaseUntil" TIMESTAMP(3);
ALTER TABLE "CleanupJob" ADD COLUMN "leaseOwner" TEXT;

-- One active cleanup row per object. DONE and FAILED stay out of the index.
CREATE UNIQUE INDEX "CleanupJob_one_active_key"
  ON "CleanupJob" ("objectKey")
  WHERE status IN ('PENDING', 'RUNNING');
