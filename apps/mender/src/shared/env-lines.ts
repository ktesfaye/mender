/**
 * `NAME=value` lines, one per environment variable — the plain text a
 * project's settings window holds for what every session in it carries into
 * a spawn. Blank lines and `#`-led ones are just spacing and notes.
 */
export function parseEnvLines(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const cut = line.indexOf('=');
    if (cut <= 0) continue;
    const name = line.slice(0, cut).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue;
    env[name] = line.slice(cut + 1).trim();
  }
  return env;
}
