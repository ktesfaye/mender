/**
 * How many of the island's pixels one of the page's is.
 *
 * ⌘+ and ⌘− zoom the page, so every board grows, but the island's canvas is
 * counted in the screen's own pixels so its art never lands between two. Its
 * coordinates are this many times the page's; anything carried from one to the
 * other goes through here.
 */
export function pageZoom(): number {
  return window.mender?.zoom?.() ?? 1;
}
