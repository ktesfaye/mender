import { expect, test } from 'vitest';
import { newer } from './updates';

test('a later version is newer by number, not by text', () => {
  expect(newer('0.72.0', '0.71.9')).toBe(true);
  expect(newer('0.10.0', '0.9.0')).toBe(true);
  expect(newer('0.71.0', '0.71.0')).toBe(false);
  expect(newer('0.70.12', '0.71.0')).toBe(false);
});
