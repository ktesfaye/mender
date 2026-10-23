import './drafting.css';
import {
  partImage,
  passIn,
  type DraftBoard,
  type DraftPass,
  type DraftQuestion,
  type DraftRoom,
} from '@shared/drafting';
import { h, sign } from '../glass/f';
import { glaze } from '../glass/glass';

/**
 * The drafting table: a project's designs, in a window of glass over the
 * village.
 *
 * Down the left is the finished thing, then each room. The finished thing is
 * the whole product walked through from end to end, and under it every
 * room's plan as it stands. A room is its plan, every part from whichever
 * pass drew it best, and under that how it got there: each question that
 * was worked through, every pass drawn for it in order with the ones taken
 * ringed in moss, what he said pinned under the pass it was about, and
 * beside it all what he turned down for good and what whoever draws next is
 * told. Pressing any pass holds it up with every variant it has.
 *
 * Nothing here is kept by the village: it is the project's own
 * `design/board.json`, read again whenever it is written, so a session
 * pinning a round is seen landing while the window is open.
 */

export interface DraftingHands {
  read(
    path: string,
    stamp?: number
  ): Promise<{
    board: DraftBoard | null;
    stamp: number;
    root: string;
    trouble: string | null;
    same: boolean;
  }>;
  /** A picture's own pixels, sized for the width it is drawn at. */
  picture(path: string, width: number): Promise<string | null>;
  /** A session started in this project, told this first. */
  start(name: string, said: string): void;
  close(): void;
}

export interface DraftingSurface {
  readonly up: boolean;
  open(at: { project: string; path: string }): void;
  close(): void;
}

const MOSS = '#9bd28a';
const EMBER = '#ff9a4a';
const IDLE = 'rgba(246,236,219,.4)';

const STATE_DOT: Record<DraftRoom['state'], string> = {
  drawing: EMBER,
  settled: MOSS,
  waiting: IDLE,
};
const STATE_SAYS: Record<DraftRoom['state'], string> = {
  drawing: 'being drawn',
  settled: 'settled',
  waiting: 'not drawn yet',
};

/** Pictures in flight and done, so a repaint never asks for the same one twice. */
const pictures = new Map<string, Promise<string | null>>();

export function makeDraftingSurface(hands: DraftingHands): DraftingSurface {
  const wash = h('div', 'dt');
  wash.style.display = 'none';
  const win = h('div', 'dt-win');
  glaze(win, { blur: 14 });
  wash.append(win);
  for (const kind of [
    'keyup',
    'pointerdown',
    'pointerup',
    'mousedown',
    'click',
    'wheel',
    'dblclick',
    'contextmenu',
  ] as const)
    wash.addEventListener(kind, (event) => event.stopPropagation());
  let downOff = false;
  wash.addEventListener('pointerdown', (event) => {
    downOff = event.target === wash;
  });
  wash.addEventListener('click', (event) => {
    if (downOff && event.target === wash) hands.close();
    downOff = false;
  });
  document.body.append(wash);

  let up = false;
  let where: { project: string; path: string } | null = null;
  let board: DraftBoard | null = null;
  let root = '';
  let stamp: number | undefined;
  let trouble: string | null = null;
  /** Which sheet is open: the finished thing, or a room by id. */
  let sheet = '';
  let held: { room: DraftRoom; question: DraftQuestion; pass: DraftPass; look: number } | null =
    null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let canvasScroll = 0;

  const abs = (rel: string): string => (rel.startsWith('/') ? rel : `${root}/${rel}`);

  /** An img that fills itself in once its pixels arrive. */
  const pic = (rel: string | undefined, width: number, cls = ''): HTMLImageElement => {
    const img = h('img', cls);
    img.alt = '';
    img.draggable = false;
    if (!rel) return img;
    const path = abs(rel);
    const key = `${path}|${width}`;
    let got = pictures.get(key);
    if (!got) {
      got = hands.picture(path, width).catch(() => null);
      pictures.set(key, got);
    }
    void got.then((src) => {
      if (src) img.src = src;
      else img.classList.add('dt-gone');
    });
    return img;
  };

  const roomOf = (id: string): DraftRoom | undefined => board?.rooms.find((room) => room.id === id);

  const thumbs = (room: DraftRoom): string[] => {
    const fromPlan = room.plan.map((part) => partImage(room, part)).filter((x): x is string => !!x);
    if (fromPlan.length) return fromPlan.slice(0, 4);
    const picked = room.questions.flatMap((q) =>
      q.picked.map((id) => passIn(room, id)?.image).filter((x): x is string => !!x)
    );
    if (picked.length) return picked.slice(-4);
    return room.questions.flatMap((q) => q.passes.map((p) => p.image)).slice(-4);
  };

  function paint(): void {
    const keep = win.querySelector<HTMLElement>('.dt-canvas')?.scrollTop ?? canvasScroll;
    win.replaceChildren();
    const shut = h('div', 'g-x', '×');
    shut.addEventListener('click', () => hands.close());
    win.append(shut);

    const room = sheet ? roomOf(sheet) : undefined;
    if (sheet && !room) sheet = '';

    const way = h('div', 'g-crumbs dt-way');
    const home = h('span', room ? 'g-gold' : 'g-mute', 'the drafting table');
    if (room) home.addEventListener('click', () => show(''));
    way.append(h('span', 'g-mute', where?.project ?? ''), h('span', 'g-faint', '›'), home);
    if (room) way.append(h('span', 'g-faint', '›'), h('span', 'g-mute', room.name));
    win.append(way);

    if (!board) {
      win.append(empty());
      return;
    }

    const top = h('div', 'dt-top');
    const titles = h(
      'div',
      '',
      h('h1', 'g-serif dt-h1', room ? room.name : 'the finished thing'),
      h('div', 'dt-sub g-mute', room ? room.about : board.about || board.title)
    );
    const chips = h('div', 'dt-chips');
    if (room) {
      const settled = room.plan.filter((part) => !part.open).length;
      const open = room.questions.filter((q) => q.state === 'open');
      if (open.length)
        chips.append(chip(`being drawn · ${open.map((q) => q.ask).join(', ')}`, EMBER));
      if (settled)
        chips.append(chip(`${settled} ${settled === 1 ? 'part' : 'parts'} settled`, MOSS));
    } else {
      const drawing = board.rooms.filter((r) => r.state === 'drawing').length;
      const settled = board.rooms.filter((r) => r.state === 'settled').length;
      if (drawing) chips.append(chip(`${drawing} being drawn`, EMBER));
      if (settled) chips.append(chip(`${settled} settled`, MOSS));
    }
    top.append(titles, chips);
    win.append(top);

    const body = h('div', 'dt-body');
    body.append(rail());
    const canvas = h('div', 'dt-canvas');
    if (trouble) canvas.append(h('div', 'dt-trouble', trouble));
    if (room) roomSheet(canvas, room);
    else finished(canvas);
    body.append(canvas);
    win.append(body);
    canvas.scrollTop = keep;
    if (held) win.append(holdUp());
  }

  const chip = (text: string, dot: string): HTMLElement => {
    const el = h('span', 'g-chip');
    const d = h('span', 'g-dot');
    d.style.background = dot;
    el.append(d, text);
    return el;
  };

  function empty(): HTMLElement {
    return h(
      'div',
      'dt-empty',
      h('h1', 'g-serif dt-h1', 'nothing on the table yet'),
      h(
        'p',
        'g-mute',
        trouble ??
          'Whatever a session here designs goes up on this table as it draws it: every pass, which one was taken, and what gets built.'
      )
    );
  }

  function rail(): HTMLElement {
    const el = h('div', 'dt-rail');
    const all = h('div', `dt-sheet${sheet ? '' : ' on'}`);
    all.append(h('b', '', 'the finished thing'));
    all.append(
      h(
        'div',
        'dt-s',
        `${board!.flow.length ? `${board!.flow.length} steps, ` : ''}every room as it stands`
      )
    );
    const flowThumbs = h('div', 'dt-thumbs');
    for (const step of board!.flow.slice(0, 5)) flowThumbs.append(pic(step.image, 80));
    if (board!.flow.length) all.append(flowThumbs);
    all.addEventListener('click', () => show(''));
    el.append(all);
    if (board!.rooms.length) el.append(h('div', 'g-pix dt-label', 'rooms'));
    for (const room of board!.rooms) {
      const one = h('div', `dt-sheet${sheet === room.id ? ' on' : ''}`);
      const dot = h('span', 'g-dot');
      dot.style.background = STATE_DOT[room.state];
      const passes = room.questions.reduce((n, q) => n + q.passes.length, 0);
      one.append(
        h('b', '', room.name),
        h(
          'div',
          'dt-s',
          dot,
          `${STATE_SAYS[room.state]}${passes ? ` · ${passes} ${passes === 1 ? 'pass' : 'passes'}` : ''}`
        )
      );
      const row = h('div', 'dt-thumbs');
      for (const image of thumbs(room)) row.append(pic(image, 80));
      if (row.children.length) one.append(row);
      one.addEventListener('click', () => show(room.id));
      el.append(one);
    }
    return el;
  }

  function show(id: string): void {
    sheet = id;
    held = null;
    canvasScroll = 0;
    const canvas = win.querySelector<HTMLElement>('.dt-canvas');
    if (canvas) canvas.scrollTop = 0;
    paint();
    const fresh = win.querySelector<HTMLElement>('.dt-canvas');
    if (fresh) fresh.scrollTop = 0;
  }

  const band = (title: string, note: string): HTMLElement =>
    h(
      'div',
      'dt-bandhead',
      h('span', 'g-serif dt-t', title),
      note ? h('span', 'dt-w', note) : null
    );

  function finished(canvas: HTMLElement): void {
    if (board!.flow.length) {
      canvas.append(band('how it goes', 'the finished thing, from the start'));
      const flow = h('div', 'dt-flow');
      board!.flow.forEach((step, i) => {
        const room = step.room ? roomOf(step.room) : undefined;
        const frame = h('div', 'dt-step');
        const img = h('div', 'dt-img', pic(step.image, 440));
        if (room) {
          img.classList.add('dt-go');
          img.addEventListener('click', () => show(room.id));
        }
        frame.append(img, h('div', 'dt-cap', h('span', 'dt-n', String(i + 1)), step.caption));
        if (step.says) frame.append(h('div', 'dt-says', step.says));
        flow.append(frame);
      });
      canvas.append(flow);
    }
    if (board!.map) {
      canvas.append(band('how the rooms sit', ''));
      const map = h('div', 'dt-map', pic(board!.map, 1400));
      canvas.append(map);
    }
    for (const room of board!.rooms) {
      if (!room.plan.length) continue;
      const head = band(
        room.name,
        `${STATE_SAYS[room.state]}${room.about ? ` · ${room.about}` : ''}`
      );
      head.querySelector('.dt-t')?.classList.add('dt-press');
      head.querySelector('.dt-t')?.addEventListener('click', () => show(room.id));
      canvas.append(head, parts(room, 180));
    }
    if (!board!.flow.length && !board!.rooms.some((room) => room.plan.length))
      canvas.append(
        h(
          'div',
          'dt-quiet g-mute',
          'Nothing has been settled on yet, so there is no finished thing to walk through. Every room so far is on the left.'
        )
      );
  }

  function parts(room: DraftRoom, tall: number): HTMLElement {
    const row = h('div', 'dt-parts');
    for (const part of room.plan) {
      const el = h('div', `dt-part${part.open ? ' dt-open' : ''}`);
      const img = h('div', 'dt-img');
      img.style.height = `${tall}px`;
      img.append(pic(partImage(room, part), Math.round(tall * 1.8)));
      if (part.pass)
        img.append(
          h('span', `dt-tag${part.open ? ' dt-tag-open' : ''}`, part.open ? 'drawing' : part.pass)
        );
      else if (part.open) img.append(h('span', 'dt-tag dt-tag-open', 'drawing'));
      const pass = part.pass ? passIn(room, part.pass) : undefined;
      const question = pass ? room.questions.find((q) => q.passes.includes(pass)) : undefined;
      if (pass && question) {
        img.classList.add('dt-go');
        img.addEventListener('click', () => hold(room, question, pass));
      }
      el.append(img, h('div', 'g-pix dt-k', part.part));
      if (part.caption) el.append(h('div', 'dt-cap', part.caption));
      if (part.states.length) {
        const st = h('div', 'dt-st');
        for (const state of part.states) {
          const s = h('span', '', state.name);
          if (state.image) {
            s.classList.add('dt-press');
            s.addEventListener('click', () => {
              if (pass && question) {
                const look = pass.variants.findIndex((v) => v.image === state.image);
                hold(room, question, pass, look >= 0 ? look + 1 : 0);
              }
            });
          }
          st.append(s);
        }
        el.append(st);
      }
      row.append(el);
    }
    return row;
  }

  function roomSheet(canvas: HTMLElement, room: DraftRoom): void {
    const main = h('div', 'dt-main');
    if (room.plan.length)
      main.append(
        band('the plan', 'what gets built, a part from wherever it was drawn best'),
        parts(room, 250)
      );
    if (room.questions.length) {
      main.append(band('how it got here', 'every pass, oldest first'));
      const trail = h('div', 'dt-trail');
      for (const question of room.questions) trail.append(fork(room, question));
      main.append(trail);
    }
    if (!room.plan.length && !room.questions.length)
      main.append(h('div', 'dt-quiet g-mute', 'Nothing drawn in this room yet.'));

    const side = h('div', 'dt-side');
    if (room.never.length) {
      const card = h('div', 'dt-card', h('div', 'g-pix dt-cardlabel', 'never bring back'));
      const list = h('div', 'dt-never');
      for (const one of room.never) list.append(h('s', '', one));
      card.append(list);
      side.append(card);
    }
    if (room.brief) {
      const card = h(
        'div',
        'dt-card',
        h('div', 'g-pix dt-cardlabel', 'for whoever draws next'),
        h('p', 'g-serif dt-it', room.brief)
      );
      const line = h('div', 'dt-line', sign('plus', '#f2c66d', 13), 'start a session from here');
      line.addEventListener('click', () => hands.start(`${room.name} design`, briefFor(room)));
      card.append(line);
      side.append(card);
    }
    const loose = room.notes.filter((note) => !note.on || !placed(room, note.on));
    for (const note of loose) side.append(sticky(note.said));
    canvas.append(h('div', 'dt-room', main, side));
  }

  /** Whether a note's `on` names something drawn on this sheet. */
  const placed = (room: DraftRoom, on: string): boolean =>
    room.questions.some((q) => q.ask === on || q.passes.some((p) => p.id === on));

  function sticky(said: string): HTMLElement {
    const note = h('div', 'dt-note', h('div', 'dt-pin'), h('div', 'dt-who', 'you said'), said);
    note.style.setProperty('--tilt', `${((said.length * 37) % 50) / 10 - 2.5}deg`);
    return note;
  }

  function fork(room: DraftRoom, question: DraftQuestion): HTMLElement {
    const el = h('div', `dt-fork dt-${question.state}`);
    const won = question.picked.map((id) => passIn(room, id)?.name || id).filter(Boolean);
    el.append(h('div', 'dt-q', question.ask), h('div', 'dt-knot'));
    const row = h('div', 'dt-passes');
    for (const pass of question.passes) {
      const picked = question.picked.includes(pass.id);
      const live =
        question.state === 'open' &&
        pass === question.passes[question.passes.length - 1] &&
        !picked;
      const one = h('div', `dt-pass${picked ? ' dt-picked' : ''}${live ? ' dt-live' : ''}`);
      one.append(pic(pass.image, 200));
      if (pass.variants.length) one.append(h('span', 'dt-more', `+${pass.variants.length}`));
      one.append(h('span', 'dt-id', pass.id));
      one.title = pass.name || pass.id;
      one.addEventListener('click', () => hold(room, question, pass));
      row.append(one);
    }
    el.append(row);
    el.append(
      h(
        'div',
        'dt-n',
        question.state === 'dropped'
          ? 'put down'
          : won.length
            ? won.join(', ')
            : question.state === 'open'
              ? 'still open'
              : 'none taken'
      )
    );
    const notes = room.notes.filter(
      (note) =>
        note.on && (note.on === question.ask || question.passes.some((p) => p.id === note.on))
    );
    if (notes.length) {
      const row = h('div', 'dt-notes');
      for (const note of notes) row.append(sticky(note.said));
      el.append(row);
    }
    return el;
  }

  function hold(room: DraftRoom, question: DraftQuestion, pass: DraftPass, look = 0): void {
    held = { room, question, pass, look };
    paint();
  }

  function holdUp(): HTMLElement {
    const { room, question, pass, look } = held!;
    const looks = [{ name: pass.name || 'as drawn', image: pass.image }, ...pass.variants];
    const at = Math.min(look, looks.length - 1);
    const over = h('div', 'dt-hold');
    over.addEventListener('click', (event) => {
      if (event.target === over) {
        held = null;
        paint();
      }
    });
    const stage = h('div', 'dt-stage', pic(looks[at]!.image, 1600, 'dt-big'));
    const info = h('div', 'dt-info');
    const picked = question.picked.includes(pass.id);
    const plan = room.plan.filter((part) => part.pass === pass.id).map((part) => part.part);
    info.append(
      h('div', 'g-pix', question.ask),
      h('h2', 'g-serif dt-h2', `${pass.id}${pass.name ? ` · ${pass.name}` : ''}`),
      h(
        'div',
        'dt-chips',
        picked
          ? chip('taken', MOSS)
          : question.state === 'open' && pass === question.passes.at(-1)
            ? chip('being drawn', EMBER)
            : chip('passed on', IDLE),
        plan.length ? chip(`in the plan · ${plan.join(', ')}`, MOSS) : null
      )
    );
    if (pass.said) info.append(h('p', 'dt-said', pass.said));
    const notes = room.notes.filter((note) => note.on === pass.id);
    for (const note of notes) info.append(sticky(note.said));
    if (looks.length > 1) {
      info.append(h('div', 'g-pix dt-label', `${looks.length} looks`));
      const strip = h('div', 'dt-looks');
      looks.forEach((one, i) => {
        const cell = h(
          'div',
          `dt-look${i === at ? ' on' : ''}`,
          pic(one.image, 160),
          h('span', '', one.name)
        );
        cell.addEventListener('click', () => hold(room, question, pass, i));
        strip.append(cell);
      });
      info.append(strip);
    }
    const i = question.passes.indexOf(pass);
    const steps = h('div', 'dt-steps');
    const prev = question.passes[i - 1];
    const next = question.passes[i + 1];
    if (prev) {
      const back = h('span', 'dt-line', `‹ ${prev.id}`);
      back.addEventListener('click', () => hold(room, question, prev));
      steps.append(back);
    }
    steps.append(h('span', 'g-faint', `${i + 1} of ${question.passes.length} for this`));
    if (next) {
      const on = h('span', 'dt-line', `${next.id} ›`);
      on.addEventListener('click', () => hold(room, question, next));
      steps.append(on);
    }
    info.append(steps);
    over.append(stage, info);
    return over;
  }

  /** What a fresh session is told: the brief, and where the board is so it can read the rest. */
  function briefFor(room: DraftRoom): string {
    return [
      `Pick up the design of ${room.name}. ${room.brief}`,
      room.never.length ? `Never bring back: ${room.never.join('; ')}.` : '',
      `Everything drawn so far, which passes were taken and what was said about them is on the drafting table, in ${root}/board.json; read it with the drafting_table tool before you draw anything.`,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  async function refresh(): Promise<void> {
    if (!where) return;
    const asked = where;
    const got = await hands.read(asked.path, stamp).catch(() => null);
    if (!got || where !== asked || got.same) return;
    stamp = got.stamp;
    root = got.root;
    trouble = got.trouble;
    if (got.board || !got.trouble) board = got.board;
    if (held) {
      const room = board ? roomOf(held.room.id) : undefined;
      const question = room?.questions.find((q) => q.ask === held!.question.ask);
      const pass = question?.passes.find((p) => p.id === held!.pass.id);
      held = room && question && pass ? { room, question, pass, look: held.look } : null;
    }
    paint();
  }

  const keys = (event: KeyboardEvent): void => {
    if (!up || event.metaKey) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (held) {
        held = null;
        paint();
      } else if (sheet) show('');
      else hands.close();
      return;
    }
    if (held && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const { room, question, pass } = held;
      const i = question.passes.indexOf(pass) + (event.key === 'ArrowLeft' ? -1 : 1);
      const to = question.passes[i];
      if (to) hold(room, question, to);
      return;
    }
    event.stopImmediatePropagation();
  };

  return {
    get up() {
      return up;
    },
    open(at) {
      if (where?.path !== at.path) {
        board = null;
        stamp = undefined;
        sheet = '';
        trouble = null;
      }
      where = at;
      held = null;
      up = true;
      wash.style.display = '';
      window.addEventListener('keydown', keys, true);
      paint();
      void refresh().then(() => {
        /* Straight into whatever is being drawn, if only one room is. */
        if (board && !sheet) {
          const drawing = board.rooms.filter((room) => room.state === 'drawing');
          if (drawing.length === 1 && !board.flow.length) show(drawing[0]!.id);
        }
      });
      timer ??= setInterval(() => void refresh(), 1500);
      requestAnimationFrame(() => wash.classList.add('dt-in'));
    },
    close() {
      if (!up) return;
      up = false;
      window.removeEventListener('keydown', keys, true);
      if (timer) clearInterval(timer);
      timer = null;
      wash.classList.remove('dt-in');
      wash.style.display = 'none';
    },
  };
}
