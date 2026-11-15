// The festival is invented for a portfolio demo; the place and its history are real.

export type StageId = 'gasometro' | 'forno' | 'binario';
export type NightId = 'ven' | 'sab' | 'dom';

export interface Stage { id: StageId; name: string }
export interface Night { id: NightId; date: string; open: number; close: number }
export interface Set {
  id: string;
  night: NightId;
  stage: StageId;
  /** minutes from midnight of the night's date; after midnight goes past 1440 */
  start: number;
  end: number;
  name: string;
  genre: string;
  top?: boolean;
}

export const STAGES: Stage[] = [
  { id: 'gasometro', name: 'Gasometro' },
  { id: 'forno', name: 'Forno' },
  { id: 'binario', name: 'Binario' },
];

/** Minutes on foot between stages, along the lit paths of the site. */
export const WALK: Record<StageId, Record<StageId, number>> = {
  gasometro: { gasometro: 0, forno: 4, binario: 9 },
  forno: { gasometro: 4, forno: 0, binario: 6 },
  binario: { gasometro: 9, forno: 6, binario: 0 },
};

export const NIGHTS: Night[] = [
  { id: 'ven', date: '2027-01-22', open: 22 * 60, close: 30 * 60 },
  { id: 'sab', date: '2027-01-23', open: 22 * 60, close: 30 * 60 },
  { id: 'dom', date: '2027-01-24', open: 18 * 60, close: 26 * 60 },
];

// times before noon belong to the morning after
const m = (hm: string) => { const [h, mm] = hm.split(':').map(Number); return (h < 12 ? h + 24 : h) * 60 + mm; };

type Row = [StageId, string, string, string, string, 1?];
const LINEUP: Record<NightId, Row[]> = {
  ven: [
    ['gasometro', '22:00', '00:00', 'Livia Sas', 'house'],
    ['gasometro', '00:00', '02:00', 'Ferro Dolce', 'techno'],
    ['gasometro', '02:00', '04:00', 'Orsola Brina', 'techno', 1],
    ['gasometro', '04:00', '06:00', 'Teo Ruggine', 'techno'],
    ['forno', '22:30', '01:00', 'Marta Cenere', 'electro'],
    ['forno', '01:00', '03:30', 'Anodo', 'live', 1],
    ['forno', '03:30', '06:00', 'Lume Basso', 'acid'],
    ['binario', '23:00', '01:30', 'Valvola', 'breaks'],
    ['binario', '01:30', '04:00', 'Dalia Voss', 'electro'],
    ['binario', '04:00', '06:00', 'Navile', 'ambient'],
  ],
  sab: [
    ['gasometro', '22:00', '00:00', 'Greta Molar', 'house'],
    ['gasometro', '00:00', '01:30', 'Sektor Nord', 'techno'],
    ['gasometro', '01:30', '03:30', 'Kassia Dorn', 'techno', 1],
    ['gasometro', '03:30', '06:00', 'Bruno Fosco', 'techno'],
    ['forno', '22:30', '00:30', 'Irene Lupa', 'electro'],
    ['forno', '00:30', '02:30', 'Pianura 3', 'live', 1],
    ['forno', '02:30', '04:30', 'Sirena 1930', 'acid'],
    ['forno', '04:30', '06:00', 'Ottone', 'house'],
    ['binario', '23:00', '01:00', 'Gasdotto', 'breaks'],
    ['binario', '01:00', '03:00', 'Carbone Club', 'electro'],
    ['binario', '03:00', '06:00', 'Tessa Grau', 'ambient'],
  ],
  dom: [
    ['gasometro', '18:00', '20:00', 'Ambra Silo', 'ambient'],
    ['gasometro', '20:00', '22:00', 'Juno Ferrante', 'house'],
    ['gasometro', '22:00', '00:00', 'Vela Nera', 'techno', 1],
    ['gasometro', '00:00', '02:00', 'Brina & Ferro', 'techno'],
    ['forno', '18:30', '21:00', 'Elio Brusa', 'live'],
    ['forno', '21:00', '23:30', 'Kilowatt Madre', 'live', 1],
    ['forno', '23:30', '02:00', 'Nadia K.', 'acid'],
    ['binario', '19:00', '21:30', 'Ponte Bianco', 'ambient'],
    ['binario', '21:30', '02:00', 'Mezzanotte Rossa', 'breaks'],
  ],
};

export const SETS: Set[] = (Object.keys(LINEUP) as NightId[]).flatMap(night =>
  LINEUP[night].map(([stage, a, b, name, genre, top], i) => ({
    id: `${night}${i}`, night, stage, start: m(a), end: m(b), name, genre, ...(top ? { top: true } : {}),
  })));

export const setById = (id: string) => SETS.find(s => s.id === id);
export const hm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
