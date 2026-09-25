import { catalogData, type CatalogEntryDef } from '@core/primitives/mcp/api';
import type { McpServer } from '@emdash/core/primitives/mcp/api';

/**
 * The catalogue of suggested servers, read straight off Emdash's own list
 * rather than kept twice: a `+` under "what it can reach" walks this rather
 * than a shelf of Mender's own.
 */
export interface CatalogEntry {
  key: string;
  name: string;
  description: string;
}

export const MCP_CATALOG: CatalogEntry[] = Object.entries(catalogData)
  .map(([key, entry]) => ({ key, name: entry.name, description: entry.description }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Turns a catalogue entry into the server Emdash's config writer expects,
 *  scoped to the one agent that is about to get it. */
export function serverFromCatalog(key: string, providerId: string): McpServer | null {
  const entry: CatalogEntryDef | undefined = catalogData[key];
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
