/**
 * Quitting with the fire still lit, named before it happens.
 *
 * The window itself goes dark, dock-style, and the one thing left standing
 * is the line saying what quitting costs — not a dialog stacked on top of
 * the world, the same shape as every other two-press cost on the wood.
 * Pressing that line again is the second press; anything else, including
 * just waiting, is no.
 */

/** How long the offer stands before it withdraws on its own. */
const STAND_MS = 4000;

export function showQuitCost(n: number): void {
  if (document.querySelector('.quit-cost')) return;

  const scrim = document.createElement('div');
  scrim.className = 'quit-cost';
  scrim.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:100',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'background:rgba(8,6,3,.86)',
    'cursor:default',
  ].join(';');

  const line = document.createElement('div');
  line.textContent = `${n} villager${n === 1 ? ' is' : 's are'} still working. quit anyway?`;
  line.style.cssText = [
    "font-family:'Josefin Sans',sans-serif",
    'font-size:17px',
    'color:#e8c97a',
    'text-shadow:2px 2px 0 #120d07',
    'cursor:pointer',
  ].join(';');
  scrim.appendChild(line);
  document.body.appendChild(scrim);

  let done = false;
  let timer = 0;

  const withdraw = (): void => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    window.removeEventListener('keydown', onKey, true);
    scrim.remove();
  };

  const confirm = (): void => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    window.removeEventListener('keydown', onKey, true);
    scrim.remove();
    window.mender?.confirmQuit?.();
  };

  function onKey(event: KeyboardEvent): void {
    // Holding the modifier on its way to a chord is not a key of its own,
    // and Cmd+Q itself is answered in the main process — the one place that
    // actually knows whether a second press landed in time. Everything
    // else typed or pressed here is no.
    if (event.key === 'Meta' || event.key === 'Control' || event.key === 'Alt') return;
    if (event.key === 'Shift') return;
    if (event.metaKey && event.key.toLowerCase() === 'q') return;
    withdraw();
  }

  line.addEventListener('click', confirm);
  // Anywhere else on the scrim is the same as walking away.
  scrim.addEventListener('click', (event) => {
    if (event.target === line) return;
    withdraw();
  });
  window.addEventListener('keydown', onKey, true);
  timer = window.setTimeout(withdraw, STAND_MS);
}
