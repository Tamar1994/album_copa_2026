import { ALBUM_SECTIONS, TOTAL_STICKERS } from '../data/stickers';

interface Props {
  totalOwned: number;
  progressPercent: number;
  owned: Set<number>;
}

export function ProgressCard({ totalOwned, progressPercent, owned }: Props) {
  const totalSpecial = ALBUM_SECTIONS.flatMap((s) => s.stickers).filter(
    (st) => st.isSpecial,
  ).length;

  // Stats per section
  const sectionStats = ALBUM_SECTIONS.map((s) => {
    const sectionOwned = s.stickers.filter((st) => owned.has(st.number)).length;
    return {
      title: s.title,
      total: s.stickers.length,
      owned: sectionOwned,
      percent: Math.round((sectionOwned / s.stickers.length) * 100),
    };
  });

  // Radius for the arc
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="scrollable flex-1 px-4 py-5 space-y-5">
      {/* Progress ring */}
      <div className="flex flex-col items-center">
        <div className="relative w-44 h-44">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="#27272a"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="#009c3b"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold text-white">
              {progressPercent}%
            </span>
            <span className="text-xs text-zinc-400 mt-0.5">completo</span>
          </div>
        </div>

        <div className="mt-3 flex gap-6 text-center">
          <div>
            <p className="text-2xl font-bold text-copa-green">{totalOwned}</p>
            <p className="text-xs text-zinc-400">tenho</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-300">
              {TOTAL_STICKERS - totalOwned}
            </p>
            <p className="text-xs text-zinc-400">faltam</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-copa-yellow">{totalSpecial}</p>
            <p className="text-xs text-zinc-400">especiais</p>
          </div>
        </div>
      </div>

      {/* Per-section progress */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Por Seção
        </h2>
        {sectionStats.map(({ title, total, owned: sOwned, percent }) => (
          <div key={title} className="bg-zinc-900 rounded-xl px-4 py-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-zinc-200 truncate flex-1 mr-2">
                {title}
              </span>
              <span className="text-xs text-zinc-500 flex-shrink-0">
                {sOwned}/{total}
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-copa-green rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
