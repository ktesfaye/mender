import { describe, expect, it } from 'vitest';
import { adfToMarkdown } from './jira-adf';

describe('adfToMarkdown', () => {
  it('keeps headings, lists, code and links in a description', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'What happens' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'See ' },
            {
              type: 'text',
              text: 'the tab',
              marks: [{ type: 'link', attrs: { href: 'https://x.y' } }],
            },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'sheet.dart', marks: [{ type: 'code' }] },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'two' }] }],
            },
          ],
        },
        {
          type: 'codeBlock',
          attrs: { language: 'dart' },
          content: [{ type: 'text', text: 'final a = 1;' }],
        },
      ],
    };
    expect(adfToMarkdown(doc)).toBe(
      '### What happens\n\nSee [the tab](https://x.y) and `sheet.dart`\n\n- one\n- two\n\n```dart\nfinal a = 1;\n```'
    );
  });
});
