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

  it('reads only the last sentence of that line', () => {
    expect(asksYou('If the edge still bugged you, say so. It was like that before, so I left it.')).toBe(false);
    expect(asksYou('I left the edge alone. Want me to tighten it?')).toBe(true);
  });

  it('does not count an invitation to object', () => {
    expect(asksYou('Rebuilt and running. If you would rather keep the old one, say so.')).toBe(false);
    expect(asksYou('Rebuilt and running. Should I keep the old one too?')).toBe(true);
  });
});
