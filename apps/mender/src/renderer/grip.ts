/**
 * The top of the window is held like any Mac window's title bar.
 *
 * The frame hides its own title bar so the village runs to the top edge, which
 * left nothing to hold: a drag up there panned the island instead. So a press
 * along the top that lands on nothing pressable moves the window, and a
 * double-click there does what a title bar's would. Anything pressable up
 * there, the rack or the way home, takes its own pointer and never gets here:
 * the writing only takes the pointer where it can be pressed, so a press that
 * reaches the canvas or the page itself is a press on nothing. Wood that takes
 * the pointer without being pressable, the rack's own bar, says so with
 * `data-grip`.
 */
const TOP = 28;

export function watchGrip(canvas: HTMLCanvasElement): void {
  const holdable = (event: MouseEvent): boolean =>
    event.button === 0 &&
    event.clientY < TOP &&
    (event.target === canvas ||
      event.target === document.body ||
      event.target === document.documentElement ||
      (event.target instanceof HTMLElement && event.target.dataset.grip !== undefined));

  window.addEventListener(
    'pointerdown',
    (event) => {
      if (!holdable(event)) return;
      event.stopPropagation();
      event.preventDefault();
      const target = event.target as Element;
      target.setPointerCapture(event.pointerId);
      window.mender.grip('start');
      const move = (): void => window.mender.grip('move');
      const up = (): void => {
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', up);
        target.removeEventListener('pointercancel', up);
      };
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', up);
      target.addEventListener('pointercancel', up);
    },
    { capture: true }
  );

  window.addEventListener(
    'dblclick',
    (event) => {
      if (!holdable(event)) return;
      event.stopPropagation();
      window.mender.grip('double');
    },
    { capture: true }
  );
}
