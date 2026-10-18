/**
 * Watching it build.
 *
 * The page a session is building, opened over the yard: the real page,
 * running, so whatever it animates moves and whatever it plays plays, with the
 * last change it drew marked on it. Under it, every look taken at it as the
 * agent changed it, oldest first, so dragging along them is watching the page
 * come together; and beside them, what the agent is doing to it right now and
 * the last line it wrote.
 *
 * It is laid over the yard the way a shell is, and kept mounted the same way,
 * so the page is never torn down and reloaded because the agent said
 * something.
 */

import type { Building, Seen } from '../yard/building';
import { longFor } from '../yard/from';
import type { Session, Yard } from '../yard/what';
import { justDrew } from '../yard/yard';

/** The size the page is laid out at, the same the looks were drawn at. */
const PAGE = { width: 1440, height: 900 } as const;

export interface WatchingBuild {
  readonly el: HTMLElement;
  /** Which session's page this is. */
  readonly task: string;
  /** The yard moved: a new look, a new line written, another thing being done. */
  update(yard: Yard): void;
  /** Step one look along the strip, or back to the page as it is now. */
  step(by: number): boolean;
  close(): void;
}

export function watchBuild(task: string, session: Session): WatchingBuild | null {
  const building = session.building;
  if (!building) return null;

  const el = document.createElement('div');
  el.className = 'watch-build';

  const stage = document.createElement('div');
  stage.className = 'watch-build-stage';
  el.appendChild(stage);

  const frame = document.createElement('div');
  frame.className = 'watch-build-frame';
  stage.appendChild(frame);

  /* The page itself, laid out at the size it was drawn at and scaled to the
     room, so what is watched here is the same page the looks are of. */
  const page = document.createElement('webview') as HTMLElement & {
    reload(): void;
    setAudioMuted(muted: boolean): void;
  };
  page.setAttribute('src', building.page.url);
  page.setAttribute('partition', 'mender-building');
  page.className = 'watch-build-page';
  page.style.width = `${PAGE.width}px`;
  page.style.height = `${PAGE.height}px`;
  page.addEventListener('dom-ready', () => page.setAudioMuted(true), { once: true });
  frame.appendChild(page);

  /* A look from before, laid over the live page while it is being looked at. */
  const then = document.createElement('img');
  then.className = 'watch-build-then';
  then.draggable = false;
  frame.appendChild(then);

  const marks = document.createElement('div');
  marks.className = 'watch-build-marks';
  frame.appendChild(marks);

  for (const corner of ['tl', 'tr', 'bl', 'br']) {
    const bracket = document.createElement('i');
    bracket.className = `watch-build-corner watch-build-${corner}`;
    frame.appendChild(bracket);
  }

  const foot = document.createElement('div');
  foot.className = 'watch-build-foot';
  el.appendChild(foot);
  const strip = document.createElement('div');
  strip.className = 'watch-build-strip';
  foot.appendChild(strip);
  const side = document.createElement('div');
  side.className = 'watch-build-side';
  foot.appendChild(side);

  /* The page is fitted to whatever room the board has, which changes with
     the window and with the strip under it. */
  const fit = (): void => {
    const room = stage.getBoundingClientRect();
    if (!room.width || !room.height) return;
    const scale = Math.min(room.width / PAGE.width, room.height / PAGE.height);
    frame.style.width = `${Math.floor(PAGE.width * scale)}px`;
    frame.style.height = `${Math.floor(PAGE.height * scale)}px`;
    page.style.transform = `scale(${scale})`;
  };
  const sizing = new ResizeObserver(fit);
  sizing.observe(stage);

  let looks: Seen[] = building.looks;
  /** Which look is up: an index into `looks`, or null for the page as it is now. */
  let at: number | null = null;
  let reloadedFor = building.looks.at(-1)?.at ?? 0;
  let current: Building = building;

  const drawMarks = (): void => {
    marks.replaceChildren();
    const shown = at === null ? looks.at(-1) : looks[at];
    if (!shown?.drew) return;
    /* Live, it fades the way it does in the column; on a look from before it
       stays, since that is what that look is for. */
    const since = at === null ? Date.now() - shown.when : 0;
    if (at === null && since > 9_000) return;
    marks.appendChild(justDrew(shown.drew, since, true));
  };

  const showAt = (index: number | null): void => {
    at = index === null || index >= looks.length - 1 ? null : Math.max(0, index);
    const shown = at === null ? null : looks[at];
    if (shown) {
      then.src = shown.image;
      then.style.display = 'block';
    } else then.style.display = 'none';
    for (const [i, one] of [...strip.children].entries()) {
      one.classList.toggle('on', at === null ? i === looks.length - 1 : i === at);
    }
    drawMarks();
  };

  /* The looks are one list the session keeps adding to, so what was last
     drawn is counted here rather than read off the list itself. */
  let drawn = 0;
  let drawnLast: Seen | undefined;
  const drawStrip = (): void => {
    drawn = looks.length;
    drawnLast = looks.at(-1);
    strip.replaceChildren();
    const now = Date.now();
    looks.forEach((one, i) => {
      const cell = document.createElement('div');
      cell.className = 'watch-build-look';
      const img = document.createElement('img');
      img.src = one.image;
      img.draggable = false;
      const when = document.createElement('span');
      when.textContent = i === looks.length - 1 ? 'now' : longFor(now - one.at);
      cell.append(img, when);
      cell.dataset.at = String(i);
      strip.appendChild(cell);
    });
    showAt(at);
    strip.scrollLeft = strip.scrollWidth;
  };

  /* Dragging along the strip is watching it come together; letting go
     leaves that look up, and pressing "now" goes back to the live page. */
  let dragging = false;
  const lookUnder = (event: PointerEvent): void => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('.watch-build-look');
    if (cell?.dataset.at !== undefined) showAt(Number(cell.dataset.at));
  };
  strip.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    dragging = true;
    strip.setPointerCapture(event.pointerId);
    lookUnder(event);
  });
  strip.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const cell = hit?.closest<HTMLElement>('.watch-build-look');
    if (cell?.dataset.at !== undefined) showAt(Number(cell.dataset.at));
  });
  const letGo = (): void => {
    dragging = false;
  };
  strip.addEventListener('pointerup', letGo);
  strip.addEventListener('pointercancel', letGo);

  const drawSide = (session: Session): void => {
    side.replaceChildren();
    const doing = document.createElement('div');
    doing.className = 'watch-build-doing';
    if (session.live) {
      doing.textContent = session.live.doing;
      if (session.live.since) {
        const count = document.createElement('span');
        count.className = 'watch-build-since';
        count.textContent = longFor(Date.now() - session.live.since);
        doing.appendChild(count);
      }
    } else {
      doing.classList.add('watch-build-rested');
      doing.textContent = 'not working on it right now';
    }
    side.appendChild(doing);
    const wrote = lastWritten(session);
    if (wrote) {
      const code = document.createElement('div');
      code.className = 'watch-build-code';
      code.textContent = wrote;
      side.appendChild(code);
    }
    const hint = document.createElement('div');
    hint.className = 'watch-build-hint';
    hint.textContent =
      looks.length > 1
        ? `${current.page.name} · drag along the strip to see any look it took`
        : current.page.name;
    side.appendChild(hint);
  };

  drawStrip();
  drawSide(session);

  return {
    el,
    task,
    update: (yard) => {
      const now = yard.session;
      if (!now || now.id !== task) return;
      if (now.building) {
        current = now.building;
        looks = now.building.looks;
        const newest = looks.at(-1)?.at ?? 0;
        /* A file is not served by anything that reloads it, so the page is
           reloaded the moment a look says it changed. A server reloads its
           own page. */
        if (current.page.path && newest > reloadedFor) {
          reloadedFor = newest;
          page.reload();
        }
        if (looks.length !== drawn || looks.at(-1) !== drawnLast) drawStrip();
        else drawMarks();
      }
      drawSide(now);
    },
    step: (by) => {
      if (looks.length < 2) return false;
      const from = at ?? looks.length - 1;
      showAt(Math.min(looks.length - 1, Math.max(0, from + by)));
      return true;
    },
    close: () => {
      sizing.disconnect();
      el.remove();
    },
  };
}

/** The last line it wrote into anything, the way it reads on its step. */
function lastWritten(session: Session): string | undefined {
  for (const step of [...session.steps].reverse()) {
    if (step.kind !== 'write' && step.kind !== 'edit') continue;
    const line = [...(step.diff ?? [])]
      .reverse()
      .find((one) => one.startsWith('+') && one.slice(1).trim().length > 1);
    if (line) return line.length > 160 ? `${line.slice(0, 159)}…` : line;
  }
  return undefined;
}
