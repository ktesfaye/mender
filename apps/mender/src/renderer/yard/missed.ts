/**
 * What happened while he was away, said once, plainly, over the island.
 *
 * Not a toast: no box, no border, nothing to dismiss. Gold is reserved for
 * what is pressable and this line is not — it is read and it settles back on
 * its own, the same way a result on the wood settles once it has had time to
 * be read. It stands over the top of the island rather than inside whatever
 * board happens to be open, since it is not about any one session; it names
 * a session, but does not offer a way in — landing there is one click on the
 * rail or the finder away, same as it always was.
 */

/** Long enough on screen to read a short list, then it fades. */
const STAND_MS = 7000;
const FADE_MS = 600;

export function showMissed(lines: string[]): void {
  if (lines.length === 0) return;

  document.querySelector('.missed-while-away')?.remove();

  const line = document.createElement('div');
  line.className = 'missed-while-away';
  line.textContent = `while you were away — ${lines.join(', ')}`;
  line.style.cssText = [
    'position:fixed',
    'top:16px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:90',
    "font-family:'Josefin Sans',sans-serif",
    'font-size:14px',
    'letter-spacing:.02em',
    'color:#cdbb96',
    'text-shadow:2px 2px 0 #120d07',
    'pointer-events:none',
    'opacity:0',
    `transition:opacity ${FADE_MS}ms ease`,
  ].join(';');
  document.body.appendChild(line);

  requestAnimationFrame(() => {
    line.style.opacity = '1';
  });

  window.setTimeout(() => {
    line.style.opacity = '0';
    window.setTimeout(() => line.remove(), FADE_MS);
  }, STAND_MS);
}
