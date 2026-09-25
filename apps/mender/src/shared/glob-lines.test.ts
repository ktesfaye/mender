import { describe, expect, it } from 'vitest';
import { parseGlobLines } from './glob-lines';

describe('parseGlobLines', () => {
  it('reads one glob a line, skipping blanks and comments', () => {
    expect(parseGlobLines(['*.log', '', '# a note', '  dist/**  '].join('\n'))).toEqual([
      '*.log',
      'dist/**',
    ]);
  });
});
