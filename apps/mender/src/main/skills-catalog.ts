import * as https from 'node:https';
import bundledCatalog from '@upstream/features/catalog/node/bundled-catalog.json';

/**
 * Emdash's own bundled catalogue of skills worth teaching an agent — the
 * same list its settings page offers, read here without a network call. A
 * skill's actual teaching (its SKILL.md) is fetched from where the catalogue
 * says it lives only once you ask to install it.
 */
export interface CatalogueSkill {
  id: string;
  name: string;
  about: string;
}

interface BundledSkill {
  id: string;
  displayName: string;
  description: string;
  sourceUrl?: string;
}

const bundled = bundledCatalog as { skills: BundledSkill[] };

export function catalogueSkills(): CatalogueSkill[] {
  return bundled.skills
    .map((skill) => ({ id: skill.id, name: skill.displayName, about: skill.description }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** What a catalogue entry actually teaches, fetched from GitHub. Null if the
    catalogue does not know it, or it could not be read. */
export async function catalogueContent(id: string): Promise<string | null> {
  const found = bundled.skills.find((skill) => skill.id === id);
  const url = mdUrl(found?.sourceUrl);
  if (!url) return null;
  try {
    return await get(url);
  } catch {
    return null;
  }
}

function mdUrl(sourceUrl: string | undefined): string | null {
  if (!sourceUrl) return null;
  const match = /github\.com\/([^/]+\/[^/]+)\/tree\/main\/(.+)/.exec(sourceUrl);
  return match ? `https://raw.githubusercontent.com/${match[1]}/main/${match[2]}/SKILL.md` : null;
}

function get(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'user-agent': 'mender' } }, (res) => {
        if ((res.statusCode ?? 0) >= 400) {
          reject(new Error(`${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      })
      .on('error', reject);
  });
}
