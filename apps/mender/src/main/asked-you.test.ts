import { describe, expect, it } from 'vitest';
import { asksYou } from './asked-you';

describe('asksYou', () => {
  it('reads only the last line, bare of markdown', () => {
    expect(asksYou('Found it.\n\nWhy? Because X.\n\n**That ok to build?**\n')).toBe(true);
    expect(asksYou('Want me to do the same here?')).toBe(true);
    expect(asksYou('Two ways through.\n\n- keep it\n- say the word and I rebuild it')).toBe(true);
    expect(asksYou('Why does it fail? Because the cache is cold.\n\nFixed now.')).toBe(false);
    expect(asksYou('Done.\n\n```\nnpm run build?\n```')).toBe(false);
    expect(asksYou('')).toBe(false);
  });
});
