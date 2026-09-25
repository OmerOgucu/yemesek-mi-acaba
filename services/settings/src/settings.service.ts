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

  async publicList(): Promise<{ key: SettingKey; value: string; label: string }[]> {
    const keys = Object.keys(SETTING_DEFS) as SettingKey[];
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
    const def = SETTING_DEFS[key];
    if (def.kind === 'boolean' && trimmed !== 'true' && trimmed !== 'false') {
      throw new BadRequestException('Bu ayar true veya false olmalı.');
    }
    if (trimmed.length < 1 || trimmed.length > 500) {
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
