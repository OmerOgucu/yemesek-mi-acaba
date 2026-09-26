'use client';

import { useRouter } from 'next/navigation';
import { writeIntroSeen } from './intro-storage';

export function IntroDone() {
  const router = useRouter();

  function goHome() {
    writeIntroSeen();
    router.push('/');
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn btn-primary" onClick={goHome}>
        Listeye geç
      </button>
      <button type="button" className="btn btn-ghost" onClick={goHome}>
        Atla
      </button>
    </div>
  );
}
