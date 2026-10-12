/**
 * One line of what a slash or an @ opens.
 *
 * Not a row on a board. These sit by the line you are writing on, where your
 * hands already are, and they are read the way a list of things you could mean
 * is read: the name first, in the type, and what it is for after it.
 */
export type Offer = {
  /** What pressing it is heard as. */
  pick: string;
  name: string;
  about?: string;
  /** Which heading it sits under. Offers under one heading are always together. */
  section?: string;
  /** The one already chosen, for a list of choices. */
  on?: boolean;
  /** What it wants written after it, in the agent's own words. */
  takes?: string;
  /** Pressing it costs something, and it says so. */
  sore?: boolean;
  /** Fable, the dearest model, marked in its own violet before it is picked. */
  dear?: boolean;
  /** Where in the name what you typed was found, for picking out. */
  hit?: [number, number];
};

/**
 * Narrow to what matches, best first.
 *
 * Matched the way Emdash's popup matches, anywhere in the name or in what it
 * says about itself, and then ranked, because a list that merely filters puts
 * `/context` under forty skills whose descriptions happen to mention context.
 * The whole name written out wins, then a name that starts with it, then one
 * with a word in it that starts with it, then one with it anywhere, and last
 * whatever only mentions it in its description. Headings go in the order of
 * the best thing under each, so return always means the best thing there is.
 */
export function rank(
  offers: readonly Offer[],
  asked: string,
  options: { keepOrder?: boolean } = {}
): Offer[] {
  const want = asked.trim().toLowerCase();
  const scored: { offer: Offer; score: number; at: number }[] = [];
  offers.forEach((offer, at) => {
    const score = scoreOf(offer, want);
    if (score === null) return;
    const bare = offer.name.replace(/^\/+/, '').toLowerCase();
    const found = want ? bare.indexOf(want) : -1;
    const lead = offer.name.length - bare.length;
    scored.push({
      offer: found >= 0 ? { ...offer, hit: [lead + found, lead + found + want.length] } : offer,
      score: options.keepOrder && want === '' ? 0 : score,
      at,
    });
  });

  const best = new Map<string, number>();
  for (const one of scored) {
    const section = one.offer.section ?? '';
    best.set(section, Math.min(best.get(section) ?? Infinity, one.score));
  }
  const firstSeen = new Map<string, number>();
  for (const one of scored) {
    const section = one.offer.section ?? '';
    if (!firstSeen.has(section)) firstSeen.set(section, one.at);
  }
  const sectionOf = (one: { offer: Offer }): string => one.offer.section ?? '';

  return scored
    .sort(
      (a, b) =>
        (best.get(sectionOf(a)) ?? 0) - (best.get(sectionOf(b)) ?? 0) ||
        (firstSeen.get(sectionOf(a)) ?? 0) - (firstSeen.get(sectionOf(b)) ?? 0) ||
        a.score - b.score ||
        a.at - b.at
    )
    .map((one) => one.offer);
}

function scoreOf(offer: Offer, want: string): number | null {
  if (!want) return 0;
  const name = offer.name.replace(/^\/+/, '').toLowerCase();
  if (name === want) return 0;
  if (name.startsWith(want)) return 1;
  if (name.split(/[\s\-_:./]+/).some((word) => word.startsWith(want))) return 2;
  if (name.includes(want)) return 3;
  if (offer.about?.toLowerCase().includes(want)) return 4;
  return null;
}
