import { useCallback, useEffect, useRef, useState } from 'react';
import { createWorker, PSM } from 'tesseract.js';
import { STICKER_CODE_MAP } from '../data/stickers';
import type { Sticker } from '../types';
import {
  BookImage,
  Camera,
  CheckCircle2,
  Loader2,
  PlusCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface PageScanResult {
  team: string;       // e.g. 'RSA'
  teamLabel: string;  // e.g. 'South Africa'
  page: 1 | 2;        // 1 = slots 1-10 / 2 = slots 11-20
  /** Number NOT visible in photo → sticker pasted → user HAS it */
  pastedStickers: Sticker[];
  /** Number VISIBLE in photo → empty slot → user MISSING it */
  emptySlots: Sticker[];
  /** Pasted stickers not yet in collection → offer to add */
  newlyFound: Sticker[];
  /** Pasted stickers already in collection */
  alreadyInCollection: Sticker[];
}

// ─── Team detection helpers ───────────────────────────────────────────────────
const TEAM_ABBREVS =
  'MEX|RSA|KOR|CZE|CAN|BIH|QAT|SUI|BRA|MAR|HAI|SCO|USA|PAR|AUS|TUR|GER|CUW|CIV|ECU|NED|JPN|SWE|TUN|BEL|EGY|IRN|NZL|ESP|CPV|KSA|URU|FRA|SEN|IRQ|NOR|ARG|ALG|AUT|JOR|POR|COD|UZB|COL|ENG|CRO|GHA|PAN';

const TEAM_NAME_MAP: [RegExp, string][] = [
  [/M[EÉ]XICO|MEXICO/i,               'MEX'],
  [/SOUTH.AFRI/i,                      'RSA'],
  [/\bKOREA\b|COR[EÉ]E|COREA/i,       'KOR'],
  [/CZECH/i,                           'CZE'],
  [/CANADA/i,                          'CAN'],
  [/BOSNIA/i,                          'BIH'],
  [/QATAR|KATAR/i,                     'QAT'],
  [/SWITZERLAND|SUISSE|SCHWEIZ|SVIZZERA/i, 'SUI'],
  [/\bBRAZIL\b|\bBRASIL\b/i,          'BRA'],
  [/MOROCCO|MAROC/i,                   'MAR'],
  [/\bHAITI\b/i,                       'HAI'],
  [/SCOTLAND/i,                        'SCO'],
  [/UNITED STATES|US SOCCER/i,         'USA'],
  [/PARAGUAY/i,                        'PAR'],
  [/AUSTRALIA/i,                       'AUS'],
  [/T[UÜ]RK[IÍ]YE|TURKIYE/i,          'TUR'],
  [/GERMANY|DEUTSCH|ALLEMAGNE/i,       'GER'],
  [/CURA[CÇ]AO/i,                      'CUW'],
  [/IVORY|IVOIRE|C[OÔ]TE.D/i,         'CIV'],
  [/ECUADOR/i,                         'ECU'],
  [/NETHERLANDS|NEDERLAND|PAYS.BAS/i,  'NED'],
  [/\bJAPAN\b/i,                       'JPN'],
  [/SWEDEN|SVERIGE/i,                  'SWE'],
  [/TUNISIA|TUNISIE/i,                 'TUN'],
  [/BELGIUM|BELGIQUE|BELGI/i,          'BEL'],
  [/EGYPT|EGYPTE|[ÄA]GYPTE/i,         'EGY'],
  [/\bIRAN\b/i,                        'IRN'],
  [/NEW ZEALAND/i,                     'NZL'],
  [/\bSPAIN\b|ESPA[NÑ]A|ESPAGNE/i,    'ESP'],
  [/CAPE VERDE|CAP.VERT/i,             'CPV'],
  [/SAUDI/i,                           'KSA'],
  [/URUGUAY/i,                         'URU'],
  [/\bFRANCE\b|\bFRAN[CÇ]A\b/i,       'FRA'],
  [/SENEGAL/i,                         'SEN'],
  [/\bIRAQ\b/i,                        'IRQ'],
  [/NORWAY|NORGE/i,                    'NOR'],
  [/ARGENTINA/i,                       'ARG'],
  [/ALGERIA|ALG[EÉ]RIE/i,             'ALG'],
  [/AUSTRIA/i,                         'AUT'],
  [/\bJORDAN\b/i,                      'JOR'],
  [/PORTUGAL/i,                        'POR'],
  [/\bCONGO\b/i,                       'COD'],
  [/UZBEKISTAN/i,                      'UZB'],
  [/COLOMBIA/i,                        'COL'],
  [/\bENGLAND\b/i,                     'ENG'],
  [/CROATIA|CROATIE/i,                 'CRO'],
  [/\bGHANA\b/i,                       'GHA'],
  [/\bPANAMA\b/i,                      'PAN'],
];

function detectTeam(text: string): string | null {
  const upper = text.toUpperCase();
  // 1. "RSA 1"-style code present → most reliable
  const directRe = new RegExp(`\\b(${TEAM_ABBREVS})\\s*\\d`, 'g');
  const direct = upper.match(directRe);
  if (direct?.length) {
    const m = direct[0].match(/[A-Z]+/);
    if (m) return m[0];
  }
  // 2. Standalone abbreviation anywhere
  const abbrevRe = new RegExp(`\\b(${TEAM_ABBREVS})\\b`);
  const abbrev = upper.match(abbrevRe);
  if (abbrev) return abbrev[1];
  // 3. Full team name
  for (const [pattern, code] of TEAM_NAME_MAP) {
    if (pattern.test(text)) return code;
  }
  return null;
}

/**
 * Numbers 1-20 visible in the OCR text = empty sticker slots.
 *
 * Strategy:
 * 1. Primary — look for "{TEAM}\s*(N)" patterns (handles "RSA12", "RSA 12", "RSA\n12").
 *    These are DEFINITIVE: the slot label is visible → slot is empty.
 * 2. Secondary — standalone \b(\d{1,2})\b anywhere in text (fallback).
 *    Note: this can pick up date numbers ("11 June") so we rely on primary first.
 */
function findVisibleSlotNumbers(text: string, team: string): number[] {
  const nums = new Set<number>();
  const upper = text.toUpperCase();

  // 1. Team-prefixed slot labels (most reliable)
  const teamRe = new RegExp(`\\b${team}\\s*(\\d{1,2})\\b`, 'g');
  let m: RegExpExecArray | null;
  while ((m = teamRe.exec(upper)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 20) nums.add(n);
  }

  // 2. Standalone 1-2 digit numbers (fallback / extra coverage)
  const standaloneRe = /\b(\d{1,2})\b/g;
  while ((m = standaloneRe.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 20) nums.add(n);
  }

  return [...nums].sort((a, b) => a - b);
}

/**
 * If ANY detected number is ≥ 11, we're on page 2 (slots 11-20).
 * This is more reliable than comparing counts because false positives
 * from player jersey numbers or dates are usually ≤ 10.
 */
function determinePage(visible: number[]): { page: 1 | 2; range: number[] } {
  const max = visible.length > 0 ? Math.max(...visible) : 0;
  if (max >= 11) return { page: 2, range: Array.from({ length: 10 }, (_, i) => i + 11) };
  return             { page: 1, range: Array.from({ length: 10 }, (_, i) => i + 1) };
}

type State = 'idle' | 'processing' | 'result' | 'error';

interface Props {
  owned: Set<number>;
  onBulkAdd: (numbers: number[]) => void;
}

// ── Image preprocessing ───────────────────────────────────────────────────────
function buildPageCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const MAX_W = 1800;
  const ratio = Math.min(MAX_W / img.naturalWidth, 1);
  const W = Math.round(img.naturalWidth * ratio);
  const H = Math.round(img.naturalHeight * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.filter = 'grayscale(1) contrast(1.6)';
  ctx.drawImage(img, 0, 0, W, H);
  return canvas;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function PageScanner({ owned, onBulkAdd }: Props) {
  const workerRef     = useRef<Awaited<ReturnType<typeof createWorker>> | null>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  const [state,       setState]       = useState<State>('idle');
  const [result,      setResult]      = useState<PageScanResult | null>(null);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [added,       setAdded]       = useState(false);

  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  const getWorker = useCallback(async () => {
    if (workerRef.current) return workerRef.current;
    const worker = await createWorker('por+eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          setOcrProgress(Math.round((m.progress ?? 0) * 100));
        }
      },
    });
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    workerRef.current = worker;
    return worker;
  }, []);

  const processFile = useCallback(async (file: File) => {
    setState('processing');
    setResult(null);
    setAdded(false);
    setOcrProgress(0);
    setErrorMsg('');

    try {
      // FileReader is more reliable than createObjectURL on Android Chrome
      // after returning from the native camera app.
      const dataUrl = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res(reader.result as string);
        reader.onerror = () => rej(new Error('Falha ao ler arquivo'));
        reader.readAsDataURL(file);
      });

      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload  = () => res();
        img.onerror = () => rej(new Error('Falha ao carregar imagem'));
        img.src = dataUrl;
      });

      const canvas = buildPageCanvas(img);
      const worker = await getWorker();
      const { data } = await worker.recognize(canvas);
      const text = data.text ?? '';

      // ── Detect team ────────────────────────────────────────────────────
      const team = detectTeam(text);
      if (!team) {
        const preview = text.trim().replace(/\s+/g, ' ').slice(0, 100);
        setErrorMsg(
          `Não foi possível identificar a seleção nesta página.\nOCR leu: "${preview}…"\nCertifique-se de que o nome/sigla da seleção esteja visível na foto.`,
        );
        setState('error');
        return;
      }

      // ── Determine visible (empty) slot numbers ─────────────────────────
      // Visible number in photo = slot empty = user DOESN'T have the sticker.
      // Number NOT visible = sticker is pasted = user HAS it.
      const visibleNums = findVisibleSlotNumbers(text, team);
      const { page, range } = determinePage(visibleNums);

      const toSticker = (n: number) => STICKER_CODE_MAP.get(`${team} ${n}`);
      const pastedNums    = range.filter((n) => !visibleNums.includes(n));
      const emptySlotNums = range.filter((n) =>  visibleNums.includes(n));

      const pastedStickers     = pastedNums.map(toSticker).filter((s): s is Sticker => !!s);
      const emptyStickers      = emptySlotNums.map(toSticker).filter((s): s is Sticker => !!s);
      const newlyFound         = pastedStickers.filter((st) => !owned.has(st.number));
      const alreadyInCollection = pastedStickers.filter((st) => owned.has(st.number));
      const teamLabel          = pastedStickers[0]?.team ?? emptyStickers[0]?.team ?? team;

      setResult({ team, teamLabel, page, pastedStickers, emptySlots: emptyStickers, newlyFound, alreadyInCollection });
      setState('result');
    } catch (err) {
      console.error('[PageScanner]', err);
      setErrorMsg('Erro ao processar a imagem. Tente novamente.');
      setState('error');
    }
  }, [owned, getWorker]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) { e.target.value = ''; return; }

      // Guard: onChange AND onInput both fire on Android when a file is selected.
      // Ignore the second event to avoid two concurrent OCR runs.
      if (processingRef.current) { e.target.value = ''; return; }
      processingRef.current = true;

      processFile(file).finally(() => {
        processingRef.current = false;
        e.target.value = '';
      });
    },
    [processFile],
  );

  // ── Bulk add ──────────────────────────────────────────────────────────────
  const handleAddAll = useCallback(() => {
    if (!result) return;
    onBulkAdd(result.newlyFound.map((st) => st.number));
    setAdded(true);
  }, [result, onBulkAdd]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-zinc-950">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Idle ── */}
      {state === 'idle' && (
        <div className="flex flex-col flex-1 items-center justify-center gap-6 px-8 text-center">
          <div className="bg-zinc-900 rounded-2xl p-6">
            <BookImage size={56} className="mx-auto text-copa-yellow mb-3" />
            <h2 className="text-lg font-bold text-white mb-1">
              Escanear Página do Álbum
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Fotografe uma página. O sistema identifica quais figurinhas estão
              <strong className="text-zinc-200"> coladas</strong> (número oculto)
              e quais slots estão <strong className="text-zinc-200">vazios</strong> (número visível).
            </p>
          </div>

          <div className="bg-zinc-900 rounded-xl p-4 text-left space-y-2 w-full">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Como funciona
            </p>
            {[
              'Folha 1 da seleção → figurinhas 1 a 10',
              'Folha 2 da seleção → figurinhas 11 a 20',
              'Número visível = slot vazio (falta)',
              'Número oculto por figurinha = você tem',
              'Mantenha o celular paralelo ao álbum',
            ].map((tip) => (
              <p key={tip} className="text-xs text-zinc-300 flex gap-2">
                <span className="text-copa-green">✓</span> {tip}
              </p>
            ))}
          </div>

          <button
            onClick={() => inputRef.current?.click()}
            className="bg-copa-yellow text-zinc-900 font-bold py-4 px-10 rounded-2xl text-base active:scale-95 transition-transform flex items-center gap-2"
          >
            <Camera size={22} />
            Fotografar Página
          </button>
        </div>
      )}

      {/* ── Processing ── */}
      {state === 'processing' && (
        <div className="flex flex-col flex-1 items-center justify-center gap-4">
          <Loader2 size={48} className="animate-spin text-copa-yellow" />
          <p className="text-white font-semibold">Lendo página… {ocrProgress}%</p>
          <div className="w-56 h-2 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-copa-yellow rounded-full transition-all"
              style={{ width: `${ocrProgress}%` }}
            />
          </div>
          <p className="text-zinc-400 text-xs text-center px-8">
            Identificando números visíveis nos slots…
          </p>
        </div>
      )}

      {/* ── Result ── */}
      {state === 'result' && result && (
        <div className="scrollable flex-1 px-4 py-5 space-y-4">

          {/* Header */}
          <div className="bg-zinc-900 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 size={28} className="text-copa-yellow flex-shrink-0" />
            <div>
              <p className="font-bold text-white">{result.teamLabel} — Folha {result.page}</p>
              <p className="text-xs text-zinc-400">Figurinhas {result.page === 1 ? '1 a 10' : '11 a 20'}</p>
            </div>
          </div>

          {/* Summary counts */}
          <div className="flex gap-3">
            <div className="flex-1 bg-copa-green/10 border border-copa-green/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-copa-green">{result.pastedStickers.length}</p>
              <p className="text-[10px] text-zinc-400">coladas (você tem)</p>
            </div>
            <div className="flex-1 bg-red-900/20 border border-red-800/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-red-400">{result.emptySlots.length}</p>
              <p className="text-[10px] text-zinc-400">slots vazios (falta)</p>
            </div>
          </div>

          {/* Add to collection */}
          {result.newlyFound.length > 0 && !added && (
            <button
              onClick={handleAddAll}
              className="w-full bg-copa-green text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <PlusCircle size={20} />
              Registrar {result.newlyFound.length} figurinha{result.newlyFound.length !== 1 ? 's' : ''} colada{result.newlyFound.length !== 1 ? 's' : ''}
            </button>
          )}
          {added && (
            <div className="w-full bg-copa-green/20 border border-copa-green/40 text-copa-green font-semibold py-3 rounded-2xl text-center text-sm">
              ✓ {result.newlyFound.length} figurinha{result.newlyFound.length !== 1 ? 's' : ''} registrada{result.newlyFound.length !== 1 ? 's' : ''}!
            </div>
          )}

          {/* Pasted stickers */}
          {result.pastedStickers.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-copa-green uppercase tracking-wider mb-2">
                Coladas — você tem ({result.pastedStickers.length})
              </h3>
              <div className="space-y-1">
                {result.pastedStickers.map((st) => {
                  const isNew = result.newlyFound.some((x) => x.number === st.number) && !added;
                  return (
                    <div
                      key={st.number}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                        isNew ? 'bg-copa-green/10 border border-copa-green/20' : 'bg-zinc-900'
                      }`}
                    >
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        isNew ? 'bg-copa-green text-white' : 'bg-zinc-700 text-zinc-400'
                      }`}>
                        {st.code}
                      </span>
                      <span className={`text-sm truncate ${isNew ? 'text-zinc-200' : 'text-zinc-500'}`}>
                        {st.label}
                      </span>
                      {!isNew && <span className="ml-auto text-[10px] text-zinc-600 flex-shrink-0">já no álbum</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty slots */}
          {result.emptySlots.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                Slots vazios — faltam ({result.emptySlots.length})
              </h3>
              <div className="space-y-1">
                {result.emptySlots.map((st) => (
                  <div
                    key={st.number}
                    className="flex items-center gap-3 bg-red-900/10 border border-red-900/20 rounded-xl px-3 py-2"
                  >
                    <span className="bg-zinc-700 text-zinc-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {st.code}
                    </span>
                    <span className="text-sm text-zinc-400 truncate">{st.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pb-4">
            <button
              onClick={() => inputRef.current?.click()}
              className="flex-1 bg-copa-yellow text-zinc-900 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95"
            >
              <Camera size={18} />
              Próxima Folha
            </button>
            <button
              onClick={() => { setResult(null); setState('idle'); setAdded(false); }}
              className="flex-1 bg-zinc-800 text-zinc-300 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95"
            >
              <RefreshCw size={18} />
              Início
            </button>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {state === 'error' && (
        <div className="flex flex-col flex-1 items-center justify-center gap-5 px-8 text-center">
          <XCircle size={56} className="text-red-500" />
          <p className="text-white font-semibold whitespace-pre-line">{errorMsg}</p>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => inputRef.current?.click()}
              className="flex-1 bg-copa-yellow text-zinc-900 font-bold py-3 rounded-xl active:scale-95"
            >
              Tentar Novamente
            </button>
            <button
              onClick={() => { setState('idle'); setErrorMsg(''); }}
              className="flex-1 bg-zinc-800 text-zinc-300 font-semibold py-3 rounded-xl active:scale-95"
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
