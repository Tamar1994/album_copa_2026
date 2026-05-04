import { useCallback, useEffect, useRef, useState } from 'react';
import { STICKER_CODE_MAP } from '../data/stickers';
import type { Sticker } from '../types';
import {
  Camera,
  CheckCircle2,
  Hash,
  Loader2,
  RefreshCw,
  Star,
  XCircle,
} from 'lucide-react';

interface Props {
  /** 'verificar' = check if owned for trade; 'adicionar' = register sticker */
  mode: 'verificar' | 'adicionar';
  owned: Set<number>;
  onAdd: (num: number) => void;
  onAddMany?: (nums: number[]) => void;
  token: string | null;
}

type ScanState =
  | 'idle'
  | 'requesting-camera'
  | 'ready'
  | 'scanning'
  | 'result'
  | 'error';

interface ScanResult {
  sticker: Sticker;
  alreadyOwned: boolean;
  rawText: string;
}

// ─── Image preprocessing helpers ─────────────────────────────────────────────
/**
 * Crop to the badge zone in the upper-right of the sticker guide box.
 * The guide box is 75 % wide × 60 % tall, centred in the frame.
 * The badge ("FWC 10", "RSA 1", …) is always in the upper-right corner
 * of the sticker, occupying roughly the right 40 % × top 28 % of the guide.
 *
 *  Frame:  ┌────────────────────────────┐
 *          │  12.5%          75%        │
 *          │  ┌──────────────────────┐  │  ← guide top (20 % from top)
 *          │  │              ┌──────┐│  │
 *          │  │              │badge ││  │  ← upper-right 40 % × 28 %
 *          │  │              └──────┘│  │
 *          │  │                     │  │
 *          │  └──────────────────────┘  │  ← guide bottom (80 % from top)
 *          └────────────────────────────┘
 *
 * Using a narrow ROI removes all the face/kit noise that surrounds the badge.
 * High contrast (4×) acts as a soft binariser so both badge variants work:
 *   – dark badge / white text  → invert pass
 *   – white badge / black text → normal pass
 */
function preprocessCanvas(src: HTMLVideoElement): HTMLCanvasElement {
  const vw = src.videoWidth;
  const vh = src.videoHeight;

  // Guide box: 75 % wide × 60 % tall, centred
  const guideX = vw * 0.125;
  const guideY = vh * 0.20;
  const guideW = vw * 0.75;
  const guideH = vh * 0.60;

  // Badge zone: right 40 % × top 28 % of the guide box
  const cropX = Math.round(guideX + guideW * 0.60);
  const cropY = Math.round(guideY);
  const cropW = Math.round(guideW * 0.40);
  const cropH = Math.round(guideH * 0.28);

  // Scale up to 640 px wide so small text becomes legible
  const outW = 640;
  const outH = Math.round((outW / cropW) * cropH);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  // Light sharpening only — Vision API reads both dark and light badges natively
  ctx.filter = 'grayscale(1) contrast(1.8) brightness(1.05)';
  ctx.drawImage(src, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
  return canvas;
}

/**
 * Common single-character OCR substitutions.
 * Returns the original string plus every 1-character-fix variant.
 */
function ocrVariants(s: string): string[] {
  const fixes: Record<string, string> = {
    '0': 'O', 'O': '0',
    '1': 'I', 'I': '1', 'L': '1',
    '5': 'S', 'S': '5',
    '8': 'B', 'B': '8',
    '6': 'G', 'G': '6',
  };
  const out = new Set<string>([s]);
  for (let i = 0; i < s.length; i++) {
    const alt = fixes[s[i]];
    if (alt) out.add(s.slice(0, i) + alt + s.slice(i + 1));
  }
  return [...out];
}

/**
 * Extract a sticker code from a single OCR text string.
 * Handles: "RSA 1", "RSA1", "MEX 5", "CC2", "00"
 * Applies fuzzy fixes (0↔O, 1↔I/L, 5↔S, 8↔B, 6↔G) on each token.
 */
function extractStickerCode(text: string): string | null {
  const upper = text.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  // Special case: bare "00"
  if (/\b00\b/.test(upper) && STICKER_CODE_MAP.has('00')) return '00';

  // Match letter group (2-3 chars) + optional space + digit group (1-2 chars)
  const re = /\b([A-Z0-9]{2,3})\s*([0-9]{1,2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(upper)) !== null) {
    for (const lv of ocrVariants(m[1])) {
      for (const dv of ocrVariants(m[2])) {
        const withSpace = `${lv} ${dv}`;
        const noSpace   = `${lv}${dv}`;
        if (STICKER_CODE_MAP.has(withSpace)) return withSpace;
        if (STICKER_CODE_MAP.has(noSpace))   return noSpace;
      }
    }
  }
  return null;
}

/**
 * Extract ALL valid sticker codes from text (for page scan mode).
 * Returns unique codes found, preserving first-found order.
 */
function extractAllStickerCodes(text: string): string[] {
  const upper = text.toUpperCase().replace(/[^A-Z0-9 \n]/g, ' ').replace(/\s+/g, ' ');
  const found = new Set<string>();

  // Special case: bare "00"
  if (/\b00\b/.test(upper) && STICKER_CODE_MAP.has('00')) found.add('00');

  const re = /\b([A-Z0-9]{2,3})\s*([0-9]{1,2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(upper)) !== null) {
    let added = false;
    for (const lv of ocrVariants(m[1])) {
      if (added) break;
      for (const dv of ocrVariants(m[2])) {
        const withSpace = `${lv} ${dv}`;
        const noSpace   = `${lv}${dv}`;
        if (STICKER_CODE_MAP.has(withSpace)) { found.add(withSpace); added = true; break; }
        if (STICKER_CODE_MAP.has(noSpace))   { found.add(noSpace);   added = true; break; }
      }
    }
  }
  return [...found];
}

/**
 * Capture full frame (with small margin) for page scanning.
 * Scaled to 1280 px wide — wide enough to read many sticker badges at once.
 */
function preprocessPageCanvas(src: HTMLVideoElement): HTMLCanvasElement {
  const vw = src.videoWidth;
  const vh = src.videoHeight;

  // 4 % margin on each side to avoid lens distortion at the edges
  const cropX = Math.round(vw * 0.04);
  const cropY = Math.round(vh * 0.04);
  const cropW = Math.round(vw * 0.92);
  const cropH = Math.round(vh * 0.92);

  const outW = 1280;
  const outH = Math.round((outW / cropW) * cropH);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  ctx.filter = 'grayscale(1) contrast(1.6) brightness(1.05)';
  ctx.drawImage(src, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
  return canvas;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function CameraScanner({ mode, owned, onAdd, onAddMany, token }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isScanning = useRef(false);

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanMode, setScanMode] = useState<'single' | 'page'>('single');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [pageFound, setPageFound] = useState<Array<{ code: string; sticker: import('../types').Sticker; alreadyOwned: boolean }>>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);

  // ── Teardown ─────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  // ── Start camera ─────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setScanState('requesting-camera');
    setResult(null);
    setShowManual(false);
    setManualCode('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;

      // Set srcObject BEFORE changing state so the <video> element (always
      // in the DOM) receives the stream immediately, avoiding the black screen
      // on Android Chrome that happens when the element is conditionally mounted.
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {
          // Autoplay policy may reject on some browsers – that's OK,
          // the video will still display frames once it starts.
        });
      }

      setScanState('ready');
    } catch (err) {
      console.error(err);
      setErrorMsg(
        'Não foi possível acessar a câmera. Verifique as permissões do navegador.',
      );
      setScanState('error');
    }
  }, []);

  // ── Capture & OCR — triggered only by user tap on “Capturar” ──────────────────
  const capture = useCallback(async () => {
    if (!videoRef.current || isScanning.current) return;
    isScanning.current = true;
    setScanState('scanning');
    setErrorMsg('');

    try {
      // Crop badge zone and encode as JPEG base64
      const canvas = preprocessCanvas(videoRef.current);
      const base64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];

      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (!res.ok) throw new Error(`OCR ${res.status}`);

      const { text } = await res.json() as { text: string };
      const code = extractStickerCode(text ?? '');
      console.log('[Vision OCR]', JSON.stringify(text?.trim()), '→', code);

      if (code !== null) {
        const sticker = STICKER_CODE_MAP.get(code)!;
        setResult({ sticker, alreadyOwned: owned.has(sticker.number), rawText: text.trim() });
        setScanState('result');
      } else {
        setErrorMsg('Código não identificado. Ajuste a posição e tente novamente.');
        setScanState('ready');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao processar. Verifique a sua ligação.');
      setScanState('ready');
    } finally {
      isScanning.current = false;
    }
  }, [token, owned]);

  // ── Manual lookup ────────────────────────────────────────────────────────
  const handleManualSubmit = useCallback(() => {
    const raw = manualCode.trim().toUpperCase();
    if (!raw) return;
    // Normalize: letters + optional space + digits → try with and without space
    const normalized = raw.replace(/^([A-Z]+)\s*(\d+)$/, (_, letters, digits) =>
      letters === 'CC' ? `${letters}${digits}` : `${letters} ${digits}`,
    );
    const sticker = STICKER_CODE_MAP.get(normalized) ?? STICKER_CODE_MAP.get(raw);
    if (!sticker) {
      setErrorMsg(`Figurinha "${raw}" não encontrada no álbum.`);
      return;
    }
    setErrorMsg('');
    setResult({ sticker, alreadyOwned: owned.has(sticker.number), rawText: raw });
    setScanState('result');
  }, [manualCode, owned]);

  // ── Page scan OCR ────────────────────────────────────────────────────────
  const capturePageOCR = useCallback(async () => {
    if (!videoRef.current || isScanning.current) return;
    isScanning.current = true;
    setScanState('scanning');
    setErrorMsg('');

    try {
      const canvas = preprocessPageCanvas(videoRef.current);
      const base64 = canvas.toDataURL('image/jpeg', 0.90).split(',')[1];

      const res = await fetch('/api/ocr/page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (!res.ok) throw new Error(`OCR ${res.status}`);

      const { text } = await res.json() as { text: string };
      const codes = extractAllStickerCodes(text ?? '');
      console.log('[Vision OCR-page] texto:', JSON.stringify(text?.slice(0, 200)), '→ códigos:', codes);

      if (codes.length > 0) {
        const found = codes.map((code) => {
          const sticker = STICKER_CODE_MAP.get(code)!;
          return { code, sticker, alreadyOwned: owned.has(sticker.number) };
        });
        setPageFound(found);
        setScanState('result');
      } else {
        setErrorMsg('Nenhuma figurinha identificada. Ajuste o enquadramento e tente novamente.');
        setScanState('ready');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao processar. Verifique a sua ligação.');
      setScanState('ready');
    } finally {
      isScanning.current = false;
    }
  }, [token, owned]);

  // ── Action (add) ─────────────────────────────────────────────────────────
  const handleAddSticker = useCallback(() => {
    if (!result) return;
    onAdd(result.sticker.number);
    setResult((prev) => prev && { ...prev, alreadyOwned: true });
  }, [result, onAdd]);

  const reset = useCallback(() => {
    setResult(null);
    setPageFound([]);
    setShowManual(false);
    setManualCode('');
    setErrorMsg('');
    setScanState('ready');
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const isVerify = mode === 'verificar';

  // Whether the camera viewport should be visible
  const cameraActive =
    scanState === 'requesting-camera' ||
    scanState === 'ready' ||
    scanState === 'scanning';

  return (
    <div className="flex flex-col flex-1 min-h-0 relative bg-black">

      {/* ── Idle screen ── */}
      {scanState === 'idle' && (
        <div className="flex flex-col flex-1 items-center justify-center gap-6 px-8 text-center">
          <div className="bg-zinc-900 rounded-2xl p-6">
            <Camera size={56} className="mx-auto text-copa-green mb-3" />
            <h2 className="text-lg font-bold text-white mb-1">
              {isVerify ? 'Verificar Figurinha' : 'Adicionar Figurinha'}
            </h2>
            <p className="text-sm text-zinc-400">
              {isVerify
                ? 'Aponte a câmera para o verso da figurinha. O sistema irá verificar se você já a possui.'
                : 'Aponte a câmera para o verso da figurinha para registrá-la na sua coleção.'}
            </p>
          </div>
          <button
            onClick={startCamera}
            className="bg-copa-green text-white font-bold py-4 px-10 rounded-2xl text-base active:scale-95 transition-transform"
          >
            Abrir Câmera
          </button>
          <button
            onClick={() => { setScanState('ready'); setShowManual(true); }}
            className="text-zinc-400 text-sm underline"
          >
            Inserir número manualmente
          </button>
        </div>
      )}

      {/*
        The <video> element is ALWAYS in the DOM.
        This is critical on Android Chrome: assigning srcObject before the
        element is mounted causes a silent black screen even though the
        camera indicator light turns on.
        We control visibility with CSS only.
      */}
      <div className={`flex flex-col flex-1 relative ${cameraActive ? '' : 'hidden'}`}>        <div className="relative flex-1 bg-black overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />

          {/* Loading overlay while stream is initialising */}
          {scanState === 'requesting-camera' && (
            <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-3">
              <Loader2 size={36} className="animate-spin text-copa-green" />
              <p className="text-zinc-400 text-sm">Iniciando câmera…</p>
            </div>
          )}

          {/* Guide overlay */}
          {scanState === 'ready' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Semi-dark vignette so the sticker pops */}
              <div className="absolute inset-0 bg-black/35" />

              {scanMode === 'single' ? (
                /* Single sticker guide */
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[75%] h-[60%] border-2 border-white/50 rounded-lg relative">
                    <span className="absolute -top-5 left-0 right-0 text-center text-[10px] text-white font-semibold">
                      Encaixe a figurinha aqui
                    </span>
                    <div className="absolute top-0 right-0 w-[40%] h-[28%] border-2 border-copa-yellow rounded-tr-md">
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-copa-yellow -translate-x-0.5 -translate-y-0.5" />
                      <span className="absolute -top-4 right-0 text-[9px] text-copa-yellow font-bold whitespace-nowrap">
                        código ↗
                      </span>
                    </div>
                    <span className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-white/60">
                      Toque em “Capturar” quando pronto
                    </span>
                  </div>
                </div>
              ) : (
                /* Page guide */
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[92%] h-[92%] border-2 border-copa-yellow rounded-lg relative">
                    <span className="absolute -top-5 left-0 right-0 text-center text-[10px] text-copa-yellow font-semibold">
                      Fotografe uma ou duas páginas de figurinhas
                    </span>
                    <span className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-white/60">
                      Toque em “Capturar” quando pronto
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scanning overlay — shown while Vision API is processing */}
          {scanState === 'scanning' && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 pointer-events-none">
              <Loader2 size={44} className="animate-spin text-copa-green" />
              <p className="text-white font-semibold text-sm">
                {scanMode === 'page' ? 'Identificando figurinhas na página…' : 'Identificando figurinha…'}
              </p>
            </div>
          )}

        </div>

        {/* Controls */}
        <div className="flex-shrink-0 bg-zinc-950 px-4 pt-4 pb-safe space-y-3">
          {/* Mode toggle — only in 'adicionar' mode */}
          {mode === 'adicionar' && (
            <div className="flex bg-zinc-800 rounded-xl p-1 gap-1">
              <button
                onClick={() => setScanMode('single')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${scanMode === 'single' ? 'bg-copa-green text-white' : 'text-zinc-400'}`}
              >
                Figurinha
              </button>
              <button
                onClick={() => setScanMode('page')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${scanMode === 'page' ? 'bg-copa-green text-white' : 'text-zinc-400'}`}
              >
                Página
              </button>
            </div>
          )}
          {/* Error message from last scan attempt */}
          {errorMsg && !showManual && (
            <p className="text-red-400 text-xs text-center">{errorMsg}</p>
          )}
          {/* Manual entry */}
          {showManual && (
            <div className="bg-zinc-900 rounded-xl p-3">
              <p className="text-xs text-zinc-400 mb-2">
                Não reconhecido. Digite o código (ex: MEX 5, FWC 3):
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  placeholder="Ex: MEX 5, FWC 3, CC2"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-copa-green"
                />
                <button
                  onClick={handleManualSubmit}
                  className="bg-copa-green text-white px-4 rounded-lg font-semibold text-sm"
                >
                  <Hash size={18} />
                </button>
              </div>
              {errorMsg && (
                <p className="text-red-400 text-xs mt-1">{errorMsg}</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => { stopCamera(); setScanState('idle'); }}
              disabled={scanState === 'scanning'}
              className="bg-zinc-800 text-zinc-300 rounded-xl p-3 active:scale-95 transition-transform disabled:opacity-40"
            >
              <XCircle size={22} />
            </button>

            <button
              onClick={scanMode === 'page' ? capturePageOCR : capture}
              disabled={scanState === 'scanning'}
              className="flex-1 py-4 rounded-2xl font-bold text-base transition-transform active:scale-95 flex items-center justify-center gap-2 bg-copa-green text-white disabled:opacity-60 disabled:scale-100"
            >
              {scanState === 'scanning' ? (
                <><Loader2 size={20} className="animate-spin" /> Processando…</>
              ) : (
                <><Camera size={20} /> Capturar</>
              )}
            </button>

            <button
              onClick={() => setShowManual((v) => !v)}
              disabled={scanState === 'scanning'}
              className="bg-zinc-800 text-zinc-300 rounded-xl p-3 active:scale-95 transition-transform disabled:opacity-40"
            >
              <Hash size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Result ── */}
      {scanState === 'result' && result && scanMode === 'single' && (
        <div className="flex flex-col flex-1 items-center justify-center px-6 gap-5">
          {/* Status icon */}
          {isVerify ? (
            result.alreadyOwned ? (
              <CheckCircle2 size={72} className="text-copa-green" />
            ) : (
              <XCircle size={72} className="text-zinc-500" />
            )
          ) : result.alreadyOwned ? (
            <CheckCircle2 size={72} className="text-copa-yellow" />
          ) : (
            <CheckCircle2 size={72} className="text-copa-green" />
          )}

          {/* Sticker info card */}
          <div className="w-full bg-zinc-900 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-copa-green text-white text-xs font-bold px-2 py-1 rounded-full">
                #{result.sticker.number}
              </span>
              <span className="text-xs text-zinc-400">{result.sticker.code}</span>
              {result.sticker.isSpecial && (
                <Star size={14} className="fill-copa-yellow text-copa-yellow ml-auto" />
              )}
            </div>

            {result.sticker.team && (
              <p className="font-bold text-white">{result.sticker.team}</p>
            )}
            <p className="text-zinc-300 text-sm">{result.sticker.label}</p>
            <p className="text-zinc-500 text-xs">
              Seção: {result.sticker.section}
              {result.sticker.group ? ` · Grupo ${result.sticker.group}` : ''}
            </p>
          </div>

          {/* Status message */}
          <div
            className={`w-full text-center py-3 rounded-xl font-semibold text-sm ${
              isVerify
                ? result.alreadyOwned
                  ? 'bg-copa-green/20 text-copa-green border border-copa-green/40'
                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                : result.alreadyOwned
                ? 'bg-copa-yellow/20 text-copa-yellow border border-copa-yellow/40'
                : 'bg-copa-green/20 text-copa-green border border-copa-green/40'
            }`}
          >
            {isVerify
              ? result.alreadyOwned
                ? '✓ Você já possui esta figurinha (pode trocar!)'
                : '✗ Você não possui esta figurinha'
              : result.alreadyOwned
              ? '⚠ Você já tem esta figurinha cadastrada'
              : '✓ Figurinha adicionada à sua coleção!'}
          </div>

          {/* Action buttons */}
          <div className="w-full flex flex-col gap-3">
            {mode === 'adicionar' && !result.alreadyOwned && (
              <button
                onClick={handleAddSticker}
                className="w-full bg-copa-green text-white font-bold py-4 rounded-2xl text-base active:scale-95 transition-transform"
              >
                Confirmar Adição
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 bg-zinc-800 text-zinc-300 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <RefreshCw size={18} />
                Nova Leitura
              </button>
              <button
                onClick={() => { stopCamera(); setScanState('idle'); setResult(null); }}
                className="flex-1 bg-zinc-800 text-zinc-300 font-semibold py-3 rounded-xl active:scale-95 transition-transform"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page result ── */}
      {scanState === 'result' && scanMode === 'page' && pageFound.length > 0 && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="flex-shrink-0 px-4 pt-4 pb-2 bg-zinc-950 border-b border-zinc-800">
            <p className="text-white font-bold text-base">
              {pageFound.length} figurinha{pageFound.length > 1 ? 's' : ''} encontrada{pageFound.length > 1 ? 's' : ''}
            </p>
            <p className="text-zinc-400 text-xs mt-0.5">
              {pageFound.filter((f) => !f.alreadyOwned).length} nova{pageFound.filter((f) => !f.alreadyOwned).length !== 1 ? 's' : ''} ·{' '}
              {pageFound.filter((f) => f.alreadyOwned).length} já possu{pageFound.filter((f) => f.alreadyOwned).length === 1 ? 'o' : 'o'}
            </p>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
            {pageFound.map(({ code, sticker, alreadyOwned }) => (
              <div
                key={code}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${alreadyOwned ? 'bg-zinc-800/60' : 'bg-copa-green/10 border border-copa-green/30'}`}
              >
                <span className={`text-lg ${alreadyOwned ? 'text-zinc-500' : 'text-copa-green'}`}>
                  {alreadyOwned ? '✓' : '＋'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    {sticker.team ?? sticker.label}
                  </p>
                  <p className="text-zinc-400 text-xs">{sticker.code}</p>
                </div>
                <span className="text-xs text-zinc-500 flex-shrink-0">#{sticker.number}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex-shrink-0 bg-zinc-950 px-4 py-4 space-y-2 border-t border-zinc-800">
            {mode === 'adicionar' && pageFound.some((f) => !f.alreadyOwned) && (
              <button
                onClick={() => {
                  const newNums = pageFound.filter((f) => !f.alreadyOwned).map((f) => f.sticker.number);
                  onAddMany?.(newNums);
                  setPageFound((prev) => prev.map((f) => ({ ...f, alreadyOwned: true })));
                }}
                className="w-full bg-copa-green text-white font-bold py-4 rounded-2xl text-base active:scale-95 transition-transform"
              >
                Adicionar {pageFound.filter((f) => !f.alreadyOwned).length} nova{pageFound.filter((f) => !f.alreadyOwned).length !== 1 ? 's' : ''}
              </button>
            )}
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 bg-zinc-800 text-zinc-300 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <RefreshCw size={18} /> Nova Leitura
              </button>
              <button
                onClick={() => { stopCamera(); setScanState('idle'); setPageFound([]); }}
                className="flex-1 bg-zinc-800 text-zinc-300 font-semibold py-3 rounded-xl active:scale-95 transition-transform"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {scanState === 'error' && (
        <div className="flex flex-col flex-1 items-center justify-center gap-5 px-8 text-center">
          <XCircle size={56} className="text-red-500" />
          <p className="text-white font-semibold">{errorMsg}</p>
          <button
            onClick={() => setScanState('idle')}
            className="bg-zinc-800 text-zinc-300 font-semibold py-3 px-8 rounded-xl"
          >
            Voltar
          </button>
        </div>
      )}
    </div>
  );
}
