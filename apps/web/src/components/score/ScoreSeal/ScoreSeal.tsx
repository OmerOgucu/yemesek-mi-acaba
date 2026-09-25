const TONE: Record<string, string> = {
  'Uzak dur': 'border-chili-dark bg-chili text-card',
  Kaçın: 'border-chili bg-card text-chili',
  Şüpheli: 'border-amber bg-card text-amber',
  Fısıltı: 'border-ink/40 bg-card text-ink',
  'Temiz sayfa': 'border-moss bg-card text-moss',
};

export function ScoreSeal({ score, label }: { score: number; label: string }) {
  const tone = TONE[label] ?? 'border-ink bg-card text-ink';
  return (
    <div
      className={`grid h-20 w-20 shrink-0 -rotate-6 place-items-center rounded-full border-2 border-dashed text-center ${tone}`}
      aria-label={`Kötülük skoru ${score}, ${label}`}
    >
      <span>
        <span className="block font-display text-2xl leading-none font-semibold">{score}</span>
        <span className="mt-0.5 block text-[10px] tracking-wide uppercase">{label}</span>
      </span>
    </div>
  );
}
