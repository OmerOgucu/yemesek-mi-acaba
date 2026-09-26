import type { PrismaService } from '@yemesek/database';

export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.cleanupJob.deleteMany();
  await prisma.mailJob.deleteMany();
  await prisma.rateBucket.deleteMany();
  await prisma.adminInvite.deleteMany();
  await prisma.userBlock.deleteMany();
  await prisma.evidenceObject.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.appeal.deleteMany();
  await prisma.contentFlag.deleteMany();
  await prisma.reportReply.deleteMany();
  await prisma.restaurantClaim.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.recoveryCode.deleteMany();
  await prisma.pushToken.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.emailVerification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.district.deleteMany();
  await prisma.city.deleteMany();
  await prisma.user.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.siteSetting.deleteMany();
  await prisma.siteContent.deleteMany();
}
