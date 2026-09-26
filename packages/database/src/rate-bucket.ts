import type { PrismaService } from './prisma.service';

export async function consumeBucket(
  prisma: Pick<PrismaService, '$queryRaw'>,
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  const rows = await prisma.$queryRaw<{ hits: number }[]>`
    INSERT INTO "RateBucket" ("key", "hits", "windowStart", "updatedAt")
    VALUES (${key}, 1, ${now}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "hits" = CASE
        WHEN "RateBucket"."windowStart" < ${windowStart} THEN 1
        ELSE "RateBucket"."hits" + 1
      END,
      "windowStart" = CASE
        WHEN "RateBucket"."windowStart" < ${windowStart} THEN ${now}
        ELSE "RateBucket"."windowStart"
      END,
      "updatedAt" = ${now}
    RETURNING "hits"
  `;
  return Number(rows[0]?.hits ?? max + 1) <= max;
}
