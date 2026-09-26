import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@yemesek/database';
import { SETTING_DEFS, isSettingKey, type SettingKey } from './setting-keys';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: SettingKey): Promise<string> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key } });
    return row?.value ?? SETTING_DEFS[key].defaultValue;
  }

  async flag(key: SettingKey): Promise<boolean> {
    return (await this.get(key)) === 'true';
  }

  registrationOpen(): Promise<boolean> {
    return this.flag('registrationOpen');
  }

  reportsNeedReview(): Promise<boolean> {
    return this.flag('publicReportsNeedReview');
  }

  indexPublicReports(): Promise<boolean> {
    return this.flag('indexPublicReports');
  }

  admin2faRequired(): Promise<boolean> {
    return this.flag('admin2faRequired');
  }

  async number(key: SettingKey): Promise<number> {
    const parsed = Number(await this.get(key));
    return Number.isInteger(parsed) ? parsed : Number(SETTING_DEFS[key].defaultValue);
  }

  async listAll(): Promise<{ key: SettingKey; value: string; label: string }[]> {
    return this.rowsFor(Object.keys(SETTING_DEFS) as SettingKey[]);
  }

  async publicList(): Promise<{ key: SettingKey; value: string; label: string }[]> {
    return this.rowsFor(['indexPublicReports']);
  }

  private async rowsFor(keys: SettingKey[]): Promise<{ key: SettingKey; value: string; label: string }[]> {
    const rows = await Promise.all(
      keys.map(async (key) => ({
        key,
        value: await this.get(key),
        label: SETTING_DEFS[key].label,
      })),
    );
    return rows;
  }

  async set(key: string, value: string): Promise<{ key: SettingKey; value: string }> {
    if (!isSettingKey(key)) throw new BadRequestException('Bu ayar yok.');
    const trimmed = value.trim();
    const def = SETTING_DEFS[key] as {
      kind: string;
      allowEmpty?: boolean;
      min?: number;
      max?: number;
    };
    if (def.kind === 'boolean' && trimmed !== 'true' && trimmed !== 'false') {
      throw new BadRequestException('Bu ayar true veya false olmalı.');
    }
    if (def.kind === 'number') {
      const parsed = Number(trimmed);
      const min = def.min ?? 1;
      const max = def.max ?? 3650;
      if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        throw new BadRequestException(`Bu ayar ${min} ile ${max} arasında tam sayı olmalı.`);
      }
    }
    if (key === 'minMobileVersion' && trimmed && !/^\d+\.\d+\.\d+$/.test(trimmed)) {
      throw new BadRequestException('Sürüm 1.2.3 biçiminde olmalı.');
    }
    if ((!def.allowEmpty && trimmed.length < 1) || trimmed.length > 500) {
      throw new BadRequestException('Ayar metni 1 ile 500 karakter arasında olmalı.');
    }
    await this.prisma.siteSetting.upsert({
      where: { key },
      update: { value: trimmed },
      create: { key, value: trimmed },
    });
    return { key, value: trimmed };
  }
}
