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
      saying: 'running something · 20m',
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
          seq: 15,
          prop: KIT_NAMES.sign,
          kind: 'look',
          did: 'read 6 files and searched 4 times',
          group: [
            { id: 'g1', did: 'read rail.ts' },
            { id: 'g2', did: 'searched for readTranscript' },
          ],
        },
        {
          id: 'x2',
          seq: 17,
          prop: KIT_NAMES.anvil,
          kind: 'edit',
          did: 'changed rail.ts',
          note: '+14 −6',
          path: 'rail.ts',
          diff: [
            ' export async function follow(path: string): Promise<Line[]> {',
            '   const offsets = await loadOffsets();',
            '-  const all = await readAll(path);',
            '-  return parse(all);',
            '+  const seen = offsets.get(path) ?? 0;',
            '+  const fresh = await readFrom(path, seen);',
            '+  offsets.set(path, seen + fresh.length);',
            '+  await saveOffsets(offsets);',
            '+  return parse(fresh);',
            ' }',
            ' ',
          ],
        },
        {
          id: 'x3',
          seq: 18,
          prop: KIT_NAMES.crate,
          kind: 'write',
          did: 'wrote agents-flush.ts',
          note: '38 lines',
        },
        {
          id: 'x3b',
          seq: 19,
          prop: KIT_NAMES.pot,
          kind: 'run',
          did: 'check whether the crash predates my change',
          note: 'failed',
          tone: 'broken',
        },
        {
          id: 'x4',
          seq: 20,
          prop: KIT_NAMES.pot,
          kind: 'test',
          did: 'ran the tests',
          note: 'passed',
        },
        {
          id: 'x4b',
          seq: 21,
          prop: KIT_NAMES.pot,
          kind: 'commit',
          did: 'committed “the rail follows only the tail”',
        },
        {
          id: 'x4c',
          seq: 22,
          prop: KIT_NAMES.pot,
          kind: 'install',
          did: 'installed it on the Mac',
        },
        {
          id: 'x4d',
          seq: 23,
          prop: KIT_NAMES.sign,
          kind: 'look',
          did: 'read 3 files, looked at 4 pictures, searched 7 times and ran 4 checks',
          group: [{ id: 'g3', did: 'read STATE.md' }],
        },
        {
          id: 'x5',
          seq: 24,
          prop: KIT_NAMES.pot,
          kind: 'build',
          did: 'built the app',
          running: live,
        },
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
          seq: 1,
          when: '1h ago',
          answer: true,
          said: 'Tidied. The rail now hangs every lantern on the same cord, and a long session name is clipped instead of pushing the next one off the end.',
        },
        {
          id: 'q2',
          seq: 5,
          when: '40m ago',
          answer: true,
          said: 'Slowed the breath from 1.6s to 2.4s and eased it, so a working lantern reads as **calm** rather than *anxious*. Nothing else on the rail moved.',
        },
        {
          id: 's1',
          seq: 8,
          when: '35m ago',
          answer: true,
          trouble: 'stopped',
          said: 'Partway through what it was saying.',
        },
        {
          id: 's2',
          seq: 10,
          when: '20m ago',
          answer: true,
          trouble: 'warn',
          said: 'It ran out of room to answer and stopped short.',
        },
        {
          id: 's3',
          seq: 12,
          when: '10m ago',
          answer: true,
          trouble: 'wrong',
          said: 'The agent went away in the middle of it. Claude Code exited with code 1 after the API returned an overloaded error twice in a row.',
        },
        { id: 'n1', seq: 14, when: '3m ago', said: 'Looking at how the rail reads each session.' },
        {
          id: 'n2',
          seq: 16,
          when: '2m ago',
          quiet: true,
          said: 'The tick re-reads whole transcripts; that would explain it.',
        },
        live
          ? {
              id: 'q3',
              seq: 30,
              when: 'now',
              live: true,
              ended: 'going',
              at: '1m 12s',
              said: newest.split('\n## What changed')[0] ?? '',
            }
          : {
              id: 'q3',
              seq: 30,
              when: '1m ago',
              live: true,
              answer: true,
              ended: 'done',
              said: newest,
            },
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

/** A question, a form, a check, several permissions, or a wait on a limit, for `?ask=` and `?limit`. */
export function askSample(kind: string): Yard {
  const base = richSample(false);
  const session = base.session;
  const min = 60_000;
  const failure = (armed: boolean): NonNullable<Yard['session']>['failure'] => ({
    doing: 'Out of usage',
    canRetry: false,
    canCarryOn: !armed,
    kind: 'limit',
    since: Date.now() - 33 * min,
    resetAt: Date.now() + 49 * min,
    ...(armed ? { carryOnAt: Date.now() + 50 * min } : {}),
  });
  const talk = { id: '__talk__', said: 'talk it over instead', kind: 'talk' as const };
  const answers = {
    single: {
      said: 'Which database should the photo index live in?',
      header: 'Storage',
      answers: [
        {
          id: '0',
          said: 'SQLite (recommended)',
          about: 'One file, nothing to run, fits this size',
        },
        { id: '1', said: 'Postgres', about: 'Needs a server but scales' },
        { id: '2', said: 'Just JSON files', about: 'Simplest, slow past a few thousand' },
        { id: '__other__', said: 'something else', kind: 'other' as const },
        talk,
      ],
    },
    multi: {
      said: 'Which cities should the photo pass cover?',
      header: 'Cities',
      step: '1 of 3',
      submit: '__submit__',
      answers: [
        { id: '0', said: 'New Orleans', about: 'Already done' },
        { id: '1', said: '✓ Baton Rouge', about: 'About an hour away' },
        { id: '2', said: '✓ Lafayette', about: 'Cajun food, worth it' },
        { id: '3', said: 'Mobile', about: 'Across the line' },
        { id: '__other__', said: 'something else', kind: 'other' as const },
        { id: '__submit__', said: "that's my answer", kind: 'submit' as const },
        talk,
      ],
    },
    check: {
      said: 'Is that everything right?',
      header: 'before it goes',
      submit: '__submit__',
      answers: [
        { id: 'q:0', said: 'which cities', about: 'New Orleans, Lafayette' },
        { id: 'q:1', said: 'where the index lives', about: 'SQLite' },
        { id: 'q:2', said: 'how many photos', about: 'not answered' },
        { id: '__submit__', said: 'send it', kind: 'submit' as const },
        talk,
      ],
    },
    perm: {
      said: '3 things are asking.',
      multi: true,
      answers: [
        {
          id: 'a',
          requestId: 'r1',
          said: '✓ node scrape.mjs --city lafayette --out photos/ — allow once',
        },
        {
          id: 'b',
          requestId: 'r1',
          said: 'node scrape.mjs --city lafayette --out photos/ — always allow',
        },
        {
          id: 'c',
          requestId: 'r1',
          said: 'node scrape.mjs --city lafayette --out photos/ — reject',
        },
        { id: 'a', requestId: 'r2', said: 'changed slideshow/nola/candidates.md — allow once' },
        { id: 'b', requestId: 'r2', said: '✓ changed slideshow/nola/candidates.md — always allow' },
        { id: 'c', requestId: 'r2', said: 'changed slideshow/nola/candidates.md — reject' },
        { id: 'a', requestId: 'r3', said: 'read boudinboy.example/menu — allow once' },
        { id: 'b', requestId: 'r3', said: 'read boudinboy.example/menu — always allow' },
        { id: 'c', requestId: 'r3', said: '✓ read boudinboy.example/menu — reject' },
        { id: '__send_all__', said: "that's everything" },
      ],
    },
  } as const;
  if (kind === 'limit' || kind === 'limit-armed') {
    return session
      ? { ...base, session: { ...session, failure: failure(kind === 'limit-armed') } }
      : base;
  }
  const one = answers[kind as keyof typeof answers];
  return one ? { ...base, asking: { ...one, answers: [...one.answers] } } : base;
}
