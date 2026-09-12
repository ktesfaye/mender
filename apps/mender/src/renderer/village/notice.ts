/**
 * The one line of text that is allowed to be text.
 *
 * Composing a state reads ten megabytes of world and cuts a coastline round it,
 * which is about a second of nothing on screen, and a village that has not
 * arrived yet is indistinguishable from a village that crashed. This says
 * which, and it says why a folder was refused. It is temporary in the way a
 * loading bar is temporary: when the world is up and nothing is wrong, it has
 * nothing to say.
 */
let element: HTMLDivElement | undefined;
let clearing: ReturnType<typeof setTimeout> | undefined;

export function say(message: string | null, forMs?: number): void {
  if (!element) {
    element = document.createElement('div');
    element.className = 'notice';
    document.body.appendChild(element);
  }
  clearTimeout(clearing);
  element.textContent = message ?? '';
  element.style.opacity = message ? '1' : '0';
  if (message && forMs) clearing = setTimeout(() => say(null), forMs);
}
