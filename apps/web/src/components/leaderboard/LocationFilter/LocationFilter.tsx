'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export function LocationFilter({
  locations,
  q,
  city,
  district,
}: {
  locations: { city: string; districts: string[] }[];
  q?: string;
  city?: string;
  district?: string;
}) {
  const [selectedCity, setSelectedCity] = useState(city ?? '');
  const [selectedDistrict, setSelectedDistrict] = useState(district ?? '');
  const districts = useMemo(
    () => locations.find((location) => location.city === selectedCity)?.districts ?? [],
    [locations, selectedCity],
  );

  return (
    <form action="/" className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="sr-only" htmlFor="city">
        Şehir
      </label>
      <select
        id="city"
        name="city"
        value={selectedCity}
        onChange={(event) => {
          setSelectedCity(event.target.value);
          setSelectedDistrict('');
        }}
        className="field sm:max-w-52"
      >
        <option value="">Tüm şehirler</option>
        {locations.map((location) => (
          <option key={location.city} value={location.city}>
            {location.city}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="district">
        İlçe
      </label>
      <select
        id="district"
        name="district"
        value={selectedDistrict}
        onChange={(event) => setSelectedDistrict(event.target.value)}
        className="field sm:max-w-52"
      >
        <option value="">Tüm ilçeler</option>
        {districts.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="q">
        Ara
      </label>
      <input id="q" name="q" defaultValue={q ?? ''} placeholder="Hangi mekanı merak ediyorsun?" maxLength={60} className="field" />
      <button className="btn btn-primary" type="submit">
        Süz
      </button>
      {q || city || district ? (
        <Link href="/" className="text-sm underline decoration-chili underline-offset-4">
          Süzgeci temizle
        </Link>
      ) : null}
    </form>
  );
}
