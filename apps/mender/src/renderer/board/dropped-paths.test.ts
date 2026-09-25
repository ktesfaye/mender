import { describe, expect, it } from 'vitest';
import { escapeShellPath, pastedPaths } from './dropped-paths';

describe('escapeShellPath', () => {
  it('escapes spaces and shell metacharacters so the path stays one token', () => {
    expect(escapeShellPath("/a dir/it's a $file.txt")).toBe("/a\\ dir/it\\'s\\ a\\ \\$file.txt");
  });
});

describe('pastedPaths', () => {
  it('wraps the escaped, space-joined paths and keeps the trailing space inside the markers', () => {
    expect(pastedPaths(['/a b', '/c'])).toBe('\x1b[200~/a\\ b /c \x1b[201~');
  });
});
