// Cache versioning and migration system for localStorage
// Prevents stale data when schema changes

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
  'revisions': [
    // Add migrations here when schema changes
  ],
  'titlepage': [],
  'profiles': [],
  'projects': [],
  'lounge': [],
  'studio': [],
};

export function setCacheItem(key: string, data: any): void {
  try {
    const entry: CacheEntry = {
      version: CURRENT_CACHE_VERSION,
      timestamp: Date.now(),
      data,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, clearing old items');
      clearOldCacheItems();
      try {
        const entry: CacheEntry = {
          version: CURRENT_CACHE_VERSION,
          timestamp: Date.now(),
          data,
        };
        localStorage.setItem(key, JSON.stringify(entry));
      } catch (retryError) {
        console.error('Failed to set cache item after cleanup:', retryError);
      }
    } else {
      console.error('Failed to set cache item:', e);
    }
  }
}

export function getCacheItem(key: string, namespace?: string): any {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    let entry: CacheEntry;
    try {
      entry = JSON.parse(stored);
    } catch {
      // Handle legacy format (non-versioned data)
      return stored;
    }

    if (!entry.version) {
      // Migrate legacy data
      return entry.data || stored;
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

export function clearOldCacheItems(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
  try {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;

        const entry = JSON.parse(stored);
        if (entry.timestamp && now - entry.timestamp > maxAgeMs) {
          keysToDelete.push(key);
        }
      } catch {
        // Skip items that can't be parsed
      }
    }

    keysToDelete.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Failed to clear old cache items:', error);
  }
}

export function getCacheStats(): { totalSize: number; itemCount: number } {
  try {
    let totalSize = 0;
    let itemCount = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const value = localStorage.getItem(key);
      if (value) {
        totalSize += key.length + value.length;
        itemCount++;
      }
    }

    return { totalSize, itemCount };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return { totalSize: 0, itemCount: 0 };
  }
}

export function invalidateCache(pattern?: RegExp): void {
  try {
    const keysToDelete: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (!pattern || pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Failed to invalidate cache:', error);
  }
}
