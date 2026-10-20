

import { get, set, keys, del } from 'idb-keyval';
import { assertValidRules, runMigrations, type MigrationTable } from './migrations';

const CACHE_VERSION_KEY = 'app_cache_version';
const CURRENT_CACHE_VERSION = 1;

interface CacheEntry {
  version: number;
  timestamp: number;
  data: any;
}

// Rules per namespace, one per `from` version (see ./migrations). Empty while
// every shape is still version 1: when a cached shape changes, bump
// CURRENT_CACHE_VERSION and add a { from, to, migrate } rule here for each
// namespace whose data changed. A namespace with no rule for an old version
// reads as a miss and the stale entry is dropped.
const migrations: MigrationTable = {
  'revisions': [],
  'titlepage': [],
  'profiles': [],
  'projects': [],
  'lounge': [],
  'studio': [],
};

assertValidRules(migrations);

async function migrateLocalStorage() {
  if (typeof window === 'undefined') return;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('scriptos_') || key.startsWith('title_') || key.startsWith('profile_') || key.startsWith('app_cache_'))) {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            const parsed = JSON.parse(val);
            await set(key, parsed);
          } catch {
            await set(key, val);
          }
        }
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.error("Failed to migrate localStorage to IDB:", e);
  }
}

if (typeof window !== 'undefined') {
  migrateLocalStorage().catch(console.error);
}

export async function setCacheItem(key: string, data: any): Promise<void> {
  try {
    const entry: CacheEntry = {
      version: CURRENT_CACHE_VERSION,
      timestamp: Date.now(),
      data,
    };
    await set(key, entry);
  } catch (e: any) {
    console.error('Failed to set cache item:', e);
  }
}

export async function getCacheItem(key: string, namespace?: string): Promise<any> {
  try {
    let entry = await get<CacheEntry>(key);

    if (!entry) return null;

    if (!entry.version) {

      return (entry as any).data || entry;
    }

    // Written by a newer build: not ours to read or to delete.
    if (entry.version > CURRENT_CACHE_VERSION) return null;

    if (entry.version < CURRENT_CACHE_VERSION) {
      const result = runMigrations(
        (namespace && migrations[namespace]) || [],
        entry.data,
        entry.version,
        CURRENT_CACHE_VERSION,
      );
      if (!result.ok) {
        // No path to the current shape, or a step failed: never hand callers
        // old-shape data. Drop the entry so the next read is a plain miss
        // instead of failing the same migration again.
        console.error(`Cache item "${key}" could not be migrated (${result.reason} at v${result.at}); dropped.`);
        await del(key);
        return null;
      }
      await set(key, { version: CURRENT_CACHE_VERSION, timestamp: entry.timestamp, data: result.data });
      return result.data;
    }

    return entry.data;
  } catch (error) {
    console.error('Failed to get cache item:', error);
    return null;
  }
}

export async function clearOldCacheItems(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
  try {
    const now = Date.now();
    const allKeys = await keys();

    for (const key of allKeys) {
      if (typeof key === 'string' && (key.startsWith('scriptos_') || key.startsWith('title_') || key.startsWith('profile_'))) {
        const entry = await get<CacheEntry>(key);
        if (entry && entry.timestamp && (now - entry.timestamp > maxAgeMs)) {
          await del(key);
        }
      }
    }
  } catch (error) {
    console.error('Failed to clear old cache items:', error);
  }
}
