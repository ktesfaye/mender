import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createPlan,
  faultIn,
  moved,
  type DistrictSpec,
  type SubdistrictSpec,
} from '@mender/village';
import { describe, expect, it } from 'vitest';

const read = (name: string): unknown =>
  JSON.parse(readFileSync(join(__dirname, '../../assets/village', name), 'utf8'));
const plan = createPlan((read('districts.json') as { districts: DistrictSpec[] }).districts);
const pieces = (read('subdistricts.json') as { pieces: SubdistrictSpec[] }).pieces;
const full = new Map(
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'B2'].map((place) => [`p${place}`, place])
);
const fault = (arrangement: Map<string, string>): string | null =>
  faultIn(plan, pieces, arrangement, (who) => who);

describe('moving a project', () => {
  it('swaps with whoever already stands there', () => {
    const after = moved(full, 'pC', { kind: 'to', place: 'K' });
    expect([after.get('pC'), after.get('pK')]).toEqual(['K', 'C']);
    expect(fault(after)).toBeNull();
  });

  it('refuses to strand anybody from the fire', () => {
    expect(fault(moved(full, 'pA', { kind: 'off' }))).toMatch(/would be left out at sea/);
  });

  it('refuses a piece with nobody on the rest of its district', () => {
    expect(fault(moved(full, 'pB', { kind: 'to', place: 'D2' }))).toMatch(/hay farm/);
  });
});
