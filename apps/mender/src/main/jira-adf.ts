/**
 * A Jira description, as markdown.
 *
 * Jira keeps what a ticket says as a tree (Atlassian Document Format), not as
 * text. The board reads markdown already and so does every agent, so the tree
 * is flattened into that once, here, and both get the same thing: headings,
 * lists, code, quotes, links and tables survive; colours, panels' icons and
 * attached pictures do not, since neither side could do anything with them.
 */

interface Node {
  type: string;
  text?: string;
  content?: Node[];
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

export function adfToMarkdown(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return typeof doc === 'string' ? doc : '';
  return blocks((doc as Node).content ?? [], '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function blocks(nodes: Node[], indent: string): string {
  return nodes.map((node) => block(node, indent)).join('');
}

function block(node: Node, indent: string): string {
  switch (node.type) {
    case 'paragraph':
      return `${indent}${inline(node.content ?? [])}\n\n`;
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 2)));
      return `${'#'.repeat(level)} ${inline(node.content ?? [])}\n\n`;
    }
    case 'bulletList':
    case 'orderedList': {
      const ordered = node.type === 'orderedList';
      const lines = (node.content ?? []).map((item, at) => {
        const lead = ordered ? `${at + 1}. ` : '- ';
        const inner = item.content ?? [];
        const [first, ...rest] = inner;
        const head = first?.type === 'paragraph' ? inline(first.content ?? []) : '';
        const tail = (first?.type === 'paragraph' ? rest : inner)
          .map((child) => block(child, `${indent}  `).replace(/\n+$/, '\n'))
          .join('');
        return `${indent}${lead}${head}\n${tail}`;
      });
      return `${lines.join('')}\n`;
    }
    case 'codeBlock': {
      const lang = typeof node.attrs?.language === 'string' ? node.attrs.language : '';
      return `\`\`\`${lang}\n${plain(node.content ?? [])}\n\`\`\`\n\n`;
    }
    case 'blockquote':
      return `${blocks(node.content ?? [], '')
        .trim()
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')}\n\n`;
    case 'panel':
      return blocks(node.content ?? [], indent);
    case 'rule':
      return '---\n\n';
    case 'table': {
      const rows = (node.content ?? []).map((row) =>
        (row.content ?? []).map((cell) =>
          blocks(cell.content ?? [], '')
            .replace(/\s*\n\s*/g, ' ')
            .trim()
        )
      );
      if (!rows.length) return '';
      const wide = Math.max(...rows.map((row) => row.length));
      const line = (cells: string[]): string =>
        `| ${Array.from({ length: wide }, (_, at) => cells[at] ?? '').join(' | ')} |`;
      return `${[line(rows[0] ?? []), line(Array(wide).fill('---')), ...rows.slice(1).map(line)].join('\n')}\n\n`;
    }
    case 'mediaSingle':
    case 'mediaGroup':
      return '';
    default:
      return node.content ? blocks(node.content, indent) : inline([node]);
  }
}

function inline(nodes: Node[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return marked(node.text ?? '', node.marks ?? []);
        case 'hardBreak':
          return '\n';
        case 'mention':
          return String(node.attrs?.text ?? '');
        case 'emoji':
          return String(node.attrs?.text ?? node.attrs?.shortName ?? '');
        case 'inlineCard':
        case 'blockCard':
          return String(node.attrs?.url ?? '');
        case 'status':
          return String(node.attrs?.text ?? '');
        case 'date': {
          const at = Number(node.attrs?.timestamp);
          return Number.isFinite(at) ? new Date(at).toISOString().slice(0, 10) : '';
        }
        default:
          return node.content ? inline(node.content) : (node.text ?? '');
      }
    })
    .join('');
}

function marked(text: string, marks: NonNullable<Node['marks']>): string {
  let out = text;
  for (const mark of marks) {
    if (mark.type === 'code') out = `\`${out}\``;
    else if (mark.type === 'strong') out = `**${out}**`;
    else if (mark.type === 'em') out = `*${out}*`;
    else if (mark.type === 'link' && typeof mark.attrs?.href === 'string')
      out = `[${out}](${mark.attrs.href})`;
  }
  return out;
}

function plain(nodes: Node[]): string {
  return nodes.map((node) => node.text ?? (node.content ? plain(node.content) : '')).join('');
}
