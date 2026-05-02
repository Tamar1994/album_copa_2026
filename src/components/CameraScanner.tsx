import { useCallback, useEffect, useRef, useState } from 'react';
import { createWorker, PSM } from 'tesseract.js';
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
}

type ScanState =
  | 'idle'
  | 'requesting-camera'
  | 'ready'
  | 'result'
  | 'error';

interface ScanResult {
  sticker: Sticker;
  alreadyOwned: boolean;
  rawText: string;
}

// ─── Image preprocessing helpers ─────────────────────────────────────────────
/**
 * Crop to the guide-box region (70 % wide × 30 % tall, centred) then
 * scale up to 640 px wide and apply sharpening filters.
 * Processing only the small ROI removes background noise (player faces,
 * kit colours) that confuses Tesseract.
 */
function preprocessCanvas(src: HTMLVideoElement): HTMLCanvasElement {
  const vw = src.videoWidth;
  const vh = src.videoHeight;

  // Crop region — matches the 70 % × 30 % yellow box in the UI
  const cropW = Math.round(vw * 0.70);
  const cropH = Math.round(vh * 0.30);
  const cropX = Math.round((vw - cropW) / 2);
  const cropY = Math.round((vh - cropH) / 2);

  // Scale up to 640 px wide so small text becomes legible
  const outW = 640;
  const outH = Math.round((outW / cropW) * cropH);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;
  ctx.filter = 'grayscale(1) contrast(2.5) brightness(1.2)';
  ctx.drawImage(src, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
  return canvas;
}

/**
 * Return a pixel-inverted copy of a canvas.
 * Tesseract reads black-on-white better; sticker codes are often
 * white-on-dark, so this gives a second chance.
 */
function invertCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const inv = document.createElement('canvas');
  inv.width = src.width;
  inv.height = src.height;
  const ctx = inv.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  const d = ctx.getImageData(0, 0, inv.width, inv.height);
  for (let i = 0; i < d.data.length; i += 4) {
    d.data[i]     = 255 - d.data[i];
    d.data[i + 1] = 255 - d.data[i + 1];
    d.data[i + 2] = 255 - d.data[i + 2];
  }
  ctx.putImageData(d, 0, 0);
  return inv;
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

// ─── Component ───────────────────────────────────────────────────────────────
export function CameraScanner({ mode, owned, onAdd }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Awaited<ReturnType<typeof createWorker>> | null>(null);

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);

  // Refs for silent background scanning
  const isScanning = useRef(false);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Teardown ─────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      workerRef.current?.terminate();
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, [stopCamera]);

  // captureRef: always points to the latest capture fn (avoids stale closure in timer)
  const captureRef = useRef<() => void>(() => {});

  // Start the silent scan loop when camera is ready
  useEffect(() => {
    if (scanState !== 'ready' || showManual) {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      return;
    }
    scanTimerRef.current = setTimeout(() => captureRef.current(), 600);
    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, [scanState, showManual]);

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

      // Init Tesseract worker — PSM 7 = single text line (ideal for short codes)
      if (!workerRef.current) {
        const worker = await createWorker('eng', 1, {});
        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
          tessedit_pageseg_mode: PSM.SINGLE_LINE, // single text line
        });
        workerRef.current = worker;
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

  // ── Capture & OCR (runs silently in background) ─────────────────────────
  const capture = useCallback(async () => {
    if (!videoRef.current || !workerRef.current || isScanning.current) return;
    isScanning.current = true;

    try {
      const canvas = preprocessCanvas(videoRef.current);
      const worker = workerRef.current;

      // Single pass — PSM 7 reads one line; whitelist limits noise
      const { data } = await worker.recognize(canvas);
      const raw = data.text ?? '';
      let code = extractStickerCode(raw);
      console.log('[OCR normal]', JSON.stringify(raw.trim()), '→', code);

      // Retry inverted (white-on-dark codes like some RSA/BRA labels)
      if (code === null) {
        const inv = invertCanvas(canvas);
        const { data: data2 } = await worker.recognize(inv);
        code = extractStickerCode(data2.text ?? '');
        console.log('[OCR invertido]', JSON.stringify((data2.text ?? '').trim()), '→', code);
      }

      if (code !== null) {
        const sticker = STICKER_CODE_MAP.get(code)!;
        setResult({ sticker, alreadyOwned: owned.has(sticker.number), rawText: raw.trim() });
        setScanState('result');
      } else {
        scanTimerRef.current = setTimeout(() => captureRef.current(), 700);
      }
    } catch (err) {
      console.error(err);
      scanTimerRef.current = setTimeout(() => captureRef.current(), 1000);
    } finally {
      isScanning.current = false;
    }
  }, [owned]);

  // Keep captureRef in sync with the latest capture closure
  useEffect(() => { captureRef.current = capture; }, [capture]);

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

  // ── Action (add) ─────────────────────────────────────────────────────────
  const handleAddSticker = useCallback(() => {
    if (!result) return;
    onAdd(result.sticker.number);
    setResult((prev) => prev && { ...prev, alreadyOwned: true });
  }, [result, onAdd]);

  const reset = useCallback(() => {
    setResult(null);
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
    scanState === 'ready';

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
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[70%] h-[30%] border-2 border-copa-yellow rounded-lg relative">
                <span className="absolute -top-5 left-0 right-0 text-center text-[10px] text-copa-yellow font-semibold">
                  Posicione o código aqui
                </span>
                {/* Subtle pulsing dot — scanning happens silently in background */}
                <span className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-copa-yellow">
                  <span className="inline-block w-2 h-2 rounded-full bg-copa-yellow animate-pulse mr-1" />
                  Escaneando…
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Controls */}
        <div className="flex-shrink-0 bg-zinc-950 px-4 pt-4 pb-safe space-y-3">
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
              className="bg-zinc-800 text-zinc-300 rounded-xl p-3 active:scale-95 transition-transform"
            >
              <XCircle size={22} />
            </button>

            <button
              onClick={capture}
              className="flex-1 py-4 rounded-2xl font-bold text-base transition-transform active:scale-95 flex items-center justify-center gap-2 bg-copa-green text-white"
            >
              <Camera size={20} />
              Capturar
            </button>

            <button
              onClick={() => setShowManual((v) => !v)}
              className="bg-zinc-800 text-zinc-300 rounded-xl p-3 active:scale-95 transition-transform"
            >
              <Hash size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Result ── */}
      {scanState === 'result' && result && (
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
