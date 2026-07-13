

import { get, set, keys, del } from 'idb-keyval';

const CACHE_VERSION_KEY = 'app_cache_version';
const CURRENT_CACHE_VERSION = 1;

interface CacheEntry {
  version: number;
  timestamp: number;
  data: any;
}

interface MigrationRule {
  from: number;
  to: number;
  migrate: (data: any) => any;
}

const migrations: Record<string, MigrationRule[]> = {
  'revisions': [],
  'titlepage': [],
  'profiles': [],
  'projects': [],
  'lounge': [],
  'studio': [],
};

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

    if (entry.version < CURRENT_CACHE_VERSION && namespace && migrations[namespace]) {
      const applicableMigrations = migrations[namespace].filter(
        m => m.from >= entry.version && m.to <= CURRENT_CACHE_VERSION
      );

      let migratedData = entry.data;
      for (const migration of applicableMigrations) {
        migratedData = migration.migrate(migratedData);
      }

      return migratedData;
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
