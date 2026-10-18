/**
 * The one place you write.
 *
 * Every board in this app ends in the same line, and everything that takes
 * input arrives on it: saying the next thing to an agent, naming a branch,
 * writing a commit message, looking for a file, calling a session something
 * else. There is no second field anywhere, and there is deliberately no box, no
 * outline and no placeholder styling around this one.
 *
 * It is a contenteditable, and that is a choice rather than a shortcut. Writing
 * is the one thing in this village that people already know how to do from
 * every other program they own: selecting a word, dragging over three, undo,
 * pasting from somewhere else, and typing a language whose input method needs
 * somewhere real to compose. Reimplementing all of that on top of a keydown
 * listener would be several hundred lines that are worse than the browser's.
 *
 * The one thing the browser gets wrong for us is the caret, which blinks at
 * whatever rate the machine feels like. This village blinks at its own rate, in
 * steps, like everything else that moves here, so the real caret is made
 * invisible and a drawn one follows it.
 */

/** What the line says when it is empty, which is different every time. */
export type Asking =
  | 'say'
  | 'start'
  | 'branch'
  | 'commit'
  | 'amend'
  | 'look'
  | 'name'
  | 'file'
  | 'changes'
  | 'answer'
  | 'own'
  | 'server'
  | 'skill'
  | 'built';

const PROMPTS: Record<Asking, string> = {
  say: '',
  start: '› say what you want built',
  built: '› say what you want built',
  branch: '› call it something',
  commit: '› say what this does',
  amend: '› say it differently',
  look: '› what are you looking for',
  name: '› call it something else',
  file: '› say something about this file',
  changes: '› say something about these changes',
  answer: '› answer it',
  own: '› or write your own answer',
  server: '› its name, then the command',
  skill: '› its name',
};

/**
 * A picture being carried, as it stands on the line.
 *
 * It sits among the words where it was pasted, the way Claude Code writes
 * `[Image #2]` into its prompt, so it is deleted the way a word is: backspace
 * over it and it is put down. Pointing at it shows the picture.
 */
export interface Token {
  id: string;
  label: string;
  /** Where the picture itself can be read from, for pointing at it. */
  preview?: string;
}

export interface Line {
  readonly root: HTMLElement;
  /** What is written on it right now. */
  written(): string;
  /** Where the caret is, counted the same way `written()` counts. */
  caret(): number;
  /** Put something on it, or clear it, and the caret at `caret` if given. */
  write(text: string, caret?: number): void;
  /** Change what it asks for when it is empty. */
  asks(what: Asking): void;
  /** Take the keyboard. */
  take(): void;
  /**
   * Give the keyboard back without taking it anywhere else.
   *
   * Used while something taken off a board is being rewritten in place: the
   * writing has moved to sit on that line rather than this one, and a cursor
   * still blinking down here beside a prompt nothing is answering reads as
   * two places to write at once.
   */
  blur(): void;
  /**
   * A key nothing else wanted landed on nothing: take the keyboard back so it
   * lands here. True if the line was there to take it.
   */
  catches(event: KeyboardEvent): boolean;
  /** Return was pressed with something on the line, and where it was written. */
  onSay(run: (said: string, from?: DOMRect) => void): void;
  /**
   * First refusal on Return.
   *
   * What a slash or an @ has opened under the line has one of its lines
   * already picked out, so Return means that line rather than "send this".
   * Whoever is listening says so by answering true, and the line keeps what is
   * written on it and lets the key go by, because picking a file writes its
   * path where the @ is rather than throwing the sentence away.
   */
  onInstead(run: () => boolean): void;
  /**
   * Whether something said is still waiting its turn. An empty Return then
   * means "read it now", which is wanted from wherever the keyboard is, not
   * only from the line.
   */
  onWaiting(run: () => boolean): void;
  /**
   * First refusal on any key, before the line does anything with it. Whatever
   * a slash or an @ has opened walks on the arrows, picks on Tab and closes on
   * Escape; answering true says it took the key.
   */
  onKey(run: (event: KeyboardEvent) => boolean): void;
  /** Where on the screen the character at `index` of what is written sits. */
  at(index: number): DOMRect | null;
  /** Escape was pressed with nothing on the line, so it means something else. */
  onEmpty(run: () => void): void;
  /** Something was typed, for whatever is narrowing underneath. */
  onType(run: (said: string) => void): void;
  /** What is being carried, kept standing on the line among the words. */
  carries(tokens: readonly Token[]): void;
  /** A carried picture was deleted off the line. */
  onPutDown(run: (id: string) => void): void;
  /** One deleted off it came back, by undo. */
  onPickBack(run: (id: string) => void): void;
  close(): void;
}

export function makeLine(at: HTMLElement, asking: Asking = 'say'): Line {
  const root = document.createElement('div');
  root.style.cssText =
    'position:relative;display:flex;align-items:center;flex:1;cursor:text;pointer-events:auto';

  const ghost = document.createElement('span');
  ghost.style.cssText = PROMPT;
  ghost.textContent = PROMPTS[asking];

  const said = document.createElement('span');
  said.contentEditable = 'plaintext-only';
  said.spellcheck = false;
  said.style.cssText = WRITING;

  const cursor = document.createElement('span');
  cursor.style.cssText = CURSOR;

  root.append(ghost, said, cursor);
  at.appendChild(root);

  let say: (said: string, from?: DOMRect) => void = () => {};
  let empty: () => void = () => {};
  let typed: (said: string) => void = () => {};
  let instead: () => boolean = () => false;
  let waiting: () => boolean = () => false;
  let first: (event: KeyboardEvent) => boolean = () => false;
  let putDown: (id: string) => void = () => {};
  let pickBack: (id: string) => void = () => {};
  let carried: readonly Token[] = [];
  /* Backspaced off but not forgotten, since undo puts the very same picture
     back where it was, the way it puts back a word. */
  const putAside = new Map<string, Token>();

  /** The words on the line, with whatever is carried among them left out. */
  function words(within: Node = said): string {
    let text = '';
    const walk = (node: Node): void => {
      for (const child of node.childNodes) {
        if (child instanceof HTMLElement && child.dataset.carried !== undefined) continue;
        if (child instanceof HTMLElement && child.dataset.link !== undefined) {
          text += child.dataset.link;
          continue;
        }
        if (child instanceof Text) text += child.data;
        else if (child instanceof HTMLBRElement) text += '\n';
        else walk(child);
      }
    };
    walk(within);
    return text;
  }

  /* Counted by writing out everything before the caret the same way the
     whole line is written out, so a shortened link or a picture standing
     before it counts exactly as it does there. */
  function caret(): number {
    const where = window.getSelection();
    if (!where || where.rangeCount === 0) return words().length;
    const end = where.getRangeAt(0);
    if (!said.contains(end.endContainer)) return words().length;
    const before = document.createRange();
    before.setStart(said, 0);
    before.setEnd(end.endContainer, end.endOffset);
    return words(before.cloneContents()).length;
  }

  /** Put the caret `index` characters in, counted the way `words()` counts. */
  function caretAt(index: number): void {
    let left = index;
    const range = document.createRange();
    range.selectNodeContents(said);
    range.collapse(false);
    for (const child of [...said.childNodes]) {
      if (child instanceof HTMLElement && child.dataset.carried !== undefined) continue;
      const length =
        child instanceof HTMLElement && child.dataset.link !== undefined
          ? child.dataset.link.length
          : child instanceof Text
            ? child.data.length
            : (child.textContent?.length ?? 0);
      if (left <= length) {
        if (child instanceof Text) range.setStart(child, left);
        else if (left === 0) range.setStartBefore(child);
        else range.setStartAfter(child);
        range.collapse(true);
        break;
      }
      left -= length;
    }
    const where = window.getSelection();
    where?.removeAllRanges();
    where?.addRange(range);
    place();
  }

  function onLine(): HTMLElement[] {
    return [...said.querySelectorAll<HTMLElement>('[data-carried]')];
  }

  /** Stand every carried picture on the line that is not on it yet. */
  function stand(): void {
    const there = new Map(onLine().map((chip) => [chip.dataset.carried ?? '', chip]));
    for (const [id, chip] of there) {
      const token = carried.find((one) => one.id === id);
      if (!token) chip.remove();
      else {
        if (chip.textContent !== token.label) chip.textContent = token.label;
        if (token.preview) chip.dataset.preview = token.preview;
      }
    }
    for (const token of carried) {
      if (there.has(token.id)) continue;
      const chip = tokenChip(token);
      const where = window.getSelection();
      const range = where?.rangeCount ? where.getRangeAt(0) : null;
      if (range && said.contains(range.endContainer)) {
        range.collapse(false);
        range.insertNode(chip);
        range.setStartAfter(chip);
        range.collapse(true);
        where?.removeAllRanges();
        where?.addRange(range);
      } else {
        said.appendChild(chip);
      }
    }
    showing();
  }

  function showing(): void {
    const has = said.textContent !== '';
    ghost.style.display = has ? 'none' : 'inline';
    place();
  }

  /**
   * Put the drawn cursor where the real one is.
   *
   * Read off the selection rather than counted off the text, because the line
   * wraps and a character count says nothing about which row it wrapped onto.
   */
  function place(): void {
    const where = window.getSelection();
    const mine = document.activeElement === said;
    if (!mine || !where || where.rangeCount === 0) {
      cursor.style.left = '0';
      cursor.style.position = 'relative';
      return;
    }
    const range = where.getRangeAt(0).cloneRange();
    range.collapse(false);
    /* A caret sitting between nodes rather than inside text has no box of its
       own, so it is read off the end of the text just before it; the line's
       own box would put it at the far right of the first row. */
    let rect = range.getClientRects()[0];
    /* A newline at the very end of the text opens a row nothing has been
       written on, and a row with nothing on it has no box either, so the
       cursor is stood at the start of the row under the last one by hand. The
       browser also keeps one more newline after the caret there, so the caret
       sits just short of the end rather than at it. */
    let newRow = false;
    const head = document.createRange();
    head.setStart(said, 0);
    head.setEnd(range.endContainer, range.endOffset);
    const tail = document.createRange();
    tail.setStart(range.endContainer, range.endOffset);
    tail.setEnd(said, said.childNodes.length);
    const after = tail.toString();
    if (head.toString().endsWith('\n') && (after === '' || after === '\n')) {
      const walk = document.createTreeWalker(said, NodeFilter.SHOW_TEXT);
      let row: Text | null = null;
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (head.comparePoint(n, (n as Text).length) > 0) break;
        if ((n as Text).data.endsWith('\n')) row = n as Text;
      }
      if (row) {
        const end = document.createRange();
        end.setStart(row, row.length - 1);
        end.setEnd(row, row.length);
        const box = end.getClientRects()[0];
        if (box) {
          rect = box;
          newRow = true;
        }
      }
    }
    if (!rect) {
      const text = lastText(range.endContainer, range.endOffset);
      if (text) {
        const end = document.createRange();
        end.setStart(text, text.length);
        end.setEnd(text, text.length);
        rect = end.getClientRects()[0];
      }
    }
    rect ??= said.getBoundingClientRect();
    const from = root.getBoundingClientRect();
    cursor.style.position = 'absolute';
    if (newRow) {
      const box = said.getBoundingClientRect();
      const row = parseFloat(getComputedStyle(said).lineHeight) || rect.height;
      cursor.style.left = `${Math.round(box.left - from.left)}px`;
      cursor.style.top = `${Math.round(rect.top - from.top + row + (rect.height - 20) / 2)}px`;
      return;
    }
    cursor.style.left = `${Math.round(rect.right - from.left)}px`;
    cursor.style.top = `${Math.round(rect.top - from.top + (rect.height - 20) / 2)}px`;
  }

  /* The whole width of the line is the line. Empty, the part that can
     actually hold a caret is a sliver beside the prompt, and a press anywhere
     else on it used to land on nothing and take the keyboard away instead. */
  root.addEventListener('mousedown', (event) => {
    if (event.target === said) return;
    event.preventDefault();
    take();
  });

  /* Pointing at a picture on the line holds it up. Asked of whatever is under
     the pointer rather than wired to each one, because the one undo puts back
     is not always the very element that was taken off. */
  said.addEventListener('mouseover', (event) => {
    const chip = (event.target as Element | null)?.closest<HTMLElement>('[data-carried]');
    if (chip?.dataset.preview) preview(chip, chip.dataset.preview);
  });
  said.addEventListener('mouseout', (event) => {
    const chip = (event.target as Element | null)?.closest('[data-carried]');
    if (chip && !chip.contains(event.relatedTarget as Node | null)) unpreview();
  });

  said.addEventListener('input', () => {
    /* A picture backspaced off the line is put down, the same as a word
       backspaced off it is gone. */
    const still = new Set(onLine().map((chip) => chip.dataset.carried));
    const gone = carried.filter((one) => !still.has(one.id));
    if (gone.length) {
      carried = carried.filter((one) => still.has(one.id));
      for (const one of gone) {
        putAside.set(one.id, one);
        putDown(one.id);
      }
      unpreview();
    }
    for (const id of still) {
      const back = id === undefined ? undefined : putAside.get(id);
      if (!back) continue;
      putAside.delete(back.id);
      carried = [...carried, back];
      pickBack(back.id);
    }
    showing();
    typed(words());
  });
  document.addEventListener('selectionchange', place);
  said.addEventListener('blur', () => (cursor.style.opacity = '0'));
  said.addEventListener('focus', () => {
    cursor.style.opacity = '';
    place();
  });

  said.addEventListener('keydown', (event) => {
    if (!event.isComposing && first(event)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      /* Return sends. Shift and return is a newline, which is the one thing
         about this line that is exactly what everybody already expects. */
      event.preventDefault();
      /* Unless a slash or an @ has a line picked out, in which case Return
         means that line. It is let through rather than handled here, because
         there is exactly one listener in this app that presses things and two
         of them pressing the same key is how one Return did two things. */
      if (instead()) return;
      /* And when this line does take it, nothing else gets a look. */
      event.stopPropagation();
      send();
      return;
    }
    if (event.key === 'Escape') {
      /* Escape never touches what is written here. It stops whoever is
         working or backs out of the board, and the half-written line rides
         along untouched; throwing it away is backspace's job. */
      /* The line has the keyboard, so its listener sees Escape before the one
         window listener does. Backing out is the window listener's job, and
         `empty` reaches it, so the event must stop here: letting it bubble on
         means the same Escape backs out twice, which walked a file straight
         past its checkout and out to the island. */
      event.preventDefault();
      event.stopPropagation();
      empty();
    }
  });

  /**
   * What lands on the line when something is pasted or dropped on it.
   *
   * A picture is the only thing an agent can actually be shown, and it is
   * handled elsewhere because it does not belong on the line at all: it waits
   * beside it. Everything else that has a path gets written as its path, since
   * a path is the one thing about a file you cannot get across by describing
   * it.
   */
  said.addEventListener('paste', (event) => {
    const text = event.clipboardData?.getData('text/plain');
    if (text === undefined) return;
    event.preventDefault();
    /* Flattened on the way in. Several lines pasted onto a one-line prompt is
       almost always one thing somebody copied with a line break in it. */
    insert(text.replace(/\s*\n\s*/g, ' '));
  });

  /* A paste that lands on nothing is meant for the line, the same as a stray
     letter is. Dictation pastes into whatever has the keyboard, and standing
     in a session with nothing else taking writing, that is here: having to
     press the line first before speaking into it is a step nobody meant. A
     picture is left alone, since the window carries those itself. */
  function strayPaste(event: ClipboardEvent): void {
    if (event.defaultPrevented || !root.getClientRects().length) return;
    if (event.clipboardData?.files.length) return;
    const at = document.activeElement;
    if (at === said) return;
    if (at instanceof HTMLInputElement || at instanceof HTMLTextAreaElement) return;
    if (at instanceof HTMLElement && at !== document.body && at.isContentEditable) return;
    const text = event.clipboardData?.getData('text/plain');
    if (!text) return;
    event.preventDefault();
    take();
    insert(text.replace(/\s*\n\s*/g, ' '));
  }
  document.addEventListener('paste', strayPaste);

  function insert(text: string): void {
    const where = window.getSelection();
    if (!where || where.rangeCount === 0) {
      said.appendChild(linked(text));
    } else {
      const range = where.getRangeAt(0);
      range.deleteContents();
      const nodes = linked(text);
      const last = nodes.lastChild;
      range.insertNode(nodes);
      if (last) range.setStartAfter(last);
      range.collapse(true);
      where.removeAllRanges();
      where.addRange(range);
    }
    said.scrollTop = said.scrollHeight;
    showing();
    typed(words());
  }

  function send(): void {
    const text = words().trim();
    const from = said.getBoundingClientRect();
    said.textContent = '';
    showing();
    say(text, from);
  }

  function take(): void {
    said.focus();
    const range = document.createRange();
    range.selectNodeContents(said);
    range.collapse(false);
    const where = window.getSelection();
    where?.removeAllRanges();
    where?.addRange(range);
    place();
  }

  showing();

  return {
    root,
    written: () => words(),
    caret,
    write: (text, at) => {
      said.replaceChildren(linked(text));
      stand();
      if (at === undefined) return;
      said.focus();
      caretAt(at);
    },
    asks: (what) => {
      ghost.textContent = PROMPTS[what];
      showing();
    },
    take,
    blur: () => said.blur(),
    catches: (event) => {
      if (!root.getClientRects().length) return false;
      const at = document.activeElement;
      if (at === said) return false;
      if (at instanceof HTMLElement && at !== document.body && at.isContentEditable) return false;
      /* Return sends from anywhere a letter would have landed here from, as
         long as there is something written to send. An empty line on Return
         calls off whoever is working, and that is not a thing a stray press
         somewhere on the board should be able to do. */
      if (event.key === 'Enter') {
        if (event.shiftKey || event.isComposing || event.defaultPrevented) return false;
        if (at instanceof HTMLInputElement || at instanceof HTMLTextAreaElement) return false;
        if (!words().trim() && !carried.length && !waiting()) return false;
        event.preventDefault();
        take();
        if (instead()) return true;
        send();
        return true;
      }
      /* Backspace lands on the line the same as a letter does, so a picture
         standing at its end is put down without pressing the line first. */
      if (event.key === 'Backspace') {
        if (event.metaKey || event.ctrlKey || event.altKey) return false;
        if (at instanceof HTMLInputElement || at instanceof HTMLTextAreaElement) return false;
        if (!said.textContent) return false;
        take();
        return true;
      }
      if (event.key.length !== 1) return false;
      take();
      return true;
    },
    onSay: (run) => (say = run),
    onInstead: (run) => (instead = run),
    onWaiting: (run) => (waiting = run),
    onKey: (run) => (first = run),
    at: (index) => {
      /* Walked off the text itself, because a contenteditable is free to split
         what is written into as many nodes as it likes. */
      let left = index;
      const walker = document.createTreeWalker(
        said,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node) => {
            if (!(node instanceof HTMLElement)) {
              return node.parentElement?.closest('[data-link]')
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT;
            }
            if (node.dataset.carried !== undefined) return NodeFilter.FILTER_REJECT;
            return node.dataset.link !== undefined
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_SKIP;
          },
        }
      );
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        /* A shortened link counts as the whole address it stands for, and
           anything under it is pointed at by the shortening itself. */
        if (node instanceof HTMLElement) {
          const length = node.dataset.link?.length ?? 0;
          if (left < length) return node.getBoundingClientRect();
          left -= length;
          continue;
        }
        const length = node.textContent?.length ?? 0;
        if (left <= length) {
          const range = document.createRange();
          range.setStart(node, Math.min(left, length));
          range.setEnd(node, Math.min(left + 1, length));
          const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
          return rect.width || rect.height ? rect : null;
        }
        left -= length;
      }
      return null;
    },
    onEmpty: (run) => (empty = run),
    onType: (run) => (typed = run),
    carries: (tokens) => {
      carried = tokens;
      stand();
    },
    onPutDown: (run) => (putDown = run),
    onPickBack: (run) => (pickBack = run),
    close: () => {
      unpreview();
      document.removeEventListener('selectionchange', place);
      document.removeEventListener('paste', strayPaste);
      root.remove();
    },
  };
}

/** Long enough that writing it out in full drowns what is said round it. */
const LONG_LINK = 40;

/**
 * Text as it goes onto the line, with every long address in it shortened.
 *
 * A pasted link is usually a tracking-laden mile of query string, and it
 * buried the sentence it was pasted into. So it stands on the line as where
 * it goes, `[expedia.com]`, the way a picture stands as `[picture 1]`, and
 * the whole address is still what gets said. Backspace takes it off whole.
 */
function linked(text: string): DocumentFragment {
  const out = document.createDocumentFragment();
  let from = 0;
  for (const found of text.matchAll(/https?:\/\/[^\s<>"'`]+/g)) {
    const url = found[0].replace(/[.,;:!?)\]}'"]+$/, '');
    const at = found.index;
    let host: string;
    try {
      host = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      continue;
    }
    if (url.length < LONG_LINK || !host) continue;
    if (at > from) out.appendChild(document.createTextNode(text.slice(from, at)));
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.dataset.link = url;
    chip.title = url;
    chip.textContent = `[${host}]`;
    chip.style.cssText = CHIP;
    out.appendChild(chip);
    from = at + url.length;
  }
  if (from < text.length) out.appendChild(document.createTextNode(text.slice(from)));
  return out;
}

/** One carried picture as it stands among the words. */
function tokenChip(token: Token): HTMLElement {
  const chip = document.createElement('span');
  chip.contentEditable = 'false';
  chip.dataset.carried = token.id;
  chip.textContent = token.label;
  if (token.preview) chip.dataset.preview = token.preview;
  chip.style.cssText = CHIP;
  return chip;
}

let showingPicture: HTMLElement | null = null;

/**
 * The picture itself, standing over the word that stands for it. Several
 * stand side by side, and one still being read off the disk arrives when it
 * has been.
 */
export function preview(
  chip: HTMLElement,
  urls: string | readonly (string | Promise<string | null>)[]
): void {
  unpreview();
  const frame = document.createElement('div');
  frame.style.cssText = PICTURE;
  /* Nothing stands there until a picture has actually arrived to stand. */
  frame.style.visibility = 'hidden';
  document.body.appendChild(frame);
  showingPicture = frame;
  for (const url of typeof urls === 'string' ? [urls] : urls) {
    const img = document.createElement('img');
    img.style.cssText = 'display:block;max-width:320px;max-height:240px';
    img.addEventListener('load', () => {
      frame.style.visibility = '';
      place();
    });
    frame.appendChild(img);
    void Promise.resolve(url).then((src) => {
      if (showingPicture !== frame) return;
      if (src) img.src = src;
      else img.remove();
    });
  }
  const place = (): void => {
    const at = chip.getBoundingClientRect();
    const size = frame.getBoundingClientRect();
    const left = Math.max(8, Math.min(at.left, window.innerWidth - size.width - 8));
    frame.style.left = `${Math.round(left)}px`;
    frame.style.top = `${Math.round(Math.max(8, at.top - size.height - 10))}px`;
  };
  place();
  /* The board is drawn again under the pointer as things change, and what it
     was pointing at can go without the pointer ever leaving it. */
  const watch = (): void => {
    if (showingPicture !== frame) return;
    if (!chip.isConnected) unpreview();
    else requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
}

export function unpreview(): void {
  showingPicture?.remove();
  showingPicture = null;
}

/** The text node that ends just before `offset` inside `node`, if any. */
function lastText(node: Node, offset: number): Text | null {
  if (node instanceof Text) return node;
  for (let i = Math.min(offset, node.childNodes.length) - 1; i >= 0; i--) {
    const child = node.childNodes[i]!;
    if (child instanceof Text && child.length) return child;
    const inner = child.childNodes.length ? lastText(child, child.childNodes.length) : null;
    if (inner) return inner;
  }
  return null;
}

const HAND = "font-family:'Mender Hand',cursive;font-size:22px;line-height:1.2";

const PROMPT = `${HAND};color:#ab9470;pointer-events:none`;

const WRITING = [
  HAND,
  'color:#f4e3c0',
  'outline:none',
  'min-width:1px',
  'white-space:pre-wrap',
  'word-break:break-word',
  /* It grows a row at a time as you write, up to a third of the window, and
     past that it scrolls inside itself rather than climbing over the board. */
  'max-height:32vh',
  'overflow-y:auto',
  'scrollbar-width:none',
  /* The browser's own caret is turned off and ours is drawn instead, because
     this village blinks in steps and the machine's caret does not. */
  'caret-color:transparent',
].join(';');

const CHIP = [
  HAND,
  'color:#ab9470',
  'white-space:nowrap',
  'margin:0 3px',
  'cursor:default',
  'user-select:all',
].join(';');

const PICTURE = [
  'position:fixed',
  'display:flex',
  'gap:4px',
  'z-index:1000',
  'padding:4px',
  'background:#1b1712',
  'border:1px solid #6a5a44',
  'box-shadow:0 6px 18px rgba(0,0,0,0.5)',
  'pointer-events:none',
].join(';');

const CURSOR = [
  'width:2px',
  'height:20px',
  'background:#f4e3c0',
  'animation:yard-blink 900ms steps(1,end) infinite',
  'pointer-events:none',
  'flex:none',
].join(';');
