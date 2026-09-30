import { describe, expect, it } from 'vitest';
import { pictured } from './pictures';

describe('pictured', () => {
  it('lifts every picture out of the writing and keeps the words', () => {
    expect(
      pictured('Try ![**Beignets**](https://x.com/b.jpg) at Café du Monde ![](<https://x.com/c.png> "t")')
    ).toEqual({
      text: 'Try at Café du Monde',
      pictures: [
        { name: 'Beignets', url: 'https://x.com/b.jpg' },
        { name: '', url: 'https://x.com/c.png' },
      ],
    });
  });
});
