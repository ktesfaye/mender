/**
 * What the village lays into Jira's own page.
 *
 * Jira is shown as it is, with its own top bar, sidebar, project header and
 * cookie banner taken off while it shows a board or a ticket, so what is left
 * is the work and nothing that says "website". Anywhere else (the list of
 * projects, a filter, someone's profile) it keeps its own navigation, since
 * that is how a different board is found.
 *
 * On top of it go the village's own few things: a pick ring and a launch
 * button on every card and on every child row of an epic, a launch button
 * beside a ticket's status (and a pin beside an epic's), a clock on whatever
 * is being set up in the background, and the lantern of whichever session is
 * already working on a ticket. All of it is
 * found by Jira's own test ids, and when Jira changes those it simply stops
 * appearing; the strip over the page still launches whatever is open.
 *
 * The page speaks back by writing `PAGE_SAYS` lines to its console, which the
 * webview hands to the village; nothing of the village is reachable from in
 * there.
 */

export const PAGE_SAYS = 'mender⟩';

export const PAGE_CSS = `
/* Jira's own dark theme, retinted to the village at night: frosted glass for
   its page, its cream ink, and gold where Jira would be blue. Jira draws everything from
   these tokens, so the whole page follows; the status and label colours are
   left as Jira has them, since they mean something. */
html[data-color-mode] {
  --ds-surface: transparent !important;
  --ds-elevation-surface-current: transparent !important;
  --ds-surface-hovered: rgba(244, 227, 192, 0.05) !important;
  --ds-surface-pressed: rgba(244, 227, 192, 0.09) !important;
  --ds-surface-sunken: rgba(12, 9, 5, 0.32) !important;
  --ds-surface-raised: rgba(46, 37, 27, 0.78) !important;
  --ds-surface-raised-hovered: rgba(56, 46, 34, 0.86) !important;
  --ds-surface-raised-pressed: rgba(64, 52, 39, 0.9) !important;
  --ds-surface-overlay: #2c241a !important;
  --ds-surface-overlay-hovered: #352c21 !important;
  --ds-surface-overlay-pressed: #3e3427 !important;
  --ds-surface-container: rgba(244, 227, 192, 0.04) !important;
  --ds-surface-container-hovered: rgba(244, 227, 192, 0.07) !important;
  --ds-surface-container-pressed: rgba(244, 227, 192, 0.1) !important;
  --ds-text: #ecdcb8 !important;
  --ds-text-subtle: #bba783 !important;
  --ds-text-subtlest: #988563 !important;
  --ds-text-inverse: #1d1811 !important;
  --ds-icon: #ecdcb8 !important;
  --ds-icon-subtle: #bba783 !important;
  --ds-icon-subtlest: #988563 !important;
  --ds-border: rgba(244, 227, 192, 0.13) !important;
  --ds-border-input: #6b5a42 !important;
  --ds-border-input-search: rgba(244, 227, 192, 0.13) !important;
  --ds-background-input: #2a2219 !important;
  --ds-background-input-hovered: #322920 !important;
  --ds-background-input-pressed: #2a2219 !important;
  --ds-background-neutral: rgba(244, 227, 192, 0.07) !important;
  --ds-background-neutral-hovered: rgba(244, 227, 192, 0.12) !important;
  --ds-background-neutral-pressed: rgba(244, 227, 192, 0.2) !important;
  --ds-background-neutral-subtle-hovered: rgba(244, 227, 192, 0.07) !important;
  --ds-background-neutral-subtle-pressed: rgba(244, 227, 192, 0.12) !important;
  --ds-background-selected: rgba(224, 181, 106, 0.14) !important;
  --ds-background-selected-hovered: rgba(224, 181, 106, 0.2) !important;
  --ds-background-selected-pressed: rgba(224, 181, 106, 0.3) !important;
  --ds-background-selected-bold: #e0b56a !important;
  --ds-background-selected-bold-hovered: #f0cf8a !important;
  --ds-background-selected-bold-pressed: #b08f52 !important;
  --ds-background-brand-subtlest: rgba(224, 181, 106, 0.14) !important;
  --ds-background-brand-subtlest-hovered: rgba(224, 181, 106, 0.2) !important;
  --ds-background-brand-subtlest-pressed: rgba(224, 181, 106, 0.3) !important;
  --ds-background-brand-bold: #e0b56a !important;
  --ds-background-brand-bold-hovered: #f0cf8a !important;
  --ds-background-brand-bold-pressed: #b08f52 !important;
  --ds-text-selected: #e0b56a !important;
  --ds-text-brand: #e0b56a !important;
  --ds-icon-selected: #e0b56a !important;
  --ds-icon-brand: #e0b56a !important;
  --ds-link: #e0b56a !important;
  --ds-link-pressed: #f0cf8a !important;
  --ds-border-selected: #e0b56a !important;
  --ds-border-brand: #e0b56a !important;
  --ds-border-focused: #f0cf8a !important;
}
/* The page itself is see-through, so the village's frosted glass behind it is
   what it sits on; cards and columns float on that. */
html[data-color-mode], html[data-color-mode] body { background: transparent !important; }
html.mender-bare [data-testid="page-layout.banner"],
html.mender-bare [data-testid="page-layout.top-nav"],
html.mender-bare [data-testid="page-layout.sidebar"],
html.mender-bare [data-testid="page-layout.root--skip-links-container"],
html.mender-bare [data-testid="horizontal-nav-header.ui.project-header.header"],
html.mender-bare #ak-project-view-navigation nav[aria-label="Breadcrumbs"],
html.mender-bare [data-testid="layout-controller.ui.bottom-right-corner.container.styled-container"],
html.mender-bare [data-testid="feedback-button.horizontal-nav-feedback-button"],
html.mender-bare [data-testid="platform.ui.fullscreen-button.fullscreen-button"] { display: none !important; }
html.mender-bare [data-testid="page-layout.root"] {
  grid-template-areas: "main" !important;
  grid-template-columns: minmax(0, 1fr) !important;
  grid-template-rows: minmax(0, 1fr) !important;
}
html.mender-bare [data-testid="page-layout.main"] { grid-area: main !important; inset-inline-start: 0 !important; inset-block-start: 0 !important; margin: 0 !important; }
html.mender-bare #ak-project-view-navigation,
html.mender-bare #ak-project-view-navigation > div { height: auto !important; min-height: 0 !important; grid-template-rows: auto !important; padding-top: 0 !important; }
html.mender-bare [data-testid="page-layout.main"] { height: 100vh !important; max-height: 100vh !important; }
html.mender-bare #ak-project-view-navigation > div > div:first-child { display: none !important; }

[data-testid="board.content.cell.card"] { position: relative; }
[data-testid="board.content.cell.card"].mender-picked { box-shadow: 0 0 0 2px #e0b56a; border-radius: 4px; }
.mender-bits { position: absolute; bottom: 10px; display: flex; align-items: center; gap: 6px; z-index: 2; opacity: 0; transition: opacity .12s; pointer-events: none; }
[data-testid="board.content.cell.card"]:hover .mender-bits, .mender-bits.held, .mender-picking .mender-bits { opacity: 1; pointer-events: auto; }
.mender-bits button { all: unset; outline: none !important; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; height: 24px; border-radius: 4px; font: 500 12px/1 var(--ds-font-family-body, system-ui), system-ui, sans-serif; color: var(--ds-text-subtle, #a9abaf); }
.mender-bits button:hover { background: var(--ds-background-neutral-subtle-hovered, rgba(255,255,255,.08)); color: var(--ds-text, #cecfd2); }
.mender-pick { width: 24px; justify-content: center; }
.mender-pick i { width: 13px; height: 13px; border-radius: 50%; border: 1.5px solid currentColor; box-sizing: border-box; }
.mender-picked .mender-pick { color: #e0b56a; }
.mender-picked .mender-pick i { background: #e0b56a; border-color: #e0b56a; box-shadow: inset 0 0 0 2px var(--ds-surface-raised, #242528); }
.mender-launch { padding: 0 8px; color: #e0b56a !important; }
.mender-launch:hover { background: rgba(224,181,106,.14) !important; color: #f0cf8a !important; }
.mender-launch svg, .mender-open-launch svg { width: 11px; height: 11px; fill: currentColor; }
.mender-bits .mender-lit { padding: 0 8px 0 6px; max-width: 100%; min-width: 0; overflow: hidden; color: var(--ds-text, #cecfd2) !important; background: rgba(244,227,192,.07); }
.mender-lit span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mender-lit i { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 50%; background: #a89272; }
.mender-lit.working i { background: #f0b85a; animation: mender-breathe 1.8s ease-in-out infinite; box-shadow: 0 0 6px #f0b85a; }
.mender-lit.asking i { background: #ff8a3d; animation: mender-breathe .7s ease-in-out infinite; box-shadow: 0 0 6px #ff8a3d; }
.mender-lit.done i { background: #a8c469; box-shadow: 0 0 5px #a8c469; }
.mender-lit.hurt i, .mender-lit.limited i { background: #f2665a; }
@keyframes mender-breathe { 50% { opacity: .45; } }
.mender-open-launch { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; margin: 0 0 12px 8px; border-radius: 4px; font: 500 14px/1 var(--ds-font-family-body, system-ui), system-ui, sans-serif; color: #1f1a12; background: #e0b56a; }
.mender-open-launch:hover { background: #f0cf8a; }
.mender-open-launch.lit { background: rgba(244,227,192,.07); color: var(--ds-text, #cecfd2); }
.mender-open-launch.lit i { width: 8px; height: 8px; border-radius: 50%; background: #f0b85a; }
.mender-open-launch.setting { background: rgba(244,227,192,.07); color: var(--ds-text-subtle, #bba783); cursor: default; }
.mender-lit.setting { cursor: default; color: var(--ds-text-subtle, #bba783) !important; }
.mender-lit.setting i { background: #f0b85a; animation: mender-breathe 1.1s ease-in-out infinite; }
.mender-lit.setting:hover { background: rgba(244,227,192,.07) !important; }
.mender-clock { font-variant-numeric: tabular-nums; }
.mender-open-pin { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; margin: 0 0 12px 8px; border-radius: 4px; font: 500 14px/1 var(--ds-font-family-body, system-ui), system-ui, sans-serif; color: #e0b56a; box-shadow: inset 0 0 0 1px rgba(224,181,106,.45); }
.mender-open-pin:hover { color: #f0cf8a; background: rgba(224,181,106,.1); }
.mender-open-pin svg { width: 14px; height: 14px; fill: currentColor; }
.mender-open-pin.on { background: #e0b56a; color: #1f1a12; box-shadow: none; }
.mender-open-pin.on:hover { background: #f0cf8a; color: #1f1a12; }
/* A child work item on an epic: launch rides at the right of its summary, shown on hover. */
[data-testid="native-issue-table.ui.issue-row"] > th { position: relative; }
.mender-row-bits { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; gap: 6px; z-index: 3; opacity: 0; transition: opacity .12s; pointer-events: none; padding-left: 14px; background: linear-gradient(90deg, transparent, var(--ds-surface-overlay, #2c241a) 14px); }
[data-testid="native-issue-table.ui.issue-row"]:hover .mender-row-bits, .mender-row-bits.held { opacity: 1; pointer-events: auto; }
.mender-row-bits button { all: unset; outline: none !important; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; height: 24px; max-width: 220px; border-radius: 4px; font: 500 12px/1 var(--ds-font-family-body, system-ui), system-ui, sans-serif; }
.mender-row-bits .mender-launch { background: #e0b56a; color: #1f1a12 !important; }
.mender-row-bits .mender-launch:hover { background: #f0cf8a !important; color: #1f1a12 !important; }
.mender-row-bits .mender-lit { padding: 0 8px 0 6px; min-width: 0; overflow: hidden; color: var(--ds-text, #cecfd2); background: rgba(46,37,27,.95); }
`;

/** Runs inside Jira's page, so it may use nothing from outside itself. */
function inPage(says: string): void {
  type Lit = { task: string; name: string; mood: string };
  /** A ticket being set up in the background: since when, or null while it waits its turn. */
  type Setting = { since: number | null };
  type State = {
    lit: Record<string, Lit>;
    setting: Record<string, Setting>;
    epic: { key: string; pinned: boolean } | null;
  };
  const w = window as unknown as {
    __mender?: { set(state: State): void; clear(): void };
  };
  if (w.__mender) return;
  let lit: Record<string, Lit> = {};
  let setting: Record<string, Setting> = {};
  let epic: State['epic'] = null;
  const picked = new Set<string>();
  const say = (what: unknown): void => console.log(says + JSON.stringify(what));
  const play =
    '<svg viewBox="0 0 10 10"><path d="M2 1.2v7.6c0 .4.4.6.7.4l6-3.8c.3-.2.3-.6 0-.8l-6-3.8C2.4.6 2 .8 2 1.2z"/></svg>';
  const pin =
    '<svg viewBox="0 0 12 12"><path d="M4 1h4l-.6 3.4L9.5 6.5V7.5H6.5V11.5L6 12l-.5-.5V7.5H2.5V6.5l2.1-2.1z"/></svg>';
  const hold = (el: HTMLElement, act: () => void): void => {
    for (const kind of ['pointerdown', 'mousedown', 'mouseup', 'pointerup', 'dragstart'])
      el.addEventListener(kind, (event) => event.stopPropagation());
    el.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      act();
    });
  };
  const keyOf = (card: Element): string | null =>
    card.querySelector('a[href^="/browse/"]')?.getAttribute('href')?.slice(8).split(/[?#]/)[0] ?? null;

  const clockOf = (since: number | null): string => {
    if (since === null) return 'waiting its turn';
    const s = Math.max(0, Math.floor((Date.now() - since) / 1000));
    return `setting up ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  /** The lantern, or the clock while it is still being set up, or null when neither. */
  const lantern = (key: string): HTMLElement | null => {
    const on = lit[key];
    const wait = setting[key];
    if (!on && !wait) return null;
    const b = document.createElement('button');
    b.append(document.createElement('i'));
    const name = document.createElement('span');
    if (on) {
      b.className = `mender-lit ${on.mood}`;
      b.title = 'walk into that session';
      name.textContent = on.name;
      hold(b, () => say({ go: on.task }));
    } else {
      b.className = 'mender-lit setting';
      name.className = 'mender-clock';
      name.dataset.since = String(wait!.since ?? '');
      name.textContent = clockOf(wait!.since);
      hold(b, () => undefined);
    }
    b.append(name);
    return b;
  };
  const sigOf = (key: string): string => {
    const on = lit[key];
    const wait = setting[key];
    return on ? `${key}|${on.task}|${on.name}|${on.mood}` : wait ? `${key}|set|${wait.since}` : key;
  };

  const bare = (): void => {
    const path = location.pathname;
    const work = /\/boards\/\d+|\/browse\/|\/backlog|\/issues\b/.test(path);
    document.documentElement.classList.toggle('mender-bare', work);
  };

  const sayPicked = (): void => {
    document.documentElement.classList.toggle('mender-picking', picked.size > 0);
    say({ picked: [...picked] });
  };

  const launchButton = (key: string): HTMLElement => {
    const go = document.createElement('button');
    go.className = 'mender-launch';
    go.innerHTML = `${play}<span>launch</span>`;
    go.title = `launch ${key} in its own workspace`;
    hold(go, () => say({ launch: picked.has(key) && picked.size > 1 ? [...picked] : [key] }));
    return go;
  };

  const dress = (card: HTMLElement): void => {
    const key = keyOf(card);
    if (!key) return;
    card.classList.toggle('mender-picked', picked.has(key));
    const sig = sigOf(key);
    let bits = card.querySelector<HTMLElement>(':scope > .mender-bits');
    if (bits?.dataset.sig === sig) return;
    bits?.remove();
    bits = document.createElement('div');
    bits.className = 'mender-bits';
    bits.dataset.sig = sig;
    const link = card.querySelector('a[href^="/browse/"][tabindex="-1"]') ?? card.querySelector('a[href^="/browse/"]');
    const from = link?.getBoundingClientRect();
    const box = card.getBoundingClientRect();
    const left = from && from.width ? Math.round(from.right - box.left + 10) : 90;
    bits.style.left = `${left}px`;
    /* Up to the assignee's face, which sits at the card's right. */
    bits.style.maxWidth = `${Math.max(60, Math.round(box.width - left - 54))}px`;
    const on = lantern(key);
    if (on) {
      bits.classList.add('held');
      bits.append(on);
    } else {
      const pick = document.createElement('button');
      pick.className = 'mender-pick';
      pick.title = 'pick it, to launch several at once';
      pick.append(document.createElement('i'));
      hold(pick, () => {
        if (picked.has(key)) picked.delete(key);
        else picked.add(key);
        card.classList.toggle('mender-picked', picked.has(key));
        sayPicked();
      });
      bits.append(pick, launchButton(key));
    }
    card.append(bits);
  };

  /* A child work item listed on an epic (or any ticket's children): launch
     straight off the row, without opening it first. */
  const dressRow = (row: HTMLElement): void => {
    const cell = row.querySelector<HTMLElement>(':scope > th') ?? row.querySelector<HTMLElement>(':scope > td');
    const key = keyOf(row);
    if (!cell || !key) return;
    const sig = sigOf(key);
    let bits = cell.querySelector<HTMLElement>(':scope > .mender-row-bits');
    if (bits?.dataset.sig === sig) return;
    bits?.remove();
    bits = document.createElement('div');
    bits.className = 'mender-row-bits';
    bits.dataset.sig = sig;
    const on = lantern(key);
    if (on) {
      bits.classList.add('held');
      bits.append(on);
    } else {
      const go = document.createElement('button');
      go.className = 'mender-launch';
      go.innerHTML = `${play}<span>launch</span>`;
      go.title = `launch ${key} in its own workspace`;
      go.style.padding = '0 10px';
      hold(go, () => say({ launch: [key] }));
      bits.append(go);
    }
    cell.append(bits);
  };

  const dressOpen = (): void => {
    /* Beside the ticket's status and its other buttons, on their own row. */
    const where = document.querySelector('[data-testid="issue.views.issue-base.foundation.status.status-field-wrapper"]')?.parentElement;
    if (!where) return;
    const key =
      new URLSearchParams(location.search).get('selectedIssue') ??
      location.pathname.match(/\/browse\/([A-Z][A-Z0-9_]*-\d+)/)?.[1] ??
      document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]')?.textContent?.trim();
    if (!key) return;
    const on = lit[key];
    const wait = setting[key];
    const isEpic = epic?.key === key;
    const sig = `${sigOf(key)}|${isEpic ? (epic!.pinned ? 'pinned' : 'epic') : ''}`;
    const had = where.querySelector<HTMLElement>('.mender-open-launch');
    if (had?.dataset.sig === sig) return;
    had?.remove();
    where.querySelector('.mender-open-pin')?.remove();
    if (isEpic) {
      const p = document.createElement('button');
      p.className = `mender-open-pin${epic!.pinned ? ' on' : ''}`;
      p.innerHTML = pin;
      p.title = epic!.pinned ? 'pinned along the top; press to take it off' : 'pin this epic along the top';
      hold(p, () => say({ pin: key }));
      where.append(p);
    }
    const b = document.createElement('button');
    b.className = `mender-open-launch${on ? ' lit' : wait ? ' setting' : ''}`;
    b.dataset.sig = sig;
    if (on) {
      b.append(document.createElement('i'));
      b.append(on.name);
      hold(b, () => say({ go: on.task }));
    } else if (wait) {
      const clock = document.createElement('span');
      clock.className = 'mender-clock';
      clock.dataset.since = String(wait.since ?? '');
      clock.textContent = clockOf(wait.since);
      b.append(clock);
      hold(b, () => undefined);
    } else {
      b.innerHTML = `${play}<span>Launch</span>`;
      hold(b, () => say({ launch: [key] }));
    }
    where.append(b);
  };

  const shoo = (): void => {
    document.querySelector<HTMLElement>('[data-testid="page-layout.banner"] [data-testid="only-necessary-button"]')?.click();
  };

  let queued = false;
  const pass = (): void => {
    queued = false;
    bare();
    shoo();
    document.querySelectorAll<HTMLElement>('[data-testid="board.content.cell.card"]').forEach(dress);
    document.querySelectorAll<HTMLElement>('[data-testid="native-issue-table.ui.issue-row"]').forEach(dressRow);
    dressOpen();
  };
  const soon = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(pass);
  };
  new MutationObserver(soon).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', soon);

  /* The setting-up clocks count while there are any. */
  let ticking: number | undefined;
  const tick = (): void => {
    const any = Object.values(setting).some((one) => one.since !== null);
    if (any && ticking === undefined)
      ticking = window.setInterval(() => {
        document.querySelectorAll<HTMLElement>('.mender-clock').forEach((el) => {
          const text = clockOf(el.dataset.since ? Number(el.dataset.since) : null);
          if (el.textContent !== text) el.textContent = text;
        });
      }, 1000);
    else if (!any && ticking !== undefined) {
      window.clearInterval(ticking);
      ticking = undefined;
    }
  };

  /* Escape is Jira's while anything of Jira's is open over the board; once
     nothing is, it is the village's, and puts the board away. Heard on the
     way down, before Jira's own handlers can swallow it. */
  window.addEventListener('keydown', (event) => {
    const typing = (event.target as HTMLElement | null)?.closest?.('input,textarea,[contenteditable="true"]');
    if (event.key === 'Escape' && !typing && !document.querySelector('[role="dialog"],[role="menu"],[role="listbox"]')) {
      if (picked.size) {
        picked.clear();
        document.querySelectorAll('.mender-picked').forEach((el) => el.classList.remove('mender-picked'));
        sayPicked();
      } else say({ escape: true });
    }
    if (event.metaKey && event.key.toLowerCase() === 'w') {
      event.preventDefault();
      say({ escape: true });
    }
  }, true);

  w.__mender = {
    set: (state) => {
      lit = state.lit;
      setting = state.setting ?? {};
      epic = state.epic ?? null;
      let dropped = false;
      for (const key of [...Object.keys(lit), ...Object.keys(setting)])
        if (picked.delete(key)) dropped = true;
      if (dropped) {
        document.querySelectorAll('.mender-picked').forEach((el) => {
          const key = keyOf(el);
          if (!key || !picked.has(key)) el.classList.remove('mender-picked');
        });
        sayPicked();
      }
      tick();
      soon();
    },
    clear: () => {
      picked.clear();
      document.querySelectorAll('.mender-picked').forEach((el) => el.classList.remove('mender-picked'));
      sayPicked();
    },
  };
  pass();
}

export const PAGE_JS = `(${inPage.toString()})(${JSON.stringify(PAGE_SAYS)});`;
