import { expect, it } from 'vitest';
import { DICTS } from '../src/i18n';

it('Italian and English have the same keys and placeholders', () => {
  expect(Object.keys(DICTS.en).sort()).toEqual(Object.keys(DICTS.it).sort());
  const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  for (const k of Object.keys(DICTS.it) as (keyof typeof DICTS.it)[]) {
    expect(vars(DICTS.en[k]), k).toBe(vars(DICTS.it[k]));
    expect(DICTS.en[k].trim(), k).not.toBe('');
  }
});
