import { catalogData, type CatalogEntryDef } from '@core/primitives/mcp/api';
import type { McpServer } from '@emdash/core/primitives/mcp/api';

/**
 * The catalogue of suggested servers, read straight off Emdash's own list
 * rather than kept twice: a `+` under "what it can reach" walks this rather
 * than a shelf of Mender's own. `MENDER_CATALOG` is the one exception —
 * servers that are ours rather than emdash's, kept apart from its file so
 * pulling upstream never touches this one.
 */
export interface CatalogEntry {
  key: string;
  name: string;
  description: string;
}

/** A path token `serverFromCatalog`'s caller resolves against the app's own
 *  install location, since this file cannot reach Electron's `app` module
 *  without breaking for the renderer, which reads this same catalogue just
 *  to draw the list. */
export const SCREEN_CONTROL_PATH_TOKEN = '{{APP_PATH}}/assets/tools/screen-control-mcp.mjs';

const MENDER_CATALOG: Record<string, CatalogEntryDef> = {
  mender_screen_control: {
    config: {
      command: 'node',
      args: [SCREEN_CONTROL_PATH_TOKEN],
    },
    name: 'Mac controller',
    description:
      'Look at the screen and click, type, drag and scroll in any app — not just a browser',
    docsUrl: '',
    credentialKeys: [],
  },
};

const ALL_CATALOG: Record<string, CatalogEntryDef> = { ...catalogData, ...MENDER_CATALOG };

export const MCP_CATALOG: CatalogEntry[] = Object.entries(ALL_CATALOG)
  .map(([key, entry]) => ({ key, name: entry.name, description: entry.description }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Turns a catalogue entry into the server Emdash's config writer expects,
 *  scoped to the one agent that is about to get it. */
export function serverFromCatalog(key: string, providerId: string): McpServer | null {
  const entry: CatalogEntryDef | undefined = ALL_CATALOG[key];
  if (!entry) return null;
  const config = entry.config;
  const url = typeof config.url === 'string' ? config.url : undefined;
  return {
    name: entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || key,
    transport: url ? 'http' : 'stdio',
    ...(typeof config.command === 'string' ? { command: config.command } : {}),
    ...(Array.isArray(config.args) ? { args: config.args as string[] } : {}),
    ...(url ? { url } : {}),
    ...(config.headers && typeof config.headers === 'object'
      ? { headers: config.headers as Record<string, string> }
      : {}),
    ...(config.env && typeof config.env === 'object'
      ? { env: config.env as Record<string, string> }
      : {}),
    enabled: true,
    providers: [providerId],
  };
}
