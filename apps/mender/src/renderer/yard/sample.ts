/**
 * The designs' own session, as a value.
 *
 * Exactly what the handoff draws, word for word, so the yard can be put on
 * screen and held up against the design before anything is wired to the wire.
 * It exists to be deleted: the moment a real session feeds the same shape,
 * nothing should import this outside the harness.
 */

import { KIT_NAMES } from './sprite';
import type { Yard } from './what';

export const SAMPLE: Yard = {
  project: {
    id: 'nola',
    name: 'New Orleans',
    where: '~/code/nola',
    on: 'slideshow/nola',
    health: 'ok',
    going: '64h 15m',
    turns: 51,
    spawned: 3,
  },
  session: {
    id: 'nola-photos',
    name: 'nola-photos',
    branch: 'claude/one-photo-per-dish',
    agent: 'claude',
    model: 'sonnet 4.5',
    room: 0.68,
    permissions: 'bypass permissions on',
    fire: 'lit',
    olderNotes: 9,
    olderThoughts: 38,
    olderSteps: { many: 44, over: 'first 62 hours' },
    notes: [
      {
        id: 'n1',
        when: '4m ago',
        answered: false,
        said: "Wait — you need to show me pictures. The foods they're best known for.",
      },
      {
        id: 'n2',
        when: '2h ago',
        answered: true,
        said: "Cut anything where the wait is over an hour. We're not standing in line.",
      },
      {
        id: 'n3',
        when: 'day one',
        answered: true,
        standing: true,
        said: "Oct 3–5, three of us, food-focused. Not a big fan of seafood. Money's not a problem. Don't book anything — I'll do that myself.",
      },
    ],
    plan: [
      { said: 'pull twenty-odd candidates out of the local press', state: 'done' },
      { said: 'verify Sat/Sun/Mon service on each one', state: 'done' },
      { said: 'cut anything seafood-forward', state: 'doing' },
      { said: 'cluster what survives by neighbourhood', state: 'ahead' },
      { said: 'hand you one page per day', state: 'ahead' },
    ],
    thoughts: [
      {
        id: 't1',
        when: 'yesterday, 6pm',
        said: "Three of the twenty-one have closed for good — the food press is a year behind. Every place goes in the file only after I've read it off the restaurant's own site.",
      },
      {
        id: 't2',
        when: '6h ago',
        said: "You said no seafood, and this city's whole canon is seafood. So I'm keeping the kitchens good enough that the one thing on the menu without a shell is still the reason to go.",
      },
      {
        id: 't3',
        when: '22m ago',
        said: 'Saturday, Sunday and Monday are the worst three nights for closures — half this job turned out to be knowing what is actually open.',
      },
      {
        id: 't4',
        when: 'now',
        live: true,
        at: '20m 45s',
        said: '“Boudin boy” means nothing if you’ve never seen one. Pulling each dish photo off the restaurant’s own site rather than stock, which is slower but at least it’s the food they actually serve.',
      },
    ],
    steps: [
      { id: 's1', prop: KIT_NAMES.sign, did: 'read the homework skill', note: '3 questions' },
      { id: 's2', prop: KIT_NAMES.roadSign, did: 'searched 21 places, kept 15', note: '3m 40s' },
      { id: 's3', prop: KIT_NAMES.crate, did: 'wrote candidates.json', note: '15 entries' },
      { id: 's4', prop: KIT_NAMES.anvil, did: 'changed nola.md twice', note: '+41 −12' },
      { id: 's5', prop: KIT_NAMES.fire, did: 'running curl -sI on 6 pages', running: true },
    ],
    made: [
      {
        id: 'm1',
        what: 'nola.html',
        when: 'published 11m ago',
        warning: 'three need booking · no photos yet',
        lines: [
          "Sat · Molly's Rise and Shine, Turkey and the Wolf, Zasu",
          "Sun · Toups' Meatery, Parkway, Saint-Germain",
          'Mon · Ayu Bakehouse, Herbsaint',
        ],
      },
    ],
    waiting: [{ id: 'w1', said: 'and check the Sunday ones are open for lunch' }],
    carrying: [],
    agents: [
      { id: 'a1', errand: 'hours', where: 'in-light', tint: '#c6a740' },
      { id: 'a2', errand: 'walking', where: 'in-light', tint: '#9ca44f' },
      { id: 'a3', errand: 'photos', where: 'out', gone: '3m', tint: '#d18b2c' },
    ],
  },
  rail: [
    {
      id: 'nola-photos',
      name: 'nola-photos',
      posture: 'working',
      saying: 'you are here · 20m 45s',
      lit: true,
      here: true,
      unread: false,
      ground: 'ready',
    },
    {
      id: 'new-source',
      name: 'new-source',
      posture: 'wants-you',
      saying: 'wants you · 4m',
      lit: true,
      here: false,
      unread: true,
      ground: 'ready',
    },
    {
      id: 'grid-toolbar',
      name: 'grid-toolbar',
      posture: 'working',
      saying: 'working · 17m',
      lit: true,
      here: false,
      unread: false,
      ground: 'ready',
    },
    {
      id: 'csv-import',
      name: 'csv-import',
      posture: 'resting',
      saying: 'worktree being cut',
      lit: false,
      here: false,
      unread: false,
      ground: 'cutting',
    },
    {
      id: 'history-merge',
      name: 'history-merge',
      posture: 'done',
      saying: 'merged · 2h',
      lit: false,
      here: false,
      unread: false,
      ground: 'ready',
    },
    {
      id: 'auth-fix',
      name: 'auth-fix',
      posture: 'broken',
      saying: 'git refused',
      lit: false,
      here: false,
      unread: false,
      ground: 'ready',
    },
  ],
};
