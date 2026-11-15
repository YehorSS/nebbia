import { describe, expect, it } from 'vitest';
import { NIGHTS, SETS, STAGES, WALK, setById } from '../src/data';
import { clashes, decodePlan, encodePlan, route } from '../src/plan';

const id = (night: string, name: string) => SETS.find(s => s.night === night && s.name === name)!.id;

describe('line-up data', () => {
  it('has no overlapping sets on one stage, and every set sits inside its night', () => {
    for (const n of NIGHTS) for (const st of STAGES) {
      const list = SETS.filter(s => s.night === n.id && s.stage === st.id).sort((a, b) => a.start - b.start);
      for (const s of list) { expect(s.start).toBeGreaterThanOrEqual(n.open); expect(s.end).toBeLessThanOrEqual(n.close); expect(s.end).toBeGreaterThan(s.start); }
      for (let i = 1; i < list.length; i++) expect(list[i].start, list[i].name).toBeGreaterThanOrEqual(list[i - 1].end);
    }
  });
  it('walks are symmetric', () => {
    for (const a of STAGES) for (const b of STAGES) expect(WALK[a.id][b.id]).toBe(WALK[b.id][a.id]);
  });
  it('gives each artist one set', () => {
    expect(new Set(SETS.map(s => s.name)).size).toBe(SETS.length);
  });
});

describe('my plan', () => {
  it('finds sets playing at the same time', () => {
    // Saturday: Kassia Dorn 01:30–03:30 at Gasometro, Pianura 3 00:30–02:30 at Forno
    const k = id('sab', 'Kassia Dorn'), p = id('sab', 'Pianura 3'), t = id('sab', 'Ottone');
    expect(clashes([k, p, t])).toEqual(new Set([k, p]));
    expect(clashes([id('sab', 'Greta Molar'), id('sab', 'Sektor Nord')]).size).toBe(0);
  });

  it('counts the walk and what you miss on each side', () => {
    // Pianura 3 ends 02:30 at Forno; Kassia Dorn started 01:30 at Gasometro, 4 minutes away
    const steps = route([id('sab', 'Kassia Dorn'), id('sab', 'Pianura 3')]);
    expect(steps).toHaveLength(1);
    const s = steps[0];
    expect(setById(s.from)!.name).toBe('Pianura 3');
    expect(s.walk).toBe(4);
    expect(s.leave).toBe(25 * 60 + 26);       // 01:26, so you are at Gasometro at 01:30
    expect(s.missFrom).toBe(64);              // 01:26 → 02:30 of Pianura 3
    expect(s.missTo).toBe(0);
  });

  it('back-to-back sets on far stages cost the walk at the start of the next one', () => {
    const steps = route([id('ven', 'Ferro Dolce'), id('ven', 'Dalia Voss')]);
    // Ferro Dolce 00:00–02:00 Gasometro, Dalia Voss 01:30–04:00 Binario, 9 minutes away
    expect(steps[0].leave).toBe(24 * 60 + 81);
    expect(steps[0].missFrom).toBe(39);
    expect(steps[0].missTo).toBe(0);
    const gap = route([id('ven', 'Livia Sas'), id('ven', 'Valvola')]);
    // Livia Sas 22:00–00:00, Valvola 23:00 at Binario: leave 22:51
    expect(gap[0].leave).toBe(22 * 60 + 51);
  });

  it('a set started before the previous one even began is left at once', () => {
    // Ambra Silo 18:00 Gasometro, Elio Brusa 18:30 Forno: you leave at 18:26, arrive 18:30
    const s = route([id('dom', 'Ambra Silo'), id('dom', 'Elio Brusa')])[0];
    expect(s.leave).toBe(18 * 60 + 26);
    const t = route([id('dom', 'Ponte Bianco'), id('dom', 'Elio Brusa')])[0];
    // Elio Brusa 18:30 Forno first, Ponte Bianco 19:00 Binario 6 min away
    expect(setById(t.from)!.name).toBe('Elio Brusa');
    expect(t.leave).toBe(18 * 60 + 54);
  });

  it('on the same stage there is no walk', () => {
    const s = route([id('ven', 'Livia Sas'), id('ven', 'Ferro Dolce')])[0];
    expect(s.walk).toBe(0);
    expect(s.missFrom + s.missTo).toBe(0);
  });

  it('round-trips a plan through the share link and drops unknown ids', () => {
    const ids = [id('sab', 'Kassia Dorn'), id('ven', 'Anodo')];
    expect(decodePlan(encodePlan(ids))).toEqual(ids);
    expect(decodePlan('sab2,zzz9,,ven5')).toEqual(['sab2', 'ven5']);
    expect(decodePlan('')).toEqual([]);
  });
});
