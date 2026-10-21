/**
 * The windmill's four Claude Code pages: what its own /config, /permissions, /plugin and /hooks
 * used to print as text, drawn as things to press. All of it lives in Claude's own files, so a
 * terminal session sees exactly what is set here.
 */

import type { Bucket, ClaudeConfig, ClaudeEdit } from '@shared/claude-config';
import { px } from '../glass/px';
import { chip, formRowSub, hintLine, input, pageOf, section } from './settings';

export type ClaudePage = 'claude' | 'perms' | 'plugins' | 'hooks';

export interface ClaudeDoings {
  config(dir: string | null): Promise<ClaudeConfig>;
  edit(edit: ClaudeEdit, dir: string | null): Promise<ClaudeConfig>;
  projects(): { id: string; name: string; path: string }[];
}

const STYLE_BARS: Record<string, number[]> = {
  default: [3, 2, 1],
  Explanatory: [4, 3, 3, 1],
  Learning: [3, 1, 2],
};

const WINDOW = 1_000_000;

const COMPACT_AT = [
  { said: 'auto', tokens: null },
  { said: '200k', tokens: 200_000 },
  { said: '400k', tokens: 400_000 },
  { said: '600k', tokens: 600_000 },
  { said: '1m', tokens: WINDOW },
];

const KEEPS = [
  { said: 'a week', days: 7 },
  { said: 'a month', days: 30 },
  { said: '3 months', days: 90 },
  { said: 'never', days: 3650 },
];

const MODES = [
  { said: 'ask first', mode: 'default' },
  { said: 'accept edits', mode: 'acceptEdits' },
  { said: 'plan', mode: 'plan' },
];

const EVENTS = ['PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'Stop', 'SessionStart'];

const COLUMNS: { bucket: Bucket; said: string; tone: string; icon: string }[] = [
  { bucket: 'allow', said: 'goes ahead', tone: 'moss', icon: 'check' },
  { bucket: 'ask', said: 'asks first', tone: 'ember', icon: 'flame' },
  { bucket: 'deny', said: 'never', tone: 'sore', icon: 'cross' },
];

const STANDS_MS = 4000;

export interface ClaudePages {
  roots: Record<ClaudePage, HTMLElement>;
  /** Reads fresh and draws whichever of them is showing. */
  show(page: ClaudePage): void;
  /** Reads it once, so the rail can say what is set before anybody opens a page. */
  warm(): void;
  /** The line under each name on the rail, once something has been read. */
  subs(): Record<ClaudePage, string>;
}

export function makeClaudePages(
  does: ClaudeDoings,
  took: (part: { saved(said?: string): void }) => void,
  rail: () => void,
  busy: (part: { root: HTMLElement }) => boolean
): ClaudePages {
  let held: ClaudeConfig | null = null;
  let scope: string | null = null;
  let failed = '';
  let showing: ClaudePage = 'claude';
  let hookArmed: string | null = null;
  let hookTimer = 0;
  let hookEvent = EVENTS[0] ?? 'PreToolUse';

  const talks = section('How it talks');
  const room = section('Room to think');
  const house = section('Housekeeping');
  const perms = section('');
  const plugins = section('Installed');
  const markets = section('Marketplaces');
  const hooks = section('Running');
  const addHook = section('Add one');

  const roots: Record<ClaudePage, HTMLElement> = {
    claude: pageOf([talks.root, room.root, house.root]),
    perms: pageOf([perms.root]),
    plugins: pageOf([plugins.root, markets.root]),
    hooks: pageOf([hooks.root, addHook.root]),
  };

  async function write(edit: ClaudeEdit, part: { saved(said?: string): void }): Promise<void> {
    try {
      held = await does.edit(edit, edit.what === 'rule' || edit.what === 'mode' ? scope : null);
      failed = '';
    } catch (error) {
      failed = error instanceof Error ? error.message : 'could not write it';
    }
    took(part);
    rail();
    draw();
  }

  async function load(): Promise<void> {
    try {
      held = await does.config(showing === 'perms' ? scope : null);
    } catch (error) {
      failed = error instanceof Error ? error.message : 'could not read it';
    }
    rail();
    draw();
  }

  function toggle(on: boolean, press: () => void): HTMLButtonElement {
    const made = el('button', on ? 'st-toggle on' : 'st-toggle');
    made.type = 'button';
    made.setAttribute('role', 'switch');
    made.setAttribute('aria-checked', String(on));
    made.addEventListener('click', press);
    return made;
  }

  // ── Claude Code ──────────────────────────────────────────────────────────
  function drawClaude(config: ClaudeConfig): void {
    const cards = el('div', 'cc-styles');
    const current = config.outputStyle;
    for (const one of config.styles) {
      const card = el('button', one.id === current ? 'cc-style picked' : 'cc-style');
      card.type = 'button';
      const art = el('div', 'cc-style-art');
      const bars = STYLE_BARS[one.id] ?? [2, 1];
      for (const [i, width] of bars.entries()) {
        const bar = el('i', i === 1 && one.id === 'Learning' ? 'hot' : '');
        bar.style.width = `${width * 20}%`;
        art.appendChild(bar);
      }
      const name = el('b', '');
      name.textContent = one.name;
      const about = el('span', '');
      about.textContent = one.about;
      card.append(art, name, about);
      card.addEventListener('click', () => {
        if (one.id !== current) void write({ what: 'style', style: one.id }, talks);
      });
      cards.appendChild(card);
    }
    talks.fill([cards]);

    const meter = el('div', 'st-cells');
    const at = config.compactWindow;
    const lit = at === null ? 0 : Math.round((at / WINDOW) * 40);
    for (let i = 0; i < 40; i += 1) meter.appendChild(el('i', i < lit ? 'f' : ''));
    const when = el('div', 'cc-when');
    const label = el('span', 'g-pix');
    label.textContent =
      at === null ? 'auto, tuned for the model' : `packs at ${at >= WINDOW ? '1m' : `${at / 1000}k`} tokens`;
    when.append(meter, label);
    const seg = el('div', 'st-seg');
    for (const one of COMPACT_AT) {
      seg.appendChild(
        chip(
          one.said,
          at === one.tokens,
          () => void write({ what: 'compactWindow', tokens: one.tokens }, room)
        )
      );
    }
    const card = el('div', 'st-card');
    card.append(
      formRowSub(
        'Auto-compact',
        'makes room by itself, packing the start of the talk down when it fills',
        toggle(
          config.autoCompact,
          () => void write({ what: 'autoCompact', on: !config.autoCompact }, room)
        )
      )
    );
    if (config.autoCompact) {
      const pick = el('div', 'cc-pick');
      pick.append(when, seg);
      card.appendChild(formRowSub('How big a head', 'it packs once the talk reaches this', pick));
    }
    room.fill([card]);

    const keeps = el('div', 'st-seg');
    const known = KEEPS.some((one) => one.days === config.cleanupDays);
    for (const one of KEEPS) {
      keeps.appendChild(
        chip(
          one.said,
          one.days === config.cleanupDays,
          () => void write({ what: 'cleanup', days: one.days }, house)
        )
      );
    }
    if (!known) keeps.prepend(chip(`${config.cleanupDays} days`, true, () => undefined));
    house.fill([
      (() => {
        const card = el('div', 'st-card');
        card.append(
          formRowSub('Forget old sessions after', 'its own transcripts, in every project', keeps),
          formRowSub(
            'Step down when it is flagged',
            'switch to another model rather than stall',
            toggle(
              config.switchOnFlag,
              () => void write({ what: 'flag', on: !config.switchOnFlag }, house)
            )
          )
        );
        return card;
      })(),
      hintLine('Left out on purpose: theme, vim mode and voice. The village has one look, one line to write on and no microphone.'),
    ]);
  }

  // ── permissions ──────────────────────────────────────────────────────────
  function drawPerms(config: ClaudeConfig): void {
    const who = el('div', 'st-seg cc-scope');
    who.appendChild(
      chip('every project', scope === null, () => {
        scope = null;
        void load();
      })
    );
    for (const project of does.projects()) {
      who.appendChild(
        chip(`only ${project.name}`, scope === project.path, () => {
          scope = project.path;
          void load();
        })
      );
    }
    const modes = el('div', 'st-seg');
    const listed = MODES.some((one) => one.mode === config.mode);
    for (const one of MODES) {
      modes.appendChild(
        chip(one.said, config.mode === one.mode, () => void write({ what: 'mode', mode: one.mode }, perms))
      );
    }
    if (!listed) modes.prepend(chip(config.mode, true, () => undefined));
    const bar = el('div', 'cc-bar');
    const start = el('div', 'cc-start');
    const startLabel = el('span', 'g-pix');
    startLabel.textContent = 'starts in';
    start.append(startLabel, modes);
    bar.append(who, start);

    const cols = el('div', 'cc-cols');
    for (const col of COLUMNS) {
      const rules = config[col.bucket];
      const box = el('div', `cc-col ${col.tone}`);
      const head = el('div', 'cc-col-head');
      head.appendChild(px(col.icon, 'currentColor', 16));
      const title = el('b', '');
      title.textContent = col.said;
      const count = el('span', '');
      count.textContent = String(rules.length);
      head.append(title, count);
      box.appendChild(head);
      for (const rule of rules) box.appendChild(ruleLine(rule, col.bucket));
      box.appendChild(addRule(col.bucket));
      cols.appendChild(box);
    }
    perms.fill([bar, cols, hintLine('Pressing "always allow" on a question at the gate lands here as a rule, so this is where you take one back.')]);
  }

  function ruleLine(rule: string, bucket: Bucket): HTMLElement {
    const [, tool = rule, arg = ''] = /^([^(]+)(?:\((.*)\))?$/.exec(rule) ?? [];
    const line = el('div', 'cc-rule');
    const name = el('b', '');
    name.textContent = tool;
    const detail = el('code', '');
    detail.textContent = arg;
    detail.title = rule;
    const gone = el('button', 'cc-x');
    gone.type = 'button';
    gone.textContent = '×';
    gone.setAttribute('aria-label', `Take back ${rule}`);
    gone.addEventListener('click', () => void write({ what: 'rule', bucket, rule, add: false }, perms));
    line.append(name, detail, gone);
    return line;
  }

  function addRule(bucket: Bucket): HTMLElement {
    const field = input('', '+ a rule', async (value) => {
      const rule = value.trim();
      if (rule) await write({ what: 'rule', bucket, rule, add: true }, perms);
    });
    field.classList.add('cc-add');
    return field;
  }

  // ── plugins ──────────────────────────────────────────────────────────────
  function drawPlugins(config: ClaudeConfig): void {
    const card = el('div', 'st-card');
    if (!config.plugins.length) card.appendChild(hintLine('None yet.'));
    for (const one of config.plugins) {
      const about = [one.market, one.version, one.here ? '' : 'not fetched yet']
        .filter(Boolean)
        .join(' · ');
      card.appendChild(
        formRowSub(
          one.name,
          about,
          toggle(one.on, () => void write({ what: 'plugin', id: one.id, on: !one.on }, plugins))
        )
      );
    }
    plugins.fill([card]);

    const list = el('div', 'st-card');
    for (const name of config.marketplaces) list.appendChild(formRowSub(name, '', el('span', '')));
    const add = input('', 'owner/repo on GitHub', async (value) => {
      const repo = value.trim();
      if (/^[\w.-]+\/[\w.-]+$/.test(repo)) await write({ what: 'market', repo, add: true }, markets);
    });
    markets.fill([list, formRowSub('Add a marketplace', 'a GitHub repository that lists plugins', add)]);
  }

  // ── hooks ────────────────────────────────────────────────────────────────
  function drawHooks(config: ClaudeConfig): void {
    const card = el('div', 'st-card');
    if (!config.hooks.length) card.appendChild(hintLine('Nothing runs on its own.'));
    for (const one of config.hooks) {
      const key = `${one.event}:${one.at}`;
      const line = el('div', 'cc-hook');
      const event = el('span', 'cc-event');
      event.textContent = one.event;
      const code = el('code', '');
      code.textContent = one.command;
      code.title = one.command;
      const matcher = el('span', 'cc-matcher');
      matcher.textContent = one.matcher ? `on ${one.matcher}` : 'always';
      line.append(event, matcher, code);
      if (one.ours) {
        const mine = el('span', 'cc-ours');
        mine.textContent = 'the village’s own';
        line.appendChild(mine);
      } else {
        const armed = hookArmed === key;
        const gone = el('button', armed ? 'cc-take sore' : 'cc-take');
        gone.type = 'button';
        gone.textContent = armed ? 'press again to take it off' : 'take off';
        gone.addEventListener('click', () => {
          if (!armed) {
            hookArmed = key;
            window.clearTimeout(hookTimer);
            hookTimer = window.setTimeout(() => {
              hookArmed = null;
              draw();
            }, STANDS_MS);
            draw();
            return;
          }
          hookArmed = null;
          void write(
            { what: 'hook', event: one.event, add: false, command: '', at: one.at },
            hooks
          );
        });
        line.appendChild(gone);
      }
      card.appendChild(line);
    }
    hooks.fill([card]);

    const when = el('div', 'st-seg cc-events');
    for (const event of EVENTS) {
      when.appendChild(
        chip(event, event === hookEvent, () => {
          hookEvent = event;
          draw();
        })
      );
    }
    const matcher = input('', 'Bash, Edit|Write… blank for all', async () => undefined);
    const command = input('', 'a shell command', async () => undefined);
    const go = el('button', 'cc-go');
    go.type = 'button';
    go.textContent = 'add it';
    go.addEventListener('click', () => {
      const text = command.value.trim();
      if (!text) return;
      void write(
        { what: 'hook', event: hookEvent, add: true, matcher: matcher.value.trim(), command: text },
        addHook
      );
    });
    addHook.fill([
      formRowSub('When', 'what sets it off', when),
      formRowSub('Only for', 'a tool name, or several with a bar', matcher),
      formRowSub('Runs', 'in the project’s own folder', command, go),
    ]);
  }

  function draw(): void {
    if (!held) {
      const read = failed || 'Reading it…';
      for (const part of [talks, room, house, perms, plugins, markets, hooks]) {
        part.fill([hintLine(read)]);
      }
      return;
    }
    if (failed) {
      const sore = hintLine(failed);
      sore.classList.add('sore');
      talks.fill([sore]);
    }
    if (showing === 'claude' && !failed) {
      drawClaude(held);
    } else if (showing === 'perms') {
      drawPerms(held);
    } else if (showing === 'plugins') {
      drawPlugins(held);
    } else if (showing === 'hooks' && !busy(addHook)) {
      drawHooks(held);
    }
  }

  return {
    roots,
    show(page) {
      showing = page;
      void load();
    },
    warm() {
      void load();
    },
    subs() {
      if (!held) return { claude: '', perms: '', plugins: '', hooks: '' };
      const style = held.styles.find((one) => one.id === held?.outputStyle)?.name ?? 'default';
      const rules = held.allow.length + held.ask.length + held.deny.length;
      const on = held.plugins.filter((one) => one.on).length;
      const own = held.hooks.filter((one) => !one.ours).length;
      return {
        claude: `${style.toLowerCase()} · ${held.autoCompact ? 'room' : 'no room'}`,
        perms: `${rules} ${rules === 1 ? 'rule' : 'rules'}`,
        plugins: `${on} on · ${held.marketplaces.length} marketplace${held.marketplaces.length === 1 ? '' : 's'}`,
        hooks: own ? `${own} running` : 'none of yours',
      };
    },
  };
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string
): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag);
  made.className = className;
  return made;
}
