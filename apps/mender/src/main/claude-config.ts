import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type {
  ClaudeConfig,
  ClaudeEdit,
  ClaudeHook,
  ClaudePlugin,
  ClaudeStyle,
} from '../shared/claude-config';

type Json = Record<string, unknown>;

const HOME = homedir();
const SETTINGS = join(HOME, '.claude', 'settings.json');
const GLOBAL = join(HOME, '.claude.json');
const PLUGINS = join(HOME, '.claude', 'plugins');
const STYLES = join(HOME, '.claude', 'output-styles');

/** What the CLI itself calls its own three, since they are not on disk. */
const BUILT_IN: ClaudeStyle[] = [
  { id: 'default', name: 'Default', about: 'plain and to the point' },
  { id: 'Explanatory', name: 'Explanatory', about: 'says why as it goes' },
  { id: 'Learning', name: 'Learning', about: 'leaves you bits to write' },
];

function read(path: string): Json {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Json) : {};
  } catch {
    return {};
  }
}

/** Written whole and swapped in, so a terminal reading it mid-write never sees half. Everything in
    the file that is not ours to touch is carried through as it was. */
function write(path: string, value: Json): void {
  mkdirSync(join(path, '..'), { recursive: true });
  const part = `${path}.mender-${process.pid}`;
  writeFileSync(part, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(part, path);
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((one): one is string => typeof one === 'string') : [];
}

function object(value: unknown): Json {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {};
}

function styles(): ClaudeStyle[] {
  const mine: ClaudeStyle[] = [];
  try {
    for (const file of readdirSync(STYLES)) {
      if (!file.endsWith('.md')) continue;
      const text = readFileSync(join(STYLES, file), 'utf8');
      const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
      const name = /^name:\s*(.+)$/m.exec(front)?.[1]?.trim() ?? file.replace(/\.md$/, '');
      const about = /^description:\s*(.+)$/m.exec(front)?.[1]?.trim() ?? 'yours';
      mine.push({ id: name, name, about: `yours · ${about}`.slice(0, 60) });
    }
  } catch {
    // none of his own
  }
  return [...BUILT_IN, ...mine];
}

function hooksOf(settings: Json): ClaudeHook[] {
  const out: ClaudeHook[] = [];
  for (const [event, groups] of Object.entries(object(settings.hooks))) {
    if (!Array.isArray(groups)) continue;
    groups.forEach((group, g) => {
      const one = object(group);
      const hooks = Array.isArray(one.hooks) ? one.hooks : [];
      hooks.forEach((hook, h) => {
        const spec = object(hook);
        const command = typeof spec.command === 'string' ? spec.command : '';
        out.push({
          event,
          matcher: typeof one.matcher === 'string' ? one.matcher : '',
          command,
          at: `${g}:${h}`,
          // Mender's own plumbing, which a person never wrote and should not take out by accident
          ours: /EMDASH_HOOK_|MENDER_HOOK_/.test(command),
        });
      });
    });
  }
  return out;
}

function pluginsOf(settings: Json): { plugins: ClaudePlugin[]; marketplaces: string[] } {
  const enabled = object(settings.enabledPlugins);
  const installed = object(read(join(PLUGINS, 'installed_plugins.json')).plugins);
  const ids = new Set([...Object.keys(enabled), ...Object.keys(installed)]);
  const plugins = [...ids].sort().map((id) => {
    const [name = id, market = ''] = id.split('@');
    const first = Array.isArray(installed[id]) ? object((installed[id] as unknown[])[0]) : {};
    return {
      id,
      name,
      market,
      on: enabled[id] === true,
      version: typeof first.version === 'string' ? first.version : '',
      here: id in installed,
    };
  });
  const known = Object.keys(read(join(PLUGINS, 'known_marketplaces.json')));
  const marketplaces = [...new Set([...known, ...Object.keys(object(settings.extraKnownMarketplaces))])];
  return { plugins, marketplaces };
}

function file(dir: string | null): string {
  return dir ? join(dir, '.claude', 'settings.local.json') : SETTINGS;
}

export function readClaudeConfig(dir: string | null = null): ClaudeConfig {
  const settings = read(SETTINGS);
  const global = read(GLOBAL);
  const scoped = dir ? read(file(dir)) : settings;
  const perms = object(scoped.permissions);
  const days = Number(settings.cleanupPeriodDays);
  return {
    outputStyle: typeof settings.outputStyle === 'string' ? settings.outputStyle : 'default',
    styles: styles(),
    autoCompact: global.autoCompactEnabled !== false,
    compactWindow: typeof settings.autoCompactWindow === 'number' ? settings.autoCompactWindow : null,
    cleanupDays: Number.isFinite(days) ? days : 30,
    switchOnFlag: settings.switchModelsOnFlag === true,
    mode: typeof perms.defaultMode === 'string' ? perms.defaultMode : 'default',
    allow: list(perms.allow),
    ask: list(perms.ask),
    deny: list(perms.deny),
    hooks: hooksOf(settings),
    ...pluginsOf(settings),
  };
}

export function editClaudeConfig(edit: ClaudeEdit, dir: string | null = null): ClaudeConfig {
  if (edit.what === 'autoCompact') {
    const global = read(GLOBAL);
    global.autoCompactEnabled = edit.on;
    write(GLOBAL, global);
    return readClaudeConfig(dir);
  }
  if (edit.what === 'rule' || edit.what === 'mode') {
    const path = file(dir);
    const scoped = read(path);
    const perms = object(scoped.permissions);
    if (edit.what === 'mode') perms.defaultMode = edit.mode;
    else {
      const rules = list(perms[edit.bucket]).filter((one) => one !== edit.rule);
      if (edit.add) rules.push(edit.rule);
      if (rules.length) perms[edit.bucket] = rules;
      else delete perms[edit.bucket];
    }
    scoped.permissions = perms;
    write(path, scoped);
    return readClaudeConfig(dir);
  }
  const settings = read(SETTINGS);
  if (edit.what === 'style') {
    if (edit.style === 'default') delete settings.outputStyle;
    else settings.outputStyle = edit.style;
  } else if (edit.what === 'compactWindow') {
    if (edit.tokens === null) delete settings.autoCompactWindow;
    else settings.autoCompactWindow = edit.tokens;
  } else if (edit.what === 'cleanup') {
    settings.cleanupPeriodDays = edit.days;
  } else if (edit.what === 'flag') {
    settings.switchModelsOnFlag = edit.on;
  } else if (edit.what === 'plugin') {
    const enabled = object(settings.enabledPlugins);
    enabled[edit.id] = edit.on;
    settings.enabledPlugins = enabled;
  } else if (edit.what === 'market') {
    const known = object(settings.extraKnownMarketplaces);
    const name = edit.repo.split('/').pop() ?? edit.repo;
    if (edit.add) known[name] = { source: { source: 'github', repo: edit.repo } };
    else delete known[edit.repo];
    settings.extraKnownMarketplaces = known;
  } else if (edit.what === 'hook') {
    const hooks = object(settings.hooks);
    if (edit.add) {
      const groups = Array.isArray(hooks[edit.event]) ? (hooks[edit.event] as unknown[]) : [];
      const group: Json = { hooks: [{ type: 'command', command: edit.command, timeout: 10 }] };
      if (edit.matcher) group.matcher = edit.matcher;
      groups.push(group);
      hooks[edit.event] = groups;
    } else {
      const [g, h] = (edit.at ?? '').split(':').map(Number);
      const groups = Array.isArray(hooks[edit.event]) ? (hooks[edit.event] as unknown[]) : [];
      const group = object(groups[g ?? -1]);
      const inner = Array.isArray(group.hooks) ? group.hooks : [];
      if (h !== undefined && inner[h] !== undefined) inner.splice(h, 1);
      if (!inner.length && g !== undefined) groups.splice(g, 1);
      if (groups.length) hooks[edit.event] = groups;
      else delete hooks[edit.event];
    }
    settings.hooks = hooks;
  }
  write(SETTINGS, settings);
  return readClaudeConfig(dir);
}
