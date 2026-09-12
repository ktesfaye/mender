/**
 * The one line of text that is allowed to be text.
 *
 * Composing a state reads ten megabytes of world and cuts a coastline round it,
 * which is about a second of nothing on screen, and a village that has not
 * arrived yet is indistinguishable from a village that crashed. This says
 * which. It is temporary in the way a loading bar is temporary: when the world
 * is already up and only the camera is moving, nothing here has anything to say.
 */
let element: HTMLDivElement | undefined;

export function say(message: string | null): void {
  if (!element) {
    element = document.createElement('div');
    element.className = 'notice';
    document.body.appendChild(element);
  }
  element.textContent = message ?? '';
  element.style.opacity = message ? '1' : '0';
}
