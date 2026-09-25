/**
 * A diagram you can pan and zoom.
 *
 * A mermaid diagram is drawn at its own size rather than shrunk to fit the
 * column, because shrinking away the width throws away the one thing worth
 * reading on it: its text. So it draws inside a clipped window and the wheel
 * and a drag move it, the way any map does, instead of the page moving
 * around a picture that has already lost its detail.
 */

const MIN_SCALE = 0.35;
const MAX_SCALE = 4;
const SVG_SIZE = /width="([\d.]+)"\s+height="([\d.]+)"/;

/** A pannable, zoomable window onto one drawn SVG. `capWide`/`capTall` bound
    the window itself, not the diagram, which can be dragged past its edges. */
export function makeDiagramView(svg: string, capWide = 640, capTall = 420): HTMLElement {
  const size = SVG_SIZE.exec(svg);
  const wide = size ? Number(size[1]) : capWide;
  const tall = size ? Number(size[2]) : capTall;

  const root = document.createElement('div');
  root.className = 'yard-diagram';
  root.style.cssText = [
    'position:relative',
    'overflow:hidden',
    'max-width:100%',
    'touch-action:none',
    'cursor:grab',
    'border-radius:4px',
  ].join(';');
  root.style.width = `${Math.min(wide, capWide)}px`;
  root.style.height = `${Math.min(tall, capTall)}px`;

  const inner = document.createElement('div');
  inner.innerHTML = svg;
  inner.style.cssText = 'position:absolute;top:0;left:0;transform-origin:0 0;will-change:transform';
  root.appendChild(inner);

  /* Started at whatever fits the window, so a diagram wider than its cap
     opens legible rather than opening cropped at its own full size. */
  let scale = Math.min(1, capWide / wide, capTall / tall);
  let x = 0;
  let y = 0;

  function apply(): void {
    inner.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }
  apply();

  root.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const rect = root.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const before = scale;
      const factor = Math.exp(-event.deltaY * 0.0015);
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
      /* The point under the pointer stays under it, which is what makes a
         zoom read as looking closer rather than as the diagram jumping. */
      x = px - ((px - x) / before) * scale;
      y = py - ((py - y) / before) * scale;
      apply();
    },
    { passive: false }
  );

  let dragging = false;
  let last = { x: 0, y: 0 };
  root.addEventListener('pointerdown', (event) => {
    dragging = true;
    last = { x: event.clientX, y: event.clientY };
    root.setPointerCapture(event.pointerId);
    root.style.cursor = 'grabbing';
  });
  root.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    x += event.clientX - last.x;
    y += event.clientY - last.y;
    last = { x: event.clientX, y: event.clientY };
    apply();
  });
  function stop(): void {
    dragging = false;
    root.style.cursor = 'grab';
  }
  root.addEventListener('pointerup', stop);
  root.addEventListener('pointerleave', stop);

  return root;
}
