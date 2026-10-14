/**
 * Mermaid, drawn.
 *
 * An agent writes a fenced ` ```mermaid ` block the same way it writes any
 * other code, and it is worth more as a diagram than as text nobody reads a
 * shape off. `beautiful-mermaid` is already in the lockfile for this column;
 * it has no DOM dependency of its own and hands back a plain SVG string,
 * colored here to match the wood rather than its own defaults, so it works
 * equally in the free-drawn transcript and in a plain row of a file board.
 */

import { renderMermaidSVG } from 'beautiful-mermaid';

const COLORS = {
  fg: 'var(--yard-ink-body)',
  line: 'var(--yard-ink-dim)',
  accent: 'var(--yard-gold)',
  muted: 'var(--yard-ink-dim)',
  surface: 'var(--yard-timber-mid)',
  border: 'var(--yard-outline)',
  transparent: true,
} as const;

/* The same colors as plain hex: a CSS variable means nothing to an SVG shut
   inside an `<img>` of its own, which is what a picture row already is. */
const STANDALONE_COLORS = {
  fg: '#dcc8a0',
  line: '#a89272',
  accent: '#e0b56a',
  muted: '#a89272',
  surface: '#4a3520',
  border: '#482510',
  transparent: true,
} as const;

/** The SVG for one mermaid diagram, or null when it will not parse.
    Colored with CSS variables — for drawing straight into this page. */
export function mermaidSVG(text: string): string | null {
  return drawnOnce(laidOut, text, () => renderMermaidSVG(text, COLORS));
}

/** The same, colored in plain hex for an SVG that will live on its own —
    a data URI, which never sees this page's CSS. */
export function mermaidSVGStandalone(text: string): string | null {
  return drawnOnce(laidOutAlone, text, () => renderMermaidSVG(text, STANDALONE_COLORS));
}

/* Laying a diagram out is the slowest thing the board does, and the board is
   written again every time the answer moves, so each diagram is laid out once
   and kept: the newest few hundred, the oldest let go first. */
const KEPT = 200;
const laidOut = new Map<string, string | null>();
const laidOutAlone = new Map<string, string | null>();

function drawnOnce(
  kept: Map<string, string | null>,
  text: string,
  draw: () => string
): string | null {
  if (kept.has(text)) {
    const svg = kept.get(text) ?? null;
    kept.delete(text);
    kept.set(text, svg);
    return svg;
  }
  let svg: string | null;
  try {
    svg = draw();
  } catch {
    svg = null;
  }
  kept.set(text, svg);
  if (kept.size > KEPT) kept.delete(kept.keys().next().value as string);
  return svg;
}
