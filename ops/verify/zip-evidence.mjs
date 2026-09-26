import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const ALLOWED = new Set(['evidence.json', 'runtime-evidence.json']);

export function readZipEvidence(zipBuffer) {
  if (!Buffer.isBuffer(zipBuffer) || zipBuffer.length === 0 || zipBuffer.length > 2_000_000) {
    throw new Error('arşiv boyutu geçersiz');
  }
  const dir = mkdtempSync(path.join(tmpdir(), 'yemesek-evidence-'));
  try {
    const zipPath = path.join(dir, 'evidence.zip');
    writeFileSync(zipPath, zipBuffer, { mode: 0o600 });
    const listed = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
    const names = listed.split('\n').map((line) => line.trim()).filter(Boolean);
    if (names.length === 0 || names.length > 5) throw new Error('arşiv girdisi geçersiz');
    const out = {};
    for (const name of names) {
      if (name.startsWith('/') || name.includes('..') || name.includes('\\') || !ALLOWED.has(path.basename(name))) {
        throw new Error('arşiv girdisi geçersiz');
      }
      const body = execFileSync('unzip', ['-p', zipPath, name], { maxBuffer: 2_000_000 });
      out[path.basename(name)] = body.toString('utf8');
    }
    return out;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
