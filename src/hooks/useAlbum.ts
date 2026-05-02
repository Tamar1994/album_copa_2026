import { useCallback, useEffect, useState } from 'react';
import { TOTAL_STICKERS } from '../data/stickers';

export function useAlbum() {
  const [owned, setOwned] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlbum = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('/api/album')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ ownedStickers: number[] }>;
      })
      .then((data) => setOwned(new Set(data.ownedStickers)))
      .catch((err: Error) =>
        setError(err.message || 'Erro ao conectar com o servidor'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAlbum();
  }, [fetchAlbum]);

  const hasSticker = useCallback((num: number) => owned.has(num), [owned]);

  const addSticker = useCallback((num: number) => {
    setOwned((prev) => {
      if (prev.has(num)) return prev;
      const next = new Set(prev);
      next.add(num);
      return next;
    });
    fetch('/api/album/sticker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: num }),
    }).catch(console.error);
  }, []);

  const removeSticker = useCallback((num: number) => {
    setOwned((prev) => {
      if (!prev.has(num)) return prev;
      const next = new Set(prev);
      next.delete(num);
      return next;
    });
    fetch(`/api/album/sticker/${num}`, { method: 'DELETE' }).catch(console.error);
  }, []);

  const toggleSticker = useCallback((num: number) => {
    setOwned((prev) => {
      const next = new Set(prev);
      if (next.has(num)) {
        next.delete(num);
        fetch(`/api/album/sticker/${num}`, { method: 'DELETE' }).catch(console.error);
      } else {
        next.add(num);
        fetch('/api/album/sticker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: num }),
        }).catch(console.error);
      }
      return next;
    });
  }, []);

  const bulkAddStickers = useCallback((numbers: number[]) => {
    setOwned((prev) => {
      const next = new Set(prev);
      numbers.forEach((n) => next.add(n));
      return next;
    });
    fetch('/api/album/stickers/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numbers }),
    }).catch(console.error);
  }, []);

  const progressPercent = Math.round((owned.size / TOTAL_STICKERS) * 100);

  return {
    owned,
    loading,
    error,
    retryLoad: fetchAlbum,
    hasSticker,
    addSticker,
    removeSticker,
    toggleSticker,
    bulkAddStickers,
    totalOwned: owned.size,
    totalStickers: TOTAL_STICKERS,
    progressPercent,
  };
}

