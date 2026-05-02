import type { Sticker } from '../types';
import { Star } from 'lucide-react';

interface Props {
  sticker: Sticker;
  owned: boolean;
  onToggle: (num: number) => void;
}

export function StickerCard({ sticker, owned, onToggle }: Props) {
  return (
    <button
      onClick={() => onToggle(sticker.number)}
      className={`relative flex flex-col items-center justify-between rounded-xl p-2 text-center transition-all active:scale-95 select-none ${
        owned
          ? 'bg-copa-green/20 border border-copa-green/50'
          : 'bg-zinc-900 border border-zinc-800'
      }`}
    >
      {/* Special badge */}
      {sticker.isSpecial && (
        <span className="absolute -top-1.5 -right-1.5 z-10">
          <Star
            size={14}
            className="fill-copa-yellow text-copa-yellow drop-shadow"
          />
        </span>
      )}

      {/* Sticker number */}
      <span
        className={`text-[10px] font-bold mb-0.5 px-1.5 py-0.5 rounded-full ${
          owned ? 'bg-copa-green text-white' : 'bg-zinc-800 text-zinc-400'
        }`}
      >
        {sticker.code}
      </span>

      {/* Description */}
      <span
        className={`text-[9px] leading-tight ${
          owned ? 'text-white' : 'text-zinc-500'
        }`}
      >
        {sticker.team ? (
          <>
            <span className="block font-semibold text-[9px] text-zinc-300 truncate max-w-full">
              {sticker.team}
            </span>
            {sticker.label}
          </>
        ) : (
          sticker.label
        )}
      </span>

      {/* Owned indicator */}
      <div
        className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${
          owned ? 'bg-copa-green' : 'bg-zinc-700'
        }`}
      />
    </button>
  );
}
