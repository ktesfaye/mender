import { chip, dom, h, label, sign, tile } from '../glass/f';
import { stand } from '../yard/standing';
import type { Row } from './row';

/**
 * A merge that stopped on a conflict, on the wood.
 *
 * The one moment the app most needs an escape hatch: the files it could not
 * settle, listed rather than merely counted, and two ways out — hand the
 * whole thing to whoever is working in here, or give up and go back to how
 * the checkout stood before the merge was tried.
 */
export function conflict(base: string, files: readonly string[], asked: boolean): Row[] {
  const root = h('div', 'f-root');
  root.append(
    h(
      'div',
      'f-top',
      h(
        'div',
        '',
        h('h1', '', `${base} and this don’t agree`),
        h('div', 'f-sub', h('span', 'f-branch', sign('merge', '#9bd28a', 12), base))
      ),
      h(
        'div',
        'f-state',
        chip(`${files.length} ${files.length === 1 ? 'file' : 'files'} stuck`, '#f08a72')
      )
    )
  );
  root.append(
    h(
      'div',
      'f-strip f-sorest',
      sign('warn', '#f08a72', 18),
      h(
        'span',
        '',
        'the merge is half done in the checkout. ',
        h('b', '', 'nothing is committed'),
        ' until it settles or you give up.'
      )
    )
  );

  const left = h('div', '', label('where it stopped'));
  const card = h('div', 'f-card');
  for (const path of files) {
    const cut = path.lastIndexOf('/');
    card.append(
      h(
        'div',
        'f-cf',
        h('span', 'f-ic2', sign('file', '#f08a72', 16)),
        h(
          'div',
          '',
          h('div', 'f-n', path.slice(cut + 1)),
          h('div', 'f-p', cut > 0 ? path.slice(0, cut) : './')
        )
      )
    );
  }
  left.append(card);

  const right = h('div', '', label('what to do'));
  const acts = h('div', 'f-ways');
  acts.append(
    tile(
      'hand',
      'Hand it over',
      'the whole thing, as the next thing said to whoever is working here',
      {
        hot: true,
        pick: 'hand-conflict',
        wide: true,
      }
    )
  );
  const give = tile(
    'undo',
    asked ? 'Press again and the merge is undone' : 'Give up on it',
    'the checkout goes back how it stood',
    { sore: true, pick: asked ? 'abort-merge!' : 'abort-merge', wide: true }
  );
  if (asked) stand(() => give.click(), give);
  acts.append(give);
  right.append(acts);
  if (asked) {
    right.append(
      h(
        'div',
        'f-arm',
        h('b', '', 'this puts the checkout back exactly as it stood'),
        ' before the merge was tried. whatever went in clean comes back out too.'
      )
    );
  }
  root.append(h('div', 'f-two', left, right));
  return [dom(root)];
}

/** What goes on the gatepost when a conflict is handed to whoever is working. */
export function conflictMessage(base: string, files: readonly string[]): string {
  const said = files.map((path) => `- ${path}`).join('\n');
  return `bringing in ${base} left these files conflicted. settle them:\n${said}`;
}
