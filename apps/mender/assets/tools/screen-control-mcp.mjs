#!/usr/bin/env node
/**
 * A Mac controller for whoever is running this session: it can look at the
 * whole screen, switch to any app, and click, type, drag and scroll in it,
 * the same way a hand on the trackpad would. Not a browser-only tool and
 * not scoped to one app on purpose — "go into Arc and do X" and "open
 * System Settings and change Y" are the same kind of request, so this is
 * the same tool for both.
 *
 * A plain MCP server over stdio, written by hand rather than pulled in as a
 * dependency: it is spawned straight out of the packaged app's own assets
 * by `node`, and a script with no node_modules of its own has nothing that
 * can go missing at that point. `cliclick` drives the mouse and keyboard,
 * `osascript` drives AppleScript/JXA for everything cliclick can't reach
 * (which app is where, switching to one, and the one genuinely powerful
 * escape hatch: driving a specific button or field by what it's called
 * rather than by guessing its pixel).
 *
 * Needs Accessibility (for the keyboard/mouse events and UI scripting) and
 * Screen Recording (for the screenshot) granted to Mender itself in System
 * Settings — the one thing here that cannot grant itself, since macOS makes
 * that a human click. A call that fails for that reason says exactly which
 * permission is missing rather than failing silently.
 */
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function run(cmd, args, input) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => resolve({ code, out: out.trim(), err: err.trim() }));
    child.on('error', (e) => resolve({ code: 1, out: '', err: String(e) }));
    if (input !== undefined) {
      child.stdin.write(input);
      child.stdin.end();
    } else child.stdin.end();
  });
}

async function cliclick(args) {
  const r = await run('cliclick', args);
  if (r.code !== 0) {
    const missing = /not permitted|accessibility/i.test(r.err);
    throw new Error(
      missing
        ? 'macOS would not allow this: grant Mender Accessibility access in System Settings → Privacy & Security → Accessibility, then try again.'
        : `cliclick failed: ${r.err || r.out || 'no output'}`
    );
  }
  return r.out;
}

async function osascript(script, lang) {
  const args = lang ? ['-l', lang, '-e', script] : ['-e', script];
  const r = await run('osascript', args);
  if (r.code !== 0) {
    const missing = /not allowed|not authorized|-1743|assistive/i.test(r.err);
    throw new Error(
      missing
        ? 'macOS would not allow this: grant Mender Accessibility access in System Settings → Privacy & Security → Accessibility, then try again.'
        : `osascript failed: ${r.err || r.out || 'no output'}`
    );
  }
  return r.out;
}

function escapeAS(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/* Every coordinate this tool takes or returns is in the same pixels the
   screenshot is, because that is the only ruler whoever is calling this
   actually has. cliclick, underneath, only understands the screen's own
   points, which on a Retina display is half that — so every point in and
   out crosses through here rather than leaving each tool to remember the
   conversion itself. */
let cachedScale = null;
async function scale() {
  if (cachedScale) return cachedScale;
  const out = await osascript(
    'ObjC.import("AppKit"); $.NSScreen.mainScreen.backingScaleFactor',
    'JavaScript'
  ).catch(() => '1');
  cachedScale = Number(out) || 1;
  return cachedScale;
}
async function toPoints(x, y) {
  const s = await scale();
  return { x: Math.round(x / s), y: Math.round(y / s) };
}

const MODIFIERS = new Set(['alt', 'cmd', 'ctrl', 'fn', 'shift']);
const NAMED_KEYS = new Set([
  'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up', 'delete', 'end', 'enter', 'esc',
  'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
  'fwd-delete', 'home', 'page-down', 'page-up', 'return', 'space', 'tab',
]);

const TOOLS = [
  {
    name: 'screenshot',
    description:
      'A picture of the whole screen right now, as it actually is, not a description of it. Look at this before clicking anywhere blind.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async run() {
      const path = join(tmpdir(), `mender-screen-${Date.now()}.png`);
      const r = await run('screencapture', ['-x', path]);
      if (r.code !== 0) {
        throw new Error(
          /not allowed|declined/i.test(r.err)
            ? 'macOS would not allow this: grant Mender Screen Recording access in System Settings → Privacy & Security → Screen Recording, then try again (macOS may need Mender restarted after granting it).'
            : `screencapture failed: ${r.err || 'no output'}`
        );
      }
      const data = await readFile(path);
      await unlink(path).catch(() => {});
      return { image: data.toString('base64'), mimeType: 'image/png' };
    },
  },
  {
    name: 'list_apps',
    description: 'The name of every app that is currently running and visible, so you know what you can switch to.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async run() {
      const out = await osascript(
        'tell application "System Events" to get name of every process whose visible is true'
      );
      return { text: out };
    },
  },
  {
    name: 'activate_app',
    description:
      'Brings an app to the front, launching it first if it is not already running. Do this before clicking into it, the same way a person would switch windows first.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'The app’s name, e.g. "Arc" or "System Settings"' } },
      required: ['name'],
      additionalProperties: false,
    },
    async run({ name }) {
      await osascript(`tell application "${escapeAS(name)}" to activate`);
      return { text: `${name} is in front.` };
    },
  },
  {
    name: 'window_bounds',
    description:
      'Where the frontmost window of an app sits on screen, in pixels: x, y, width, height. Use this to work out where on the screenshot something actually is.',
    inputSchema: {
      type: 'object',
      properties: { app: { type: 'string', description: 'The app’s process name, as list_apps names it' } },
      required: ['app'],
      additionalProperties: false,
    },
    async run({ app }) {
      const out = await osascript(
        `tell application "System Events" to tell process "${escapeAS(app)}" to get {position, size} of front window`
      );
      return { text: out };
    },
  },
  {
    name: 'click',
    description: 'A single click at an exact point on screen, in pixels from the top-left. Take a screenshot first if you are not sure where something is.',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        button: { type: 'string', enum: ['left', 'right', 'double'], description: 'Defaults to left.' },
      },
      required: ['x', 'y'],
      additionalProperties: false,
    },
    async run({ x, y, button }) {
      const cmd = button === 'right' ? 'rc' : button === 'double' ? 'dc' : 'c';
      const at = await toPoints(x, y);
      await cliclick([`${cmd}:${at.x},${at.y}`]);
      return { text: `${button ?? 'left'}-clicked at ${x},${y}.` };
    },
  },
  {
    name: 'move_mouse',
    description: 'Moves the pointer without clicking, e.g. to reveal a hover state before deciding what to click.',
    inputSchema: {
      type: 'object',
      properties: { x: { type: 'number' }, y: { type: 'number' } },
      required: ['x', 'y'],
      additionalProperties: false,
    },
    async run({ x, y }) {
      const at = await toPoints(x, y);
      await cliclick([`m:${at.x},${at.y}`]);
      return { text: `moved to ${x},${y}.` };
    },
  },
  {
    name: 'drag',
    description: 'A real press-move-release drag from one point to another, e.g. to reorder a list, resize something, or move a file.',
    inputSchema: {
      type: 'object',
      properties: {
        fromX: { type: 'number' },
        fromY: { type: 'number' },
        toX: { type: 'number' },
        toY: { type: 'number' },
      },
      required: ['fromX', 'fromY', 'toX', 'toY'],
      additionalProperties: false,
    },
    async run({ fromX, fromY, toX, toY }) {
      const from = await toPoints(fromX, fromY);
      const to = await toPoints(toX, toY);
      await cliclick([
        `dd:${from.x},${from.y}`,
        `w:120`,
        `dm:${to.x},${to.y}`,
        `w:80`,
        `du:${to.x},${to.y}`,
      ]);
      return { text: `dragged from ${fromX},${fromY} to ${toX},${toY}.` };
    },
  },
  {
    name: 'type_text',
    description: 'Types the given text into whatever has focus in the frontmost app, as if typed on the keyboard.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
      additionalProperties: false,
    },
    async run({ text }) {
      await cliclick([`t:${text}`]);
      return { text: `typed ${text.length} characters.` };
    },
  },
  {
    name: 'key_press',
    description:
      'Presses a single named key, optionally held with modifiers. Use this for shortcuts and navigation (enter, tab, arrows, escape, cmd+a) rather than type_text.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'A named key, e.g. "return", "tab", "arrow-down", "esc", or a single letter/digit.' },
        modifiers: {
          type: 'array',
          items: { type: 'string', enum: ['alt', 'cmd', 'ctrl', 'fn', 'shift'] },
          description: 'Held down for the press, e.g. ["cmd"] for cmd+key.',
        },
      },
      required: ['key'],
      additionalProperties: false,
    },
    async run({ key, modifiers }) {
      const mods = (modifiers ?? []).filter((m) => MODIFIERS.has(m));
      const cmds = [];
      if (mods.length) cmds.push(`kd:${mods.join(',')}`);
      cmds.push(NAMED_KEYS.has(key) ? `kp:${key}` : `t:${key}`);
      if (mods.length) cmds.push(`ku:${mods.join(',')}`);
      await cliclick(cmds);
      return { text: `pressed ${mods.length ? mods.join('+') + '+' : ''}${key}.` };
    },
  },
  {
    name: 'scroll',
    description: 'Scrolls the frontmost app at a point, the way a trackpad swipe or mouse wheel would.',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        deltaX: { type: 'number', description: 'Positive scrolls right, negative left. Defaults to 0.' },
        deltaY: { type: 'number', description: 'Positive scrolls down, negative up. Defaults to 0.' },
      },
      required: ['x', 'y'],
      additionalProperties: false,
    },
    async run({ x, y, deltaX, deltaY }) {
      const at = await toPoints(x, y);
      await cliclick([`m:${at.x},${at.y}`]);
      const dx = Math.round(deltaX ?? 0);
      const dy = Math.round(deltaY ?? 0);
      const script = `
ObjC.import('CoreGraphics');
var ev = $.CGEventCreateScrollWheelEvent($(), $.kCGScrollEventUnitPixel, 2, ${-dy}, ${-dx});
$.CGEventPost($.kCGHIDEventTap, ev);
`;
      await osascript(script, 'JavaScript');
      return { text: `scrolled at ${x},${y} by ${dx},${dy}.` };
    },
  },
  {
    name: 'run_applescript',
    description:
      'Raw AppleScript, the one genuinely powerful escape hatch: drives a menu item, a checkbox, a named button or a text field by what it is called rather than by its pixel, which is more reliable than clicking blind when the app supports it (most native Mac apps, including System Settings, do, through "tell application \\"System Events\\" to tell process ..."). Prefer this over click/type when you know the name of the thing you want.',
    inputSchema: {
      type: 'object',
      properties: { script: { type: 'string' } },
      required: ['script'],
      additionalProperties: false,
    },
    async run({ script }) {
      const out = await osascript(script);
      return { text: out || '(no output)' };
    },
  },
];

const BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function reply(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function fail(id, message) {
  send({ jsonrpc: '2.0', id, error: { code: -32000, message } });
}

const rl = createInterface({ input: process.stdin, terminal: false });
rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    return;
  }
  const { id, method, params } = msg;
  if (method === 'initialize') {
    reply(id, {
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'mender-screen-control', version: '0.1.0' },
    });
    return;
  }
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return;
  if (method === 'ping') {
    reply(id, {});
    return;
  }
  if (method === 'tools/list') {
    reply(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    return;
  }
  if (method === 'tools/call') {
    const tool = BY_NAME.get(params?.name);
    if (!tool) {
      fail(id, `no such tool: ${params?.name}`);
      return;
    }
    try {
      const out = await tool.run(params?.arguments ?? {});
      const content = out.image
        ? [{ type: 'image', data: out.image, mimeType: out.mimeType }]
        : [{ type: 'text', text: out.text ?? '' }];
      reply(id, { content, isError: false });
    } catch (error) {
      reply(id, { content: [{ type: 'text', text: String(error?.message ?? error) }], isError: true });
    }
    return;
  }
  if (id !== undefined) fail(id, `unknown method: ${method}`);
});

process.stdin.resume();
