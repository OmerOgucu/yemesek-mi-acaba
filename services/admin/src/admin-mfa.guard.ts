import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '@yemesek/database';
import { SettingsService } from '@yemesek/settings';
import type { AuthUser } from '@yemesek/auth';

@Injectable()
export class AdminMfaGuard implements CanActivate {
  constructor(
    private readonly settings: SettingsService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user || user.role !== 'ADMIN') return true;
    if (!(await this.settings.admin2faRequired())) return true;
    const row = await this.prisma.user.findUnique({ where: { id: user.id }, select: { totpEnabledAt: true } });
    if (!row?.totpEnabledAt) {
      throw new ForbiddenException('Yönetici için iki adımlı doğrulama gerekli.');
    }
    if (!user.mfa) {
      throw new ForbiddenException('Bu oturumda iki adımlı doğrulama yok. Çıkıp yeniden gir.');
    }
    return true;
  }
}
