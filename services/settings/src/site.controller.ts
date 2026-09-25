import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '@yemesek/database';
import { ModerationService } from '@yemesek/moderation';
import { SettingsService } from './settings.service';

const DEFAULT_GUIDELINES = `Yemesek bir şikayet tahtasıdır, mahkeme değildir.

- Hakaret, tehdit ve kişisel veri yazma.
- Fotoğraf ve fiş olmadan şikayet açılmaz.
- Aynı mekanı çoğaltma; var olan kayda yaz.
- İşletme, onaylı sahiplikten sonra yanıt yazabilir.
- Gizlenen kayda itiraz edebilirsin.`;

class SupportDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsEmail()
  @MaxLength(120)
  email!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(120)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  body!: string;
}

@Controller()
export class SiteController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly moderation: ModerationService,
  ) {}

  @Get('site/maintenance')
  async maintenance() {
    return { active: await this.settings.flag('maintenanceMode') };
  }

  @Get('content/guidelines')
  async guidelines() {
    const row = await this.prisma.siteContent.findUnique({ where: { key: 'community_guidelines' } });
    return { body: row?.body || DEFAULT_GUIDELINES };
  }

  @Get('transparency')
  async transparency() {
    const [hiddenReports, verifiedEvidence, withdrawnReports] = await Promise.all([
      this.prisma.report.count({ where: { hidden: true } }),
      this.prisma.report.count({ where: { receiptUrl: { not: '' }, withdrawnAt: null } }),
      this.prisma.report.count({ where: { withdrawnAt: { not: null } } }),
    ]);
    return { hiddenReports, verifiedEvidence, withdrawnReports };
  }

  @Get('press')
  async press() {
    const [email, name, legalEmail] = await Promise.all([
      this.settings.get('pressEmail'),
      this.settings.get('pressName'),
      this.settings.get('legalEmail'),
    ]);
    return { email, name, legalEmail };
  }

  @Post('support')
  async support(@Body() dto: SupportDto) {
    const issues = this.moderation.collect([{ value: dto.name }, { value: dto.subject }, { value: dto.body }]);
    if (issues.length) throw new BadRequestException({ message: issues });
    await this.prisma.supportTicket.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        subject: dto.subject.trim(),
        body: dto.body.trim(),
      },
    });
    const supportEmail = await this.settings.get('supportEmail');
    console.info(`[support] ticket stored for ${supportEmail}`);
    return { ok: true };
  }
}
