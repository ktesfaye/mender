/**
 * Markdown, as a Jira document.
 *
 * The other way round from `adfToMarkdown`: what is written in a description
 * or a comment here goes back to Jira as its own tree, so headings, lists,
 * code, quotes and links land in Jira as themselves rather than as asterisks.
 */

interface Node {
  type: string;
  text?: string;
  content?: Node[];
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

export function markdownToAdf(markdown: string): Record<string, unknown> {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  return { type: 'doc', version: 1, content: blocks(lines) };
}

const LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

function blocks(lines: string[]): Node[] {
  const out: Node[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const fence = line.match(/^\s*```\s*(\S*)\s*$/);
    if (fence) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i] ?? '')) code.push(lines[i++] ?? '');
      i += 1;
      out.push({
        type: 'codeBlock',
        ...(fence[1] ? { attrs: { language: fence[1] } } : {}),
        content: code.length ? [{ type: 'text', text: code.join('\n') }] : [],
      });
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      out.push({
        type: 'heading',
        attrs: { level: heading[1]!.length },
        content: inline(heading[2] ?? ''),
      });
      i += 1;
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push({ type: 'rule' });
      i += 1;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i] ?? ''))
        quoted.push((lines[i++] ?? '').replace(/^\s*>\s?/, ''));
      out.push({ type: 'blockquote', content: blocks(quoted) });
      continue;
    }
    if (LIST.test(line)) {
      const [node, next] = list(lines, i);
      out.push(node);
      i = next;
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() &&
      !LIST.test(lines[i] ?? '') &&
      !/^(#{1,6})\s|^\s*```|^\s*>/.test(lines[i] ?? '')
    )
      para.push(lines[i++] ?? '');
    const content: Node[] = [];
    para.forEach((one, at) => {
      if (at) content.push({ type: 'hardBreak' });
      content.push(...inline(one));
    });
    out.push({ type: 'paragraph', content });
  }
  return out;
}

function list(lines: string[], start: number): [Node, number] {
  const first = lines[start]!.match(LIST)!;
  const indent = first[1]!.length;
  const ordered = /\d/.test(first[2]!);
  const items: Node[] = [];
  let i = start;
  while (i < lines.length) {
    const m = (lines[i] ?? '').match(LIST);
    if (!m || m[1]!.length !== indent || /\d/.test(m[2]!) !== ordered) break;
    const body: Node[] = [{ type: 'paragraph', content: inline(m[3] ?? '') }];
    i += 1;
    while (i < lines.length) {
      const deeper = (lines[i] ?? '').match(LIST);
      if (deeper && deeper[1]!.length > indent) {
        const [nested, next] = list(lines, i);
        body.push(nested);
        i = next;
        continue;
      }
      break;
    }
    items.push({ type: 'listItem', content: body });
  }
  return [{ type: ordered ? 'orderedList' : 'bulletList', content: items }, i];
}

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*|_[^_\s][^_]*_)|(\[[^\]]+\]\([^)\s]+\))|(https?:\/\/[^\s<>()]+)/g;

function inline(text: string): Node[] {
  const out: Node[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ type: 'text', text: text.slice(last, at) });
    const whole = m[0];
    if (m[1]) out.push({ type: 'text', text: whole.slice(1, -1), marks: [{ type: 'code' }] });
    else if (m[2]) out.push({ type: 'text', text: whole.slice(2, -2), marks: [{ type: 'strong' }] });
    else if (m[3]) out.push({ type: 'text', text: whole.slice(1, -1), marks: [{ type: 'em' }] });
    else if (m[4]) {
      const link = whole.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)!;
      out.push({ type: 'text', text: link[1]!, marks: [{ type: 'link', attrs: { href: link[2]! } }] });
    } else out.push({ type: 'text', text: whole, marks: [{ type: 'link', attrs: { href: whole } }] });
    last = at + whole.length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out.filter((node) => node.type !== 'text' || node.text);
}
