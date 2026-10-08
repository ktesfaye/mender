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
        kind: 'page',
        what: 'nola',
        when: 'published 11m ago',
        pick: 'link:https://claude.ai/artifact/nola',
      },
      {
        id: 'm2',
        kind: 'file',
        what: 'candidates.md',
        when: 'written 14m ago',
        pick: 'open:candidates.md',
      },
    ],
    waiting: [{ id: 'w1', said: 'and check the Sunday ones are open for lunch' }],
    carrying: [],
    pinnedNotes: [],
    agents: [
      { id: 'a1', errand: 'hours', said: 'hours', where: 'in-light', tint: '#c6a740', steps: [] },
      {
        id: 'a2',
        errand: 'walking',
        said: 'walking',
        where: 'in-light',
        tint: '#9ca44f',
        steps: [],
      },
      {
        id: 'a3',
        errand: 'photos',
        said: 'photos',
        where: 'out',
        gone: '3m',
        tint: '#d18b2c',
        steps: [],
      },
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
      id: 'limit-early',
      name: 'limit-early',
      posture: 'waiting',
      saying: 'limit · lifts 3:20pm',
      lit: false,
      ember: 0.15,
      here: false,
      unread: false,
      ground: 'ready',
    },
    {
      id: 'limit-late',
      name: 'limit-late',
      posture: 'waiting',
      saying: 'limit · lifts 12:50pm',
      lit: false,
      ember: 0.85,
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

/**
 * A coding conversation the way one really reads: several answers back, the
 * newest one carrying every shape of markdown an agent actually writes, and a
 * recap under it. `?rich` in the harness; `?rich&live` has it still going.
 */
export function richSample(live: boolean): Yard {
  const base = SAMPLE.session;
  if (!base) return SAMPLE;
  const newest = [
    "Found it. The rail was re-reading every session's transcript on each tick, so the more sessions you had open the slower everything got.",
    '',
    '## What changed',
    '',
    '- **Rail** now reads each transcript once and only follows the tail after that',
    '- The yard stops redrawing while a board is open over it',
    '- `agents.json` is written at most once a second instead of on every token',
    '',
    '| | before | after |',
    '|---|---:|---:|',
    '| six sessions open | 41% | 6% |',
    '| one session typing | 18% | 3% |',
    '',
    'The fix is basically this:',
    '',
    '```ts',
    'const seen = offsets.get(path) ?? 0;',
    'const fresh = await readFrom(path, seen);',
    'offsets.set(path, seen + fresh.length);',
    '```',
    '',
    '> One thing I left alone: the moss clock still reads git every minute. It is cheap, and changing it would touch the island.',
    '',
    '### Next',
    '',
    '1. Package and reinstall the app',
    '2. Watch it for a day with ten sessions open',
  ].join('\n');
  return {
    ...SAMPLE,
    session: {
      ...base,
      plan: [],
      made: [],
      agents: [],
      steps: [
        {
          id: 'x1',
          prop: KIT_NAMES.sign,
          did: 'read 6 files and searched 4 times',
          group: [
            { id: 'g1', did: 'read rail.ts' },
            { id: 'g2', did: 'searched for readTranscript' },
          ],
        },
        {
          id: 'x2',
          prop: KIT_NAMES.anvil,
          did: 'changed rail.ts',
          note: '+14 −6',
          path: 'rail.ts',
          diff: [
            '- const all = await readAll(path);',
            '+ const seen = offsets.get(path) ?? 0;',
            '+ const fresh = await readFrom(path, seen);',
          ],
          diffMore: 9,
        },
        { id: 'x3', prop: KIT_NAMES.crate, did: 'wrote agents-flush.ts', note: '38 lines' },
        { id: 'x4', prop: KIT_NAMES.fire, did: 'tested, 212 passed' },
        { id: 'x5', prop: KIT_NAMES.fire, did: 'running pnpm run package', running: live },
      ],
      notes: [
        {
          id: 'r1',
          when: '3m ago',
          answered: !live,
          on: live,
          said: 'why is the fan going crazy with six sessions open',
        },
        {
          id: 'r2',
          when: '40m ago',
          answered: true,
          said: 'make the rail lanterns breathe slower',
        },
        { id: 'r3', when: '1h ago', answered: true, standing: true, said: 'tidy up the rail' },
      ],
      thoughts: [
        {
          id: 'q1',
          when: '1h ago',
          answer: true,
          said: 'Tidied. The rail now hangs every lantern on the same cord, and a long session name is clipped instead of pushing the next one off the end.',
        },
        {
          id: 'q2',
          when: '40m ago',
          answer: true,
          said: 'Slowed the breath from 1.6s to 2.4s and eased it, so a working lantern reads as **calm** rather than *anxious*. Nothing else on the rail moved.',
        },
        live
          ? {
              id: 'q3',
              when: 'now',
              live: true,
              ended: 'going',
              at: '1m 12s',
              said: newest.split('\n## What changed')[0] ?? '',
            }
          : { id: 'q3', when: '1m ago', live: true, answer: true, ended: 'done', said: newest },
      ],
      recap: live
        ? undefined
        : 'You asked why the fan spins up with many sessions open. The rail was re-reading every transcript constantly; it now follows only the tail. Next is reinstalling and watching it for a day.',
      live: live
        ? { doing: 'reading rail.ts', since: Date.now() - 72_000, answering: true }
        : undefined,
      fire: live ? 'lit' : 'embers',
      waiting: [],
    },
  };
}
