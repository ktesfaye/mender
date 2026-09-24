import { describe, expect, it } from 'vitest';
import { rank } from './offer';

describe('rank', () => {
  it('puts the whole name first, then prefixes, then words, then descriptions', () => {
    const names = rank(
      [
        { pick: 'a', name: '/brain', about: 'context aware', section: 's' },
        { pick: 'b', name: '/update-config', section: 'c' },
        { pick: 'c', name: '/context', section: 'c' },
        { pick: 'd', name: '/config', section: 'c' },
        { pick: 'e', name: '/xconfy', section: 'c' },
      ],
      'con'
    ).map((one) => one.pick);
    expect(names).toEqual(['c', 'd', 'b', 'e', 'a']);
  });
});
