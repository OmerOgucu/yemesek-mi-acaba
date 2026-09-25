const VOTER_KEY = 'yemesek.voter';
const VOTED_KEY = 'yemesek.voted';

export function getVoterKey(): string {
  const existing = localStorage.getItem(VOTER_KEY);
  if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(VOTER_KEY, created);
  return created;
}

export function hasVoted(reportId: string): boolean {
  return readVoted().includes(reportId);
}

export function rememberVote(reportId: string): void {
  const voted = readVoted();
  if (!voted.includes(reportId)) {
    voted.push(reportId);
    localStorage.setItem(VOTED_KEY, JSON.stringify(voted));
  }
}

function readVoted(): string[] {
  try {
    const raw = localStorage.getItem(VOTED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
