-- Session generation. Incrementing this invalidates access tokens immediately,
-- including tokens issued in the same second as a revoke.
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
