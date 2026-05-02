import { useMemo, useState } from 'react';
import { ALBUM_SECTIONS } from '../data/stickers';
import type { AlbumFilter } from '../types';
import { StickerCard } from './StickerCard';
import { Search } from 'lucide-react';

interface Props {
  owned: Set<number>;
  onToggle: (num: number) => void;
}

const FILTER_LABELS: { id: AlbumFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'tenho', label: 'Tenho' },
  { id: 'faltam', label: 'Faltam' },
];

export function AlbumView({ owned, onToggle }: Props) {
  const [filter, setFilter] = useState<AlbumFilter>('todos');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return ALBUM_SECTIONS.map((section) => {
      const stickers = section.stickers.filter((st) => {
        if (filter === 'tenho' && !owned.has(st.number)) return false;
        if (filter === 'faltam' && owned.has(st.number)) return false;
        if (query) {
          return (
            st.code.toLowerCase().includes(query) ||
            st.label.toLowerCase().includes(query) ||
            (st.team?.toLowerCase().includes(query) ?? false) ||
            String(st.number).includes(query)
          );
        }
        return true;
      });
      return { ...section, stickers };
    }).filter((s) => s.stickers.length > 0);
  }, [filter, search, owned]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Sticky header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 space-y-3 bg-zinc-950">
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="search"
            placeholder="Buscar figurinha, time, código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-copa-green"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2">
          {FILTER_LABELS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === id
                  ? 'bg-copa-green text-white'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable album */}
      <div className="scrollable flex-1 px-4 pb-4 space-y-6">
        {filtered.length === 0 && (
          <p className="text-center text-zinc-500 mt-10 text-sm">
            Nenhuma figurinha encontrada.
          </p>
        )}

        {filtered.map((section) => {
          const sectionOwned = section.stickers.filter((st) =>
            owned.has(st.number),
          ).length;
          return (
            <div key={section.id}>
              {/* Section header */}
              <div className="flex items-center justify-between mb-3 sticky top-0 bg-zinc-950 py-1 z-10">
                <h2 className="text-sm font-bold text-zinc-200">
                  {section.title}
                </h2>
                <span className="text-xs text-zinc-500">
                  {sectionOwned}/{section.stickers.length}
                </span>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-3 gap-2">
                {section.stickers.map((st) => (
                  <StickerCard
                    key={st.number}
                    sticker={st}
                    owned={owned.has(st.number)}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
