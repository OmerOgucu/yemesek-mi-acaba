'use client';

import { useEffect, useState } from 'react';
import { ApiError, getJson } from '@/lib/api/client';
import { readSession } from '@/components/auth/session/session';

type Ops = {
  status: string;
  uptime: number;
  maintenance: boolean;
  mailConfigured: boolean;
  minMobileVersion: string;
  minIosBuild: number;
  minAndroidBuild: number;
};

export function OpsStatus() {
  const [data, setData] = useState<Ops | null>(null);
  const [error, setError] = useState('');
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (readSession()?.user.role !== 'ADMIN') {
      setError('Bu sayfa yalnızca yöneticiye açık.');
      return;
    }
    setAllowed(true);
    void getJson<Ops>('/admin/ops', true)
      .then(setData)
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Durum alınamadı.'));
  }, []);

  if (error) return <p className="text-chili">{error}</p>;
  if (!allowed || !data) return <p className="text-muted">Durum yükleniyor…</p>;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-4xl font-semibold">Durum</h1>
      <ul className="mt-6 space-y-2 rounded-2xl border border-line bg-card p-4 text-sm">
        <li>API: {data.status === 'ok' ? 'ayakta' : 'bilinmiyor'}</li>
        <li>Çalışma süresi: {data.uptime} sn</li>
        <li>Bakım: {data.maintenance ? 'açık' : 'kapalı'}</li>
        <li>E-posta gönderici: {data.mailConfigured ? 'yapılandırılmış' : 'yapılandırılmamış'}</li>
        <li>En düşük mobil sürüm: {data.minMobileVersion || 'yok'}</li>
        <li>En düşük iOS build: {data.minIosBuild}</li>
        <li>En düşük Android build: {data.minAndroidBuild}</li>
      </ul>
    </div>
  );
}
