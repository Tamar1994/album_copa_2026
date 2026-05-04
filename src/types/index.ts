export interface Sticker {
  /** Internal sequential ID used in the database (0-based) */
  number: number;
  /** Short code displayed in the album, e.g. "FWC 3", "A-5" */
  code: string;
  /** Section / chapter in the album */
  section: string;
  /** Human-readable label */
  label: string;
  /** Team this sticker belongs to (if applicable) */
  team?: string;
  /** Team name in Portuguese */
  teamPt?: string;
  /** Group letter (A-L) */
  group?: string;
  /** Foil / special sticker */
  isSpecial: boolean;
}

export interface Section {
  id: string;
  title: string;
  stickers: Sticker[];
}

export type Tab = 'progresso' | 'album' | 'verificar' | 'adicionar';

export type AlbumFilter = 'todos' | 'tenho' | 'faltam';
