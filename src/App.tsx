import { useState } from 'react';
import type { Tab } from './types';
import { useAlbum } from './hooks/useAlbum';
import { Navigation } from './components/Navigation';
import { ProgressCard } from './components/ProgressCard';
import { AlbumView } from './components/AlbumView';
import { CameraScanner } from './components/CameraScanner';
import { AdBanner } from './components/AdBanner';
import { Loader2, WifiOff } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('progresso');
  const {
    owned,
    loading,
    error,
    retryLoad,
    toggleSticker,
    addSticker,
    totalOwned,
    totalStickers,
    progressPercent,
  } = useAlbum();

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 items-center justify-center gap-4">
        <Loader2 size={44} className="animate-spin text-copa-green" />
        <p className="text-zinc-400 text-sm">Carregando álbum…</p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 items-center justify-center gap-5 px-8 text-center">
        <WifiOff size={52} className="text-red-500" />
        <div>
          <p className="text-white font-bold text-lg mb-1">Erro de conexão</p>
          <p className="text-zinc-400 text-sm">{error}</p>
        </div>
        <button
          onClick={retryLoad}
          className="bg-copa-green text-white font-bold py-3 px-10 rounded-2xl active:scale-95 transition-transform"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-zinc-950 text-white"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Header */}
      <header className="flex-shrink-0 px-4 py-3 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/icon.svg" alt="logo" className="w-7 h-7 rounded-lg" />
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">
              FigurinhApp
            </h1>
            <p className="text-[10px] text-zinc-500 leading-tight">
              {totalOwned}/{totalStickers} figurinhas · {progressPercent}%
            </p>
          </div>
        </div>

        {/* Mini progress bar */}
        <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-copa-green rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Ad banner — below header, above content (320×50) */}
      <AdBanner
        slotId="/YOUR_NETWORK_CODE/album_copa_top"
        elementId="ad-top-banner"
        sizes={[320, 50]}
        className="h-[50px] flex-shrink-0"
      />

      {/* Content */}
      <main className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {activeTab === 'progresso' && (
          <ProgressCard
            totalOwned={totalOwned}
            progressPercent={progressPercent}
            owned={owned}
          />
        )}

        {activeTab === 'album' && (
          <AlbumView owned={owned} onToggle={toggleSticker} />
        )}

        {activeTab === 'verificar' && (
          <CameraScanner mode="verificar" owned={owned} onAdd={addSticker} />
        )}

        {activeTab === 'adicionar' && (
          <CameraScanner mode="adicionar" owned={owned} onAdd={addSticker} />
        )}
      </main>

      {/* Bottom navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
