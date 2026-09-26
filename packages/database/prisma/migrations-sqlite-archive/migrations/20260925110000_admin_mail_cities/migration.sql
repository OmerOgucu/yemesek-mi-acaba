-- Accounts, dynamic cities, moderation, mail, badges, and site settings.
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "disabledAt" DATETIME;

ALTER TABLE "Restaurant" ADD COLUMN "cityKey" TEXT NOT NULL DEFAULT '';
UPDATE "Restaurant" SET "cityKey" = lower(trim("city")) WHERE "cityKey" = '';
ALTER TABLE "Restaurant" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Restaurant" ADD COLUMN "createdById" TEXT;
DROP INDEX IF EXISTS "Restaurant_city_idx";
CREATE INDEX "Restaurant_cityKey_idx" ON "Restaurant"("cityKey");
CREATE INDEX "Restaurant_createdById_idx" ON "Restaurant"("createdById");

ALTER TABLE "Report" ADD COLUMN "moderationStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Report" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Report" ADD COLUMN "moderationNote" TEXT;

CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EmailVerification_tokenHash_key" ON "EmailVerification"("tokenHash");
CREATE INDEX "EmailVerification_userId_createdAt_idx" ON "EmailVerification"("userId", "createdAt");
CREATE INDEX "EmailVerification_codeHash_idx" ON "EmailVerification"("codeHash");

CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "EmailTemplate" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Badge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX "Badge_slug_key" ON "Badge"("slug");

CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'AUTO',
    "awardedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");
