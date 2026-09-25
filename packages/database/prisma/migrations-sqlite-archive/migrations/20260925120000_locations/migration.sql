-- Canonical şehir + ilçe. First spelling wins; later venues attach by folded key.
CREATE TABLE "City" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "City_key_key" ON "City"("key");

CREATE TABLE "District" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "District_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "District_cityId_key_key" ON "District"("cityId", "key");
CREATE INDEX "District_cityId_idx" ON "District"("cityId");

INSERT INTO "City" ("id", "name", "key", "createdAt")
SELECT
    'loccity_' || "cityKey",
    (
        SELECT r2."city" FROM "Restaurant" AS r2
        WHERE r2."cityKey" = "Restaurant"."cityKey"
        ORDER BY r2."createdAt" ASC, r2."id" ASC
        LIMIT 1
    ),
    "cityKey",
    MIN("createdAt")
FROM "Restaurant"
GROUP BY "cityKey";

INSERT INTO "District" ("id", "cityId", "name", "key", "createdAt")
SELECT
    'locdist_' || c."id" || '_' || lower(trim(r."district")),
    c."id",
    (
        SELECT r2."district" FROM "Restaurant" AS r2
        WHERE r2."cityKey" = r."cityKey"
          AND r2."district" IS NOT NULL
          AND lower(trim(r2."district")) = lower(trim(r."district"))
        ORDER BY r2."createdAt" ASC, r2."id" ASC
        LIMIT 1
    ),
    lower(trim(r."district")),
    MIN(r."createdAt")
FROM "Restaurant" AS r
JOIN "City" AS c ON c."key" = r."cityKey"
WHERE r."district" IS NOT NULL AND trim(r."district") != ''
GROUP BY r."cityKey", lower(trim(r."district"));

ALTER TABLE "Restaurant" ADD COLUMN "cityId" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "districtId" TEXT;
CREATE INDEX "Restaurant_cityId_idx" ON "Restaurant"("cityId");
CREATE INDEX "Restaurant_districtId_idx" ON "Restaurant"("districtId");

UPDATE "Restaurant"
SET "cityId" = (SELECT "id" FROM "City" WHERE "City"."key" = "Restaurant"."cityKey");

UPDATE "Restaurant"
SET "districtId" = (
    SELECT d."id" FROM "District" AS d
    WHERE d."cityId" = "Restaurant"."cityId"
      AND d."key" = lower(trim("Restaurant"."district"))
)
WHERE "district" IS NOT NULL AND trim("district") != '';

UPDATE "Restaurant"
SET "city" = (SELECT "name" FROM "City" WHERE "City"."id" = "Restaurant"."cityId")
WHERE "cityId" IS NOT NULL;

UPDATE "Restaurant"
SET "district" = (SELECT "name" FROM "District" WHERE "District"."id" = "Restaurant"."districtId")
WHERE "districtId" IS NOT NULL;
