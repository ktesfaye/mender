#!/usr/bin/env node
/**
 * What a session here can ask of the village itself: start another session,
 * in the open, the way the empty hook on the rail would, so
 * the person watching sees its lantern hang and the window walk into it; and
 * keep the project's drafting table, its design/board.json, as it designs.
 *
 * A plain MCP server over stdio, no dependencies, like the screen-control one.
 * It knows which folder its session works in from MENDER_CWD and reaches the
 * app through the port and token in the door file the app writes at start.
 */
import { execFile } from 'node:child_process';
import { copyFile, mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';

async function knock(args, route = '/start') {
  const file = process.env.MENDER_DOOR;
  if (!file) throw new Error('this session was not started by Mender, so there is no village to ask.');
  let door;
  try {
    door = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    throw new Error('Mender is not answering; is the app running?');
  }
  const res = await fetch(`http://127.0.0.1:${door.port}${route}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${door.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      ...args,
      cwd: process.env.MENDER_CWD ?? process.cwd(),
      conversation: process.env.MENDER_CONVERSATION,
    }),
  });
  const out = await res.json().catch(() => ({ ok: false, text: `Mender answered ${res.status}.` }));
  if (!out.ok) throw new Error(out.text);
  return out.text;
}


/* ---- The drafting table -------------------------------------------------
   A project's designs live in its own design/board.json, committed with it.
   These read and write that file directly, so the board in the village (the
   pinned sheet on the rack) shows what is pinned the moment it is written. */

const ran = promisify(execFile);

async function checkout() {
  const cwd = process.env.MENDER_CWD ?? process.cwd();
  try {
    const { stdout } = await ran('git', ['rev-parse', '--show-toplevel'], { cwd });
    return stdout.trim();
  } catch {
    return cwd;
  }
}

async function boardAt() {
  const top = await checkout();
  const design = join(top, 'design');
  return { top, design, file: join(design, 'board.json') };
}

async function loadBoard() {
  const at = await boardAt();
  let board;
  try {
    board = JSON.parse(await readFile(at.file, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw new Error(`design/board.json would not read: ${error.message}`);
    board = { title: '', about: '', flow: [], rooms: [] };
  }
  board.flow ??= [];
  board.rooms ??= [];
  return { at, board };
}

async function saveBoard(at, board) {
  await mkdir(at.design, { recursive: true });
  const tmp = `${at.file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(board, null, 2) + '\n');
  await rename(tmp, at.file);
}

/** A picture kept with the board: one already under design/ is pointed at
    where it is; one anywhere else is copied into design/drafting/ first, so
    a render in /tmp outlives the reboot that would wipe it. */
async function keep(at, image, label) {
  if (!image) return undefined;
  const cwd = process.env.MENDER_CWD ?? process.cwd();
  const full = isAbsolute(image) ? image : resolve(cwd, image);
  try {
    await stat(full);
  } catch {
    const fromDesign = resolve(at.design, image);
    try {
      await stat(fromDesign);
      return relative(at.design, fromDesign);
    } catch {
      throw new Error(`there is no picture at ${image}.`);
    }
  }
  if (full === at.design || full.startsWith(at.design + sep)) return relative(at.design, full);
  const into = join(at.design, 'drafting');
  await mkdir(into, { recursive: true });
  const slug = String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pass';
  let name = `${slug}${extname(full) || '.png'}`;
  for (let n = 2; ; n++) {
    try {
      await stat(join(into, name));
      name = `${slug}-${n}${extname(full) || '.png'}`;
    } catch {
      break;
    }
  }
  await copyFile(full, join(into, name));
  return relative(at.design, join(into, name));
}

/** A page drawn for the table, pointed at where it is rather than copied:
    a page leans on the pictures and styles beside it, which a copy would
    leave behind. Inside the checkout it is kept relative to design/, so the
    board travels with the repository. */
async function pageAt(at, page) {
  if (!page) return undefined;
  const cwd = process.env.MENDER_CWD ?? process.cwd();
  let full = isAbsolute(page) ? page : resolve(cwd, page);
  try {
    await stat(full);
  } catch {
    full = resolve(at.design, page);
    try {
      await stat(full);
    } catch {
      throw new Error(`there is no page at ${page}.`);
    }
  }
  return full === at.top || full.startsWith(at.top + sep) ? relative(at.design, full) : full;
}

function roomFor(board, room, create = true) {
  const id = String(room ?? '').trim();
  if (!id) throw new Error('say which room (screen, place or thing) this is for.');
  const key = id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let found = board.rooms.find((r) => r.id === id || r.id === key || r.name?.toLowerCase() === id.toLowerCase());
  if (!found && create) {
    found = { id: key, name: id, about: '', state: 'drawing', plan: [], questions: [], never: [], notes: [], brief: '' };
    board.rooms.push(found);
  }
  if (!found) throw new Error(`there is no room called ${id} on the drafting table.`);
  found.plan ??= [];
  found.questions ??= [];
  found.never ??= [];
  found.notes ??= [];
  return found;
}

function questionFor(room, ask, create = true) {
  const text = String(ask ?? '').trim();
  if (!text) throw new Error('say which question this pass answers.');
  let found = room.questions.find((q) => q.ask.toLowerCase() === text.toLowerCase());
  if (!found && create) {
    found = { ask: text, state: 'open', picked: [], passes: [] };
    room.questions.push(found);
  }
  if (!found) throw new Error(`no question "${text}" in ${room.name}.`);
  found.passes ??= [];
  found.picked ??= [];
  return found;
}

function findPass(room, id) {
  for (const q of room.questions) {
    const p = q.passes.find((x) => x.id === id);
    if (p) return { question: q, pass: p };
  }
  return null;
}

function summary(board, at) {
  if (!board.rooms.length && !board.flow.length) return `The drafting table at ${at.file} is empty.`;
  const lines = [`The drafting table, ${at.file}${board.title ? ` (${board.title})` : ''}:`];
  if (board.flow.length) lines.push(`Finished flow: ${board.flow.map((s, i) => `${i + 1}. ${s.caption}`).join('  ')}`);
  for (const room of board.rooms) {
    lines.push('', `Room "${room.name}" [${room.id}], ${room.state ?? 'drawing'}${room.about ? `: ${room.about}` : ''}`);
    if (room.plan?.length)
      lines.push(`  Plan: ${room.plan.map((p) => `${p.part} = ${p.pass ?? p.image ?? '?'}${p.open ? ' (still drawing)' : ''}`).join('; ')}`);
    for (const q of room.questions ?? [])
      lines.push(`  Q "${q.ask}" (${q.state}): ${q.passes.map((p) => `${p.id}${q.picked.includes(p.id) ? '*' : ''}${p.name ? ` ${p.name}` : ''}`).join(', ')}`);
    if (room.never?.length) lines.push(`  Never bring back: ${room.never.join('; ')}`);
    for (const n of room.notes ?? []) lines.push(`  He said${n.on ? ` (on ${n.on})` : ''}: ${n.said}`);
    if (room.brief) lines.push(`  Brief: ${room.brief}`);
  }
  lines.push('', '* = taken. Pictures are relative to the design/ folder.');
  return lines.join('\n');
}

/** Another session may be writing the same board, so each change holds a
    lock beside it while it reads, changes and writes. A lock older than a
    few seconds was left by something that died holding it. */
async function locked(at, work) {
  await mkdir(at.design, { recursive: true });
  const lock = `${at.file}.lock`;
  for (let tries = 0; ; tries++) {
    try {
      const handle = await open(lock, 'wx');
      await handle.close();
      break;
    } catch {
      const old = await stat(lock).then((s) => Date.now() - s.mtimeMs, () => 0);
      if (old > 5000) await rm(lock, { force: true });
      else if (tries > 100) throw new Error('the drafting table is being written by somebody else; try again.');
      else await new Promise((r) => setTimeout(r, 50));
    }
  }
  try {
    return await work();
  } finally {
    await rm(lock, { force: true });
  }
}

let line = Promise.resolve();
const drafting = (fn) => (args) => {
  const turn = line.then(async () => {
    const at = await boardAt();
    return locked(at, async () => {
      const { board } = await loadBoard();
      const said = await fn(board, args, at);
      if (said !== undefined && said.write !== false) await saveBoard(at, board);
      return typeof said === 'string' ? said : said?.text ?? 'done.';
    });
  });
  line = turn.catch(() => undefined);
  return turn;
};

async function showOnTable(a) {
  const at = await boardAt();
  const page = a.page ? await pageAt(at, a.page) : undefined;
  return knock({ path: at.top, room: a.room, pass: a.id, page }, '/table');
}

const TOOLS = [
  {
    name: 'start_session',
    description:
      'Starts a new Mender session, visibly: its lantern hangs on the rail, an agent wakes in it and is told `what`, and the person is walked into it, so they watch it work. Use this whenever you are asked to launch, open or spin up another session or another agent here, instead of clicking the lantern or running a background `claude`. It starts in the same workspace as you unless `isolated` is set.',
    inputSchema: {
      type: 'object',
      properties: {
        what: { type: 'string', description: 'The first thing said to the new session: what it is for, in plain words. Never a `claude ...` command line; there is no model or effort setting here, so say so in words if it matters.' },
        agent: { type: 'string', description: 'Agent id to work in it (e.g. "claude"). Defaults to the person\'s usual one.' },
        isolated: { type: 'boolean', description: 'Give it its own worktree on a branch of its own.' },
        terminal: { type: 'boolean', description: 'Open it as a plain shell and run `what` as its first command, instead of a chat. Only for a real shell command; needs `show` left on.' },
        show: { type: 'boolean', description: 'Walk the person into it. Default true; false keeps them where they are.' },
      },
      required: ['what'],
      additionalProperties: false,
    },
    run: knock,
  },
  {
    name: 'set_model',
    description:
      'Switches the model this session thinks with, on the spot, by a plain name such as "opus", "haiku" or "sonnet 5.5". Use it whenever you are asked to change or switch your model, instead of typing /model or pressing keys in the window. It matches against what this agent itself offers and says so if the name is unclear.',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'The model, in plain words: "opus", "haiku 5.5", "fable".' },
      },
      required: ['model'],
      additionalProperties: false,
    },
    run: (a) => knock({ model: a.model }, '/model'),
  },
  {
    name: 'show_on_table',
    description:
      "Lays the drafting table open in Mender, in front of him, on a room, a pass held up, or an HTML page running live. This is how a design is shown to him here: never open a mockup, a compare page or any design HTML in Chrome or another browser. Pin the passes first, then show the room (to compare them side by side), the pass, or the page.",
    inputSchema: {
      type: 'object',
      properties: {
        room: { type: 'string', description: 'The room to open on.' },
        id: { type: 'string', description: 'A pass to hold up.' },
        page: { type: 'string', description: 'An HTML page to hold up running (absolute, or relative to your folder). With `id`, that pass is shown as its page.' },
      },
      additionalProperties: false,
    },
    run: showOnTable,
  },
  {
    name: 'drafting_table',
    description:
      "Reads this project's drafting table (design/board.json): every room being designed, every pass drawn for each question with which were taken, the plan, the finished flow, what he said and what he never wants back. Read it before drawing anything in a project that has one.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: drafting((board, _args, at) => ({ text: summary(board, at), write: false })),
  },
  {
    name: 'pin_pass',
    description:
      'Pins a design pass you just drew onto the drafting table, so he sees it land on the board in Mender. Call it for EVERY mockup, concept or iteration you render, the moment you have looked at it, including each of several options shown side by side. Never overwrite a pass: a changed design is a new pass with a new id. A picture outside design/ is copied into design/drafting/ so it is kept.',
    inputSchema: {
      type: 'object',
      properties: {
        room: { type: 'string', description: 'The screen, place or thing being designed ("the player", "settings window"). Made if new.' },
        question: { type: 'string', description: 'What this pass is an answer to, short ("three kinds of thing", "pausing", "listen on"). Options drawn side by side share one question. Made if new.' },
        id: { type: 'string', description: 'Short id, unique in the room, usually the iteration number ("15", "29b").' },
        name: { type: 'string', description: 'A few words naming it ("lectern", "key hooks").' },
        image: { type: 'string', description: 'Path to the render (absolute, or relative to your folder).' },
        variants: {
          type: 'array',
          description: 'Other looks at the same pass: its states (paused, open), its draft before review, a close-up.',
          items: { type: 'object', properties: { name: { type: 'string' }, image: { type: 'string' } }, required: ['name', 'image'] },
        },
        said: { type: 'string', description: 'One line on what it tries.' },
        page: { type: 'string', description: 'The HTML page it was rendered from, if any. The table holds it up running, beside the picture, so he never needs a browser to see it.' },
      },
      required: ['room', 'question', 'id', 'image'],
      additionalProperties: false,
    },
    run: drafting(async (board, a, at) => {
      const room = roomFor(board, a.room);
      const question = questionFor(room, a.question);
      if (findPass(room, a.id)) throw new Error(`${a.id} is already pinned in ${room.name}; a changed design is a new pass with its own id.`);
      const pass = { id: String(a.id), name: a.name ?? '', image: await keep(at, a.image, `${room.id}-${a.id}`), variants: [] };
      for (const v of a.variants ?? []) pass.variants.push({ name: v.name, image: await keep(at, v.image, `${room.id}-${a.id}-${v.name}`) });
      if (a.said) pass.said = a.said;
      if (a.page) pass.page = await pageAt(at, a.page);
      pass.at = new Date().toISOString();
      question.passes.push(pass);
      if (question.state !== 'open') question.state = 'open';
      if (room.state !== 'drawing') room.state = 'drawing';
      return `pinned ${a.id} under "${question.ask}" in ${room.name}.`;
    }),
  },
  {
    name: 'add_variant',
    description: 'Adds another look (a state, a close-up, an open view) to a pass already on the drafting table.',
    inputSchema: {
      type: 'object',
      properties: { room: { type: 'string' }, id: { type: 'string' }, name: { type: 'string' }, image: { type: 'string' } },
      required: ['room', 'id', 'name', 'image'],
      additionalProperties: false,
    },
    run: drafting(async (board, a, at) => {
      const room = roomFor(board, a.room, false);
      const found = findPass(room, a.id);
      if (!found) throw new Error(`no pass ${a.id} in ${room.name}.`);
      found.pass.variants ??= [];
      found.pass.variants.push({ name: a.name, image: await keep(at, a.image, `${room.id}-${a.id}-${a.name}`) });
      return `added "${a.name}" to ${a.id}.`;
    }),
  },
  {
    name: 'pick',
    description:
      "Records which pass(es) he took for a question, the moment he says so. Settles the question unless `open` is set. Passing none with `drop` puts the whole question down.",
    inputSchema: {
      type: 'object',
      properties: {
        room: { type: 'string' },
        question: { type: 'string' },
        ids: { type: 'array', items: { type: 'string' } },
        open: { type: 'boolean', description: 'He took it but it is still being worked on.' },
        drop: { type: 'boolean', description: 'He turned all of them down.' },
      },
      required: ['room', 'question'],
      additionalProperties: false,
    },
    run: drafting((board, a) => {
      const room = roomFor(board, a.room, false);
      const question = questionFor(room, a.question, false);
      for (const id of a.ids ?? []) if (!question.passes.some((p) => p.id === id)) throw new Error(`${id} is not a pass under "${question.ask}".`);
      question.picked = a.ids ?? [];
      question.state = a.drop ? 'dropped' : a.open ? 'open' : 'settled';
      return a.drop ? `put "${question.ask}" down.` : `took ${question.picked.join(', ')} for "${question.ask}".`;
    }),
  },
  {
    name: 'set_plan',
    description:
      "Sets what gets built for a room: its parts, each from whichever pass drew it best. Replaces the room's plan whole, so pass every part.",
    inputSchema: {
      type: 'object',
      properties: {
        room: { type: 'string' },
        parts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              part: { type: 'string', description: 'What part of the thing ("the book", "pausing").' },
              caption: { type: 'string', description: 'How it does it, in a few words.' },
              pass: { type: 'string', description: 'The pass id it comes from.' },
              image: { type: 'string', description: 'Only if its picture is not that pass\'s own.' },
              states: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, image: { type: 'string' } }, required: ['name'] } },
              open: { type: 'boolean', description: 'Still being drawn.' },
            },
            required: ['part'],
          },
        },
        settled: { type: 'boolean', description: 'The room is done being designed.' },
      },
      required: ['room', 'parts'],
      additionalProperties: false,
    },
    run: drafting(async (board, a, at) => {
      const room = roomFor(board, a.room, false);
      const plan = [];
      for (const p of a.parts) {
        if (p.pass && !findPass(room, p.pass)) throw new Error(`no pass ${p.pass} in ${room.name}.`);
        const part = { part: p.part, caption: p.caption ?? '', states: [] };
        if (p.pass) part.pass = p.pass;
        if (p.image) part.image = await keep(at, p.image, `${room.id}-${p.part}`);
        for (const s of p.states ?? []) part.states.push(s.image ? { name: s.name, image: await keep(at, s.image, `${room.id}-${p.part}-${s.name}`) } : { name: s.name });
        if (p.open) part.open = true;
        plan.push(part);
      }
      room.plan = plan;
      if (a.settled) room.state = 'settled';
      return `the plan for ${room.name} is ${plan.length} parts.`;
    }),
  },
  {
    name: 'note',
    description:
      'Pins what he said about the design onto the drafting table, in his own words, on the pass or question it was about. Use for every piece of design feedback he gives.',
    inputSchema: {
      type: 'object',
      properties: {
        room: { type: 'string' },
        said: { type: 'string', description: 'His words, short.' },
        on: { type: 'string', description: 'A pass id or question it is about.' },
        never: { type: 'string', description: 'Something he never wants back, in a few words, for the never list.' },
      },
      required: ['room'],
      additionalProperties: false,
    },
    run: drafting((board, a) => {
      const room = roomFor(board, a.room);
      if (a.said) room.notes.push({ said: a.said, ...(a.on ? { on: a.on } : {}), at: new Date().toISOString() });
      if (a.never && !room.never.includes(a.never)) room.never.push(a.never);
      return 'pinned.';
    }),
  },
  {
    name: 'set_room',
    description:
      "Sets a room's name, what it is, its state, and the brief whoever draws it next is told (what it is now, what is still open, what to keep).",
    inputSchema: {
      type: 'object',
      properties: {
        room: { type: 'string' },
        name: { type: 'string' },
        about: { type: 'string' },
        state: { type: 'string', enum: ['drawing', 'settled', 'waiting'] },
        brief: { type: 'string' },
      },
      required: ['room'],
      additionalProperties: false,
    },
    run: drafting((board, a) => {
      const room = roomFor(board, a.room);
      if (a.name) room.name = a.name;
      if (a.about !== undefined) room.about = a.about;
      if (a.state) room.state = a.state;
      if (a.brief !== undefined) room.brief = a.brief;
      return `${room.name} updated.`;
    }),
  },
  {
    name: 'set_flow',
    description:
      'Sets the finished thing walked through from end to end: one picture per step, in order, each saying what you do there. Replaces the flow whole.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'What the whole design is, e.g. "Aurio redesign".' },
        about: { type: 'string' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: { room: { type: 'string' }, image: { type: 'string' }, caption: { type: 'string' }, says: { type: 'string' } },
            required: ['image', 'caption'],
          },
        },
        map: { type: 'string', description: 'A picture of how the rooms sit together, if there is one.' },
      },
      required: ['steps'],
      additionalProperties: false,
    },
    run: drafting(async (board, a, at) => {
      if (a.title) board.title = a.title;
      if (a.about !== undefined) board.about = a.about;
      const flow = [];
      for (const [i, s] of a.steps.entries()) {
        const room = s.room ? roomFor(board, s.room, false).id : undefined;
        flow.push({ ...(room ? { room } : {}), image: await keep(at, s.image, `flow-${i + 1}`), caption: s.caption, says: s.says ?? '' });
      }
      board.flow = flow;
      if (a.map) board.map = await keep(at, a.map, 'map');
      return `the flow is ${flow.length} steps.`;
    }),
  },
];

const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
const reply = (id, result) => send({ jsonrpc: '2.0', id, result });

const rl = createInterface({ input: process.stdin, terminal: false });
rl.on('line', async (line) => {
  let msg;
  try {
    msg = JSON.parse(line.trim());
  } catch {
    return;
  }
  const { id, method, params } = msg;
  if (method === 'initialize') {
    return reply(id, {
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'mender', version: '0.1.0' },
    });
  }
  if (method?.startsWith('notifications/')) return;
  if (method === 'ping') return reply(id, {});
  if (method === 'tools/list') {
    return reply(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
  }
  if (method === 'tools/call') {
    const tool = TOOLS.find((t) => t.name === params?.name);
    if (!tool) return send({ jsonrpc: '2.0', id, error: { code: -32000, message: `no such tool: ${params?.name}` } });
    try {
      reply(id, { content: [{ type: 'text', text: await tool.run(params?.arguments ?? {}) }], isError: false });
    } catch (error) {
      reply(id, { content: [{ type: 'text', text: String(error?.message ?? error) }], isError: true });
    }
    return;
  }
  if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32601, message: `unknown method: ${method}` } });
});
process.stdin.resume();
