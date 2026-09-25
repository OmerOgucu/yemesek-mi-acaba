-- Existing complaints have no photo or receipt. SQLite cannot fill those required
-- columns from the old rows, so this migration drops complaint rows. Restaurants
-- stay. `pnpm db:seed` writes them again with placeholder evidence.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
DELETE FROM "Vote";
DELETE FROM "Report";
CREATE TABLE "new_Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "nickname" TEXT NOT NULL DEFAULT 'anonim',
    "photoUrls" JSONB NOT NULL,
    "receiptUrl" TEXT NOT NULL,
    "evidenceVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
DROP TABLE "Report";
ALTER TABLE "new_Report" RENAME TO "Report";
CREATE INDEX "Report_restaurantId_createdAt_idx" ON "Report"("restaurantId", "createdAt");
CREATE INDEX "Report_authorId_idx" ON "Report"("authorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
