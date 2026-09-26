import { Prisma, type PrismaClient } from '@prisma/client';
import { placeKey } from '@yemesek/shared';

export type CanonicalLocation = {
  cityId: string;
  districtId: string;
  city: string;
  district: string;
  cityKey: string;
};

function isUnique(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function findOrCreateLocation(
  prisma: PrismaClient,
  cityRaw: string,
  districtRaw: string,
): Promise<CanonicalLocation> {
  const cityPlace = placeKey(cityRaw);
  const districtPlace = placeKey(districtRaw);
  if (cityPlace.name.length < 2) {
    throw new Error('Şehir en az 2 karakter olmalı.');
  }
  if (districtPlace.name.length < 2) {
    throw new Error('İlçe en az 2 karakter olmalı.');
  }

  let city = await prisma.city.findUnique({ where: { key: cityPlace.key } });
  if (!city) {
    try {
      city = await prisma.city.create({ data: { name: cityPlace.name, key: cityPlace.key } });
    } catch (error) {
      if (!isUnique(error)) throw error;
      city = await prisma.city.findUnique({ where: { key: cityPlace.key } });
    }
  }
  if (!city) throw new Error('Şehir kaydedilemedi.');

  const districtWhere = { cityId_key: { cityId: city.id, key: districtPlace.key } };
  let district = await prisma.district.findUnique({ where: districtWhere });
  if (!district) {
    try {
      district = await prisma.district.create({
        data: { cityId: city.id, name: districtPlace.name, key: districtPlace.key },
      });
    } catch (error) {
      if (!isUnique(error)) throw error;
      district = await prisma.district.findUnique({ where: districtWhere });
    }
  }
  if (!district) throw new Error('İlçe kaydedilemedi.');

  return {
    cityId: city.id,
    districtId: district.id,
    city: city.name,
    district: district.name,
    cityKey: city.key,
  };
}
