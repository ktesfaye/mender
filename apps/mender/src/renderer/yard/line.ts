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
  /** Put something on it, or clear it. */
  write(text: string): void;
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
  let first: (event: KeyboardEvent) => boolean = () => false;
  let putDown: (id: string) => void = () => {};
  let carried: readonly Token[] = [];

  /** The words on the line, with whatever is carried among them left out. */
  function words(): string {
    let text = '';
    const walk = (node: Node): void => {
      for (const child of node.childNodes) {
        if (child instanceof HTMLElement && child.dataset.carried !== undefined) continue;
        if (child instanceof Text) text += child.data;
        else if (child instanceof HTMLBRElement) text += '\n';
        else walk(child);
      }
    };
    walk(said);
    return text;
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
      else if (chip.textContent !== token.label) chip.textContent = token.label;
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

  said.addEventListener('input', () => {
    /* A picture backspaced off the line is put down, the same as a word
       backspaced off it is gone. */
    const still = new Set(onLine().map((chip) => chip.dataset.carried));
    const gone = carried.filter((one) => !still.has(one.id));
    if (gone.length) {
      carried = carried.filter((one) => still.has(one.id));
      for (const one of gone) putDown(one.id);
      unpreview();
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
      /* One thing at a time: a half-written line goes first and the board
         behind it only when there is nothing left to throw away. */
      if (said.textContent) {
        event.preventDefault();
        event.stopPropagation();
        said.textContent = '';
        const gone = carried;
        carried = [];
        for (const one of gone) putDown(one.id);
        unpreview();
        showing();
        typed('');
        return;
      }
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
      said.textContent = (said.textContent ?? '') + text;
    } else {
      const range = where.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
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
    written: words,
    write: (text) => {
      said.textContent = text;
      stand();
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
        if (!words().trim() && !carried.length) return false;
        event.preventDefault();
        take();
        if (instead()) return true;
        send();
        return true;
      }
      if (event.key.length !== 1) return false;
      take();
      return true;
    },
    onSay: (run) => (say = run),
    onInstead: (run) => (instead = run),
    onKey: (run) => (first = run),
    at: (index) => {
      /* Walked off the text itself, because a contenteditable is free to split
         what is written into as many nodes as it likes. */
      let left = index;
      const walker = document.createTreeWalker(said, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) =>
          node.parentElement?.closest('[data-carried]')
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      });
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
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
    close: () => {
      unpreview();
      document.removeEventListener('selectionchange', place);
      document.removeEventListener('paste', strayPaste);
      root.remove();
    },
  };
}

/** One carried picture as it stands among the words. */
function tokenChip(token: Token): HTMLElement {
  const chip = document.createElement('span');
  chip.contentEditable = 'false';
  chip.dataset.carried = token.id;
  chip.textContent = token.label;
  chip.style.cssText = CHIP;
  chip.addEventListener('mouseenter', () => {
    if (token.preview) preview(chip, token.preview);
  });
  chip.addEventListener('mouseleave', unpreview);
  return chip;
}

let showingPicture: HTMLElement | null = null;

/** The picture itself, standing over the word that stands for it. */
function preview(chip: HTMLElement, url: string): void {
  unpreview();
  const frame = document.createElement('div');
  frame.style.cssText = PICTURE;
  const img = document.createElement('img');
  img.src = url;
  img.style.cssText = 'display:block;max-width:320px;max-height:240px';
  frame.appendChild(img);
  document.body.appendChild(frame);
  showingPicture = frame;
  const place = (): void => {
    const at = chip.getBoundingClientRect();
    const size = frame.getBoundingClientRect();
    const left = Math.max(8, Math.min(at.left, window.innerWidth - size.width - 8));
    frame.style.left = `${Math.round(left)}px`;
    frame.style.top = `${Math.round(Math.max(8, at.top - size.height - 10))}px`;
  };
  place();
  img.addEventListener('load', place);
}

function unpreview(): void {
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
