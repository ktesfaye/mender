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
 * told. Pressing any pass holds it up with every variant it has, and a
 * pass drawn as a page is held up as that page, live, the way a browser
 * would show it, so nothing a session draws needs a browser tab to be seen.
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
  /** `room`, `pass` and `page` lay it open on what a session asked to show. */
  open(at: { project: string; path: string; room?: string; pass?: string; page?: string }): void;
  close(): void;
}

interface Seen {
  image: string;
  title: string;
  says: string;
}

const seenKey = (path: string): string => `mender.drafting.seen:${path}`;

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
  /** A page held up on its own, one no pass on the board names. */
  let paging: string | null = null;
  /** A finished page held up by itself, with only the finished pages to step between. */
  let seeing: { items: Seen[]; at: number } | null = null;
  /** Passes set aside to compare, kept while he goes off to find the next. */
  let tray: { room: string; pass: string }[] = [];
  let comparing = false;
  /** When he last looked, so what has landed since is marked new. */
  let seenAt = Date.now();
  let timer: ReturnType<typeof setInterval> | null = null;
  let canvasScroll = 0;
  let query = '';
  /** Set on opening, so the first paint takes the scroll left at closing. */
  let restoring = false;
  const finder = h('input', 'dt-find') as HTMLInputElement;
  finder.type = 'text';
  finder.placeholder = 'search the designs';
  finder.spellcheck = false;
  finder.addEventListener('input', () => {
    query = finder.value;
    held = null;
    seeing = null;
    canvasScroll = 0;
    repaint();
  });

  /** Paint without the search box losing the cursor it is holding. */
  function repaint(): void {
    const typing = document.activeElement === finder;
    const [from, to] = [finder.selectionStart, finder.selectionEnd];
    paint();
    if (typing) {
      finder.focus();
      finder.setSelectionRange(from, to);
    }
  }

  const abs = (rel: string): string => (rel.startsWith('/') ? rel : `${root}/${rel}`);

  /** A pass's looks: as drawn, each variant, and the page it was drawn as. */
  const looksOf = (pass: DraftPass): { name: string; image?: string; page?: string }[] => [
    { name: pass.name || 'as drawn', image: pass.image },
    ...pass.variants,
    ...(pass.page && /\.html?$/i.test(pass.page)
      ? [{ name: 'the page itself', page: pass.page }]
      : []),
  ];

  /**
   * A page drawn for the table, running, in a webview of its own with nothing
   * of this app's in it. Keys pressed inside it never reach this window, so
   * the few the table answers to are listened for in there and said back.
   */
  const livePage = (rel: string): HTMLElement => {
    const el = document.createElement('webview') as HTMLElement & {
      executeJavaScript(code: string): Promise<unknown>;
    };
    const path = abs(rel);
    el.setAttribute('src', `file://${path.split('/').map(encodeURIComponent).join('/')}`);
    el.setAttribute('partition', 'mender-drafting');
    el.className = 'dt-page';
    el.addEventListener('dom-ready', () => {
      void el
        .executeJavaScript(
          `window.addEventListener('keydown', (e) => {
            const t = e.target && e.target.closest && e.target.closest('input,textarea,[contenteditable="true"]');
            if (!t && ['Escape', 'ArrowLeft', 'ArrowRight'].includes(e.key)) console.log('mender-key:' + e.key);
          }, true);`
        )
        .catch(() => undefined);
    });
    el.addEventListener('console-message', (event) => {
      const said = (event as Event & { message?: string }).message ?? '';
      if (said.startsWith('mender-key:'))
        keys(new KeyboardEvent('keydown', { key: said.slice('mender-key:'.length) }));
    });
    return el;
  };

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

  const inTray = (room: DraftRoom, pass: DraftPass): boolean =>
    tray.some((one) => one.room === room.id && one.pass === pass.id);

  function toggleTray(room: DraftRoom, pass: DraftPass): void {
    tray = inTray(room, pass)
      ? tray.filter((one) => !(one.room === room.id && one.pass === pass.id))
      : [...tray, { room: room.id, pass: pass.id }];
    if (tray.length < 2) comparing = false;
    repaint();
  }

  /** The small ring in a pass's corner that sets it aside to compare. */
  const pickBtn = (room: DraftRoom, pass: DraftPass): HTMLElement => {
    const el = h('span', `dt-pickbtn${inTray(room, pass) ? ' on' : ''}`);
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleTray(room, pass);
    });
    return el;
  };

  const trayItems = (): { room: DraftRoom; question: DraftQuestion; pass: DraftPass }[] =>
    tray.flatMap((one) => {
      const room = roomOf(one.room);
      const pass = room ? passIn(room, one.pass) : undefined;
      const question = room?.questions.find((q) => pass && q.passes.includes(pass));
      return room && pass && question ? [{ room, question, pass }] : [];
    });

  /** What has been set aside, along the foot of the table wherever he goes. */
  function trayStrip(): HTMLElement | null {
    const items = trayItems();
    if (!items.length) return null;
    const el = h('div', 'dt-tray');
    for (const { room, question, pass } of items) {
      const one = h('div', 'dt-tray-one');
      one.title = `${room.name} · ${pass.name || pass.id}`;
      one.append(pic(pass.image, 120));
      const out = h('span', 'dt-tray-x', '×');
      out.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleTray(room, pass);
      });
      one.append(out);
      one.addEventListener('click', () => hold(room, question, pass));
      el.append(one);
    }
    const go = h('span', 'dt-line dt-tray-go', items.length > 1 ? 'compare' : 'pick another to compare');
    if (items.length > 1)
      go.addEventListener('click', () => {
        comparing = true;
        held = null;
        paint();
      });
    else go.classList.add('dt-quiet-line');
    const clear = h('span', 'dt-line dt-tray-clear', 'clear');
    clear.addEventListener('click', () => {
      tray = [];
      comparing = false;
      repaint();
    });
    el.append(go, clear);
    return el;
  }

  /** Everything set aside, side by side, each pass as big as the width allows. */
  function compareUp(): HTMLElement {
    const items = trayItems();
    const over = h('div', 'dt-hold dt-cmp');
    for (const { room, question, pass } of items) {
      const col = h('div', 'dt-cmp-col');
      col.append(h('div', 'dt-cmp-img', pic(pass.image, 900, 'dt-big')));
      const open = h('span', 'dt-line', 'open');
      open.addEventListener('click', () => {
        comparing = false;
        hold(room, question, pass);
      });
      const out = h('span', 'dt-line', 'take out');
      out.addEventListener('click', () => toggleTray(room, pass));
      col.append(
        h(
          'div',
          'dt-cmp-cap',
          h('b', '', `${pass.id}${pass.name ? ` · ${pass.name}` : ''}`),
          h('span', 'g-mute', room.name)
        ),
        h('div', 'dt-cmp-acts', open, out)
      );
      over.append(col);
    }
    return over;
  }

  const stampOf = (pass: DraftPass): number => Date.parse(pass.at ?? '') || 0;
  const isNew = (pass: DraftPass): boolean => stampOf(pass) > seenAt;
  const newest = (room: DraftRoom): number =>
    room.questions.reduce((top, q) => q.passes.reduce((t, p) => Math.max(t, stampOf(p)), top), 0);
  const freshIn = (room: DraftRoom): number =>
    room.questions.reduce((n, q) => n + q.passes.filter(isNew).length, 0);
  /** Rooms with the most recently drawn first; ones never drawn in keep their order after. */
  const byRecent = (rooms: DraftRoom[]): DraftRoom[] =>
    rooms
      .map((room, i) => ({ room, i, at: newest(room) }))
      .sort((a, b) => b.at - a.at || a.i - b.i)
      .map((x) => x.room);

  const thumbs = (room: DraftRoom): string[] => {
    const fromPlan = room.plan.map((part) => partImage(room, part)).filter((x): x is string => !!x);
    if (fromPlan.length) return fromPlan.slice(0, 4);
    const picked = room.questions.flatMap((q) =>
      q.picked.map((id) => passIn(room, id)?.image).filter((x): x is string => !!x)
    );
    if (picked.length) return picked.slice(-4);
    return room.questions.flatMap((q) => q.passes.map((p) => p.image)).slice(-4);
  };

  /** What the held-up view is showing, so a repaint that changes nothing
      about it leaves a running page alone rather than loading it again. */
  const holdKey = (): string =>
    held
      ? JSON.stringify([
          held.room.id,
          held.question.ask,
          held.pass,
          held.look,
          held.question.picked,
          inTray(held.room, held.pass),
          held.room.notes.filter((note) => note.on === held!.pass.id),
        ])
      : comparing
        ? JSON.stringify(['compare', tray])
        : seeing
        ? JSON.stringify(['seeing', seeing.at, seeing.items.map((item) => item.image)])
        : paging
          ? `page:${paging}`
          : '';

  function paint(): void {
    const keep = restoring
      ? canvasScroll
      : (win.querySelector<HTMLElement>('.dt-canvas')?.scrollTop ?? canvasScroll);
    const was = win.querySelector<HTMLElement>(':scope > .dt-hold');
    const key = holdKey();
    const stays = was && key && was.dataset.key === key ? was : null;
    if (stays) {
      for (const child of [...win.children]) if (child !== stays) child.remove();
    } else win.replaceChildren();
    const put = (...nodes: Node[]): void => {
      for (const node of nodes) win.insertBefore(node, stays);
    };
    const shut = h('div', 'g-x', '×');
    shut.addEventListener('click', () => hands.close());
    put(shut);

    const room = sheet ? roomOf(sheet) : undefined;
    if (sheet && !room) sheet = '';

    const way = h('div', 'g-crumbs dt-way');
    const home = h('span', room ? 'g-gold' : 'g-mute', 'the drafting table');
    if (room) home.addEventListener('click', () => show(''));
    way.append(h('span', 'g-mute', where?.project ?? ''), h('span', 'g-faint', '›'), home);
    if (room) way.append(h('span', 'g-faint', '›'), h('span', 'g-mute', room.name));
    put(way);

    if (!board) {
      put(empty());
      return;
    }

    const top = h('div', 'dt-top');
    const titles = h(
      'div',
      '',
      h(
        'h1',
        'g-serif dt-h1',
        query.trim() ? 'searching' : room ? room.name : 'the finished thing'
      ),
      h(
        'div',
        'dt-sub g-mute',
        query.trim() ? 'every pass, in every room' : room ? room.about : board.about || board.title
      )
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
    put(top);

    const body = h('div', 'dt-body');
    body.append(rail());
    const canvas = h('div', 'dt-canvas');
    if (trouble) canvas.append(h('div', 'dt-trouble', trouble));
    if (query.trim()) results(canvas);
    else if (room) roomSheet(canvas, room);
    else finished(canvas);
    body.append(canvas);
    put(body);
    const aside = trayStrip();
    if (aside) put(aside);
    canvas.scrollTop = keep;
    if (restoring) {
      restoring = false;
      requestAnimationFrame(() => (canvas.scrollTop = keep));
    }
    if (!stays && (held || paging || seeing || comparing)) {
      const over = held ? holdUp() : comparing ? compareUp() : seeing ? seeUp() : pageUp(paging!);
      over.dataset.key = key;
      win.append(over);
    }
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
    finder.value = query;
    el.append(finder);
    const all = h('div', `dt-sheet${sheet || query.trim() ? '' : ' on'}`);
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
    for (const room of byRecent(board!.rooms)) {
      const one = h('div', `dt-sheet${sheet === room.id && !query.trim() ? ' on' : ''}`);
      const dot = h('span', 'g-dot');
      dot.style.background = STATE_DOT[room.state];
      const passes = room.questions.reduce((n, q) => n + q.passes.length, 0);
      const fresh = freshIn(room);
      one.append(
        h('b', '', room.name),
        h(
          'div',
          'dt-s',
          dot,
          `${STATE_SAYS[room.state]}${passes ? ` · ${passes} ${passes === 1 ? 'pass' : 'passes'}` : ''}`
        )
      );
      if (fresh) one.append(h('span', 'dt-newbadge', `${fresh} new`));
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
    query = '';
    held = null;
    seeing = null;
    canvasScroll = 0;
    const canvas = win.querySelector<HTMLElement>('.dt-canvas');
    if (canvas) canvas.scrollTop = 0;
    paint();
    const fresh = win.querySelector<HTMLElement>('.dt-canvas');
    if (fresh) fresh.scrollTop = 0;
  }

  /** Every pass, in every room, that the words in the search box all name. */
  function results(canvas: HTMLElement): void {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const found: { room: DraftRoom; question: DraftQuestion; pass: DraftPass }[] = [];
    for (const room of board!.rooms)
      for (const question of room.questions)
        for (const pass of question.passes) {
          const hay = [
            room.name,
            room.about,
            question.ask,
            pass.id,
            pass.name,
            pass.said ?? '',
            ...pass.variants.map((v) => v.name),
            ...room.notes
              .filter((n) => n.on === pass.id || n.on === question.ask)
              .map((n) => n.said),
          ]
            .join(' ')
            .toLowerCase();
          if (words.every((w) => hay.includes(w))) found.push({ room, question, pass });
        }
    canvas.append(
      band(
        found.length ? `${found.length} ${found.length === 1 ? 'pass' : 'passes'}` : 'nothing',
        `named "${query.trim()}"`
      )
    );
    if (!found.length) {
      canvas.append(h('div', 'dt-quiet g-mute', 'No pass, room, question or note says that.'));
      return;
    }
    const grid = h('div', 'dt-found');
    for (const { room, question, pass } of found) {
      const picked = question.picked.includes(pass.id);
      const one = h('div', `dt-hit${picked ? ' dt-took' : ''}`);
      one.append(
        pic(pass.image, 300),
        h('b', '', `${pass.id}${pass.name ? ` · ${pass.name}` : ''}`),
        h('div', 'dt-s', `${room.name} › ${question.ask}`)
      );
      if (picked) one.append(chip('taken', MOSS));
      one.append(pickBtn(room, pass));
      one.addEventListener('click', () => hold(room, question, pass));
      grid.append(one);
    }
    canvas.append(grid);
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
      const items: Seen[] = board!.flow.map((step) => ({
        image: step.image,
        title: step.caption,
        says: step.says,
      }));
      const flow = h('div', 'dt-flow');
      board!.flow.forEach((step, i) => {
        const frame = h('div', 'dt-step');
        const img = h('div', 'dt-img dt-go', pic(step.image, 440));
        img.addEventListener('click', () => see(items, i));
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
      canvas.append(
        band(room.name, `${STATE_SAYS[room.state]}${room.about ? ` · ${room.about}` : ''}`),
        parts(room, 180, true)
      );
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

  function see(items: Seen[], at: number): void {
    seeing = { items, at };
    paint();
  }

  /** A room's finished parts, each state of one right after it. */
  function finishedParts(room: DraftRoom): Seen[] {
    const items: Seen[] = [];
    for (const part of room.plan) {
      const image = partImage(room, part);
      if (image) items.push({ image, title: part.part, says: part.caption });
      for (const state of part.states)
        if (state.image)
          items.push({ image: state.image, title: `${part.part} · ${state.name}`, says: '' });
    }
    return items;
  }

  function parts(room: DraftRoom, tall: number, finishedOnly = false): HTMLElement {
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
      if (finishedOnly) {
        const image = partImage(room, part);
        if (image) {
          const items = finishedParts(room);
          img.classList.add('dt-go');
          img.addEventListener('click', () =>
            see(
              items,
              items.findIndex((item) => item.image === image)
            )
          );
        }
      } else if (pass && question) {
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
              if (finishedOnly) {
                const items = finishedParts(room);
                see(
                  items,
                  Math.max(
                    0,
                    items.findIndex((item) => item.image === state.image)
                  )
                );
              } else if (pass && question) {
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
    const drawn = room.questions
      .flatMap((question, qi) =>
        question.passes.map((pass, pi) => ({ question, pass, order: qi * 1e4 + pi }))
      )
      .sort((a, b) => stampOf(b.pass) - stampOf(a.pass) || b.order - a.order)
      .slice(0, 4);
    if (drawn.length) {
      main.append(band('latest', 'newest first'));
      const row = h('div', 'dt-parts');
      for (const { question, pass } of drawn) {
        const el = h('div', 'dt-part');
        const img = h('div', 'dt-img dt-go');
        img.style.height = '250px';
        img.append(pic(pass.image, 450));
        if (isNew(pass)) img.append(h('span', 'dt-tag dt-tag-open', 'new'));
        img.append(pickBtn(room, pass));
        img.addEventListener('click', () => hold(room, question, pass));
        el.append(img, h('div', 'g-pix dt-k', `${pass.id}${pass.name ? ` · ${pass.name}` : ''}`));
        if (pass.said) el.append(h('div', 'dt-cap', pass.said));
        row.append(el);
      }
      main.append(row);
    }
    if (room.plan.length)
      main.append(
        band('the plan', 'what gets built, a part from wherever it was drawn best'),
        parts(room, 250)
      );
    if (room.questions.length) {
      main.append(band('how it got here', 'every pass, newest first'));
      const trail = h('div', 'dt-trail');
      const order = (question: DraftQuestion): number =>
        question.passes.reduce((t, p) => Math.max(t, stampOf(p)), 0);
      const asked = room.questions
        .map((question, i) => ({ question, i }))
        .sort((a, b) => order(b.question) - order(a.question) || b.i - a.i);
      for (const { question } of asked) trail.append(fork(room, question));
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
    for (const pass of [...question.passes].reverse()) {
      const picked = question.picked.includes(pass.id);
      const live =
        question.state === 'open' &&
        pass === question.passes[question.passes.length - 1] &&
        !picked;
      const one = h('div', `dt-pass${picked ? ' dt-picked' : ''}${live ? ' dt-live' : ''}`);
      one.append(pic(pass.image, 200));
      if (isNew(pass)) one.append(h('span', 'dt-newdot'));
      one.append(pickBtn(room, pass));
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
    const looks = looksOf(pass);
    const at = Math.min(look, looks.length - 1);
    const over = h('div', 'dt-hold');
    over.addEventListener('click', (event) => {
      if (event.target === over) {
        held = null;
        paint();
      }
    });
    const showing = looks[at]!;
    const stage = h(
      'div',
      'dt-stage',
      showing.page ? livePage(showing.page) : pic(showing.image, 1600, 'dt-big')
    );
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
    const aside = h(
      'div',
      'dt-line',
      inTray(room, pass) ? 'set aside to compare, take out' : 'set aside to compare'
    );
    aside.addEventListener('click', () => toggleTray(room, pass));
    info.append(aside);
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
          one.page ? h('div', 'dt-look-page', 'live') : pic(one.image, 160),
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

  /** A finished page on its own: the picture, what it is, and the others either side. */
  function seeUp(): HTMLElement {
    const { items, at } = seeing!;
    const item = items[Math.min(at, items.length - 1)]!;
    const over = h('div', 'dt-hold');
    over.addEventListener('click', (event) => {
      if (event.target === over) {
        seeing = null;
        paint();
      }
    });
    const info = h('div', 'dt-info', h('h2', 'g-serif dt-h2', item.title));
    if (item.says) info.append(h('p', 'dt-said', item.says));
    const steps = h('div', 'dt-steps');
    if (at > 0) {
      const back = h('span', 'dt-line', '‹ back');
      back.addEventListener('click', () => see(items, at - 1));
      steps.append(back);
    }
    steps.append(h('span', 'g-faint', `${at + 1} of ${items.length}`));
    if (at < items.length - 1) {
      const on = h('span', 'dt-line', 'next ›');
      on.addEventListener('click', () => see(items, at + 1));
      steps.append(on);
    }
    info.append(steps);
    over.append(h('div', 'dt-stage', pic(item.image, 1600, 'dt-big')), info);
    return over;
  }

  /** A page held up that no pass names: the page, and where it is. */
  function pageUp(page: string): HTMLElement {
    const over = h('div', 'dt-hold');
    over.addEventListener('click', (event) => {
      if (event.target === over) {
        paging = null;
        paint();
      }
    });
    const name = page.split('/').pop() ?? page;
    over.append(
      h('div', 'dt-stage', livePage(page)),
      h(
        'div',
        'dt-info',
        h('div', 'g-pix', 'a page'),
        h('h2', 'g-serif dt-h2', name.replace(/\.html?$/i, '')),
        h('p', 'dt-said g-mute', page)
      )
    );
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
      if (held || paging || seeing || comparing) {
        held = null;
        paging = null;
        seeing = null;
        comparing = false;
        paint();
      } else if (query) {
        query = '';
        finder.value = '';
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
    if (seeing && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const to = seeing.at + (event.key === 'ArrowLeft' ? -1 : 1);
      if (seeing.items[to]) see(seeing.items, to);
      return;
    }
    event.stopImmediatePropagation();
  };

  /** Lay the table open on what a session asked to show: a pass, held up,
      on its page if that was what was named; a room; or a page on its own. */
  function aim(at: { room?: string; pass?: string; page?: string }): void {
    const named = (room: DraftRoom): boolean =>
      !at.room || room.id === at.room || room.name.toLowerCase() === at.room.toLowerCase();
    const samePage = (page: string | undefined): boolean =>
      !!page && !!at.page && abs(page) === abs(at.page);
    for (const room of board?.rooms.filter(named) ?? []) {
      for (const question of room.questions) {
        for (const pass of question.passes) {
          if ((at.pass && pass.id === at.pass) || (!at.pass && samePage(pass.page))) {
            sheet = room.id;
            const page = at.page ?? (at.pass ? undefined : pass.page);
            const look = page ? looksOf(pass).findIndex((one) => samePage(one.page)) : 0;
            if (look >= 0) return hold(room, question, pass, look);
          }
        }
      }
    }
    const room = board?.rooms.find(named);
    if (at.room && room) show(room.id);
    if (at.page) {
      paging = at.page;
      paint();
    }
  }

  return {
    get up() {
      return up;
    },
    open(at) {
      if (where?.path !== at.path) {
        board = null;
        stamp = undefined;
        sheet = '';
        query = '';
        held = null;
        paging = null;
        seeing = null;
        tray = [];
        comparing = false;
        canvasScroll = 0;
        trouble = null;
      }
      where = at;
      seenAt = Number(localStorage.getItem(seenKey(at.path))) || Date.now();
      if (at.room || at.pass || at.page) {
        held = null;
        paging = null;
        seeing = null;
        query = '';
      }
      up = true;
      restoring = true;
      wash.style.display = '';
      window.addEventListener('keydown', keys, true);
      paint();
      void refresh().then(() => {
        if (at.room || at.pass || at.page) return aim(at);
        /* Something new since he last looked: that room first. */
        const latest = board && byRecent(board.rooms).find((room) => freshIn(room) > 0);
        if (latest) return show(latest.id);
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
      canvasScroll = win.querySelector<HTMLElement>('.dt-canvas')?.scrollTop ?? canvasScroll;
      up = false;
      if (where) localStorage.setItem(seenKey(where.path), String(Date.now()));
      window.removeEventListener('keydown', keys, true);
      if (timer) clearInterval(timer);
      timer = null;
      wash.classList.remove('dt-in');
      wash.style.display = 'none';
    },
  };
}
