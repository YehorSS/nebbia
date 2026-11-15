import { WALK, setById, type Set } from './data';

const pick = (ids: string[]) => ids.map(setById).filter((s): s is Set => !!s).sort((a, b) => a.start - b.start || a.end - b.end);

/** Ids of chosen sets that play at the same time as another chosen set. */
export function clashes(ids: string[]): globalThis.Set<string> {
  const list = pick(ids), out = new globalThis.Set<string>();
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++)
      if (list[j].night === list[i].night && list[j].start < list[i].end && list[i].start < list[j].end) { out.add(list[i].id); out.add(list[j].id); }
  return out;
}

export interface Step {
  from: string;
  to: string;
  walk: number;
  /** when you leave the first set, in the night's minutes */
  leave: number;
  /** minutes of the first set you miss by leaving early */
  missFrom: number;
  /** minutes of the second set you miss by arriving late */
  missTo: number;
}

/** The walk from each chosen set to the next one on the same night, and what it costs. */
export function route(ids: string[]): Step[] {
  const list = pick(ids), out: Step[] = [];
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1], b = list[i];
    if (a.night !== b.night) continue;
    const walk = WALK[a.stage][b.stage];
    const leave = Math.max(a.start, Math.min(a.end, b.start - walk));
    out.push({ from: a.id, to: b.id, walk, leave, missFrom: a.end - leave, missTo: Math.max(0, leave + walk - b.start) });
  }
  return out;
}

export const encodePlan = (ids: string[]) => ids.join(',');
export const decodePlan = (s: string) => s.split(',').filter(id => id && setById(id));
