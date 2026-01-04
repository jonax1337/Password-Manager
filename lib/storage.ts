const LAST_DATABASE_KEY = "lastDatabasePath";
const COLUMN_CONFIG_PREFIX = "columnConfig_";
const DISMISSED_BREACHES_PREFIX = "dismissedBreaches_";

export function saveLastDatabasePath(path: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(LAST_DATABASE_KEY, path);
  }
}

export function getLastDatabasePath(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(LAST_DATABASE_KEY);
  }
  return null;
}

export function clearLastDatabasePath(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LAST_DATABASE_KEY);
  }
}

// Column configuration per database
export interface ColumnVisibility {
  title: boolean;
  username: boolean;
  password: boolean;
  url: boolean;
  notes: boolean;
  created: boolean;
  modified: boolean;
}

function getDatabaseKey(dbPath: string): string {
  // Create a simple hash from the path for the storage key
  return COLUMN_CONFIG_PREFIX + btoa(dbPath).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
}

export function saveColumnConfig(dbPath: string, config: ColumnVisibility): void {
  if (typeof window !== "undefined" && dbPath) {
    localStorage.setItem(getDatabaseKey(dbPath), JSON.stringify(config));
  }
}

export function getColumnConfig(dbPath: string): ColumnVisibility | null {
  if (typeof window !== "undefined" && dbPath) {
    const stored = localStorage.getItem(getDatabaseKey(dbPath));
    if (stored) {
      try {
        return JSON.parse(stored) as ColumnVisibility;
      } catch {
        return null;
      }
    }
  }
  return null;
}

function getDismissedBreachesKey(dbPath: string): string {
  const utf8 = unescape(encodeURIComponent(dbPath));
  return DISMISSED_BREACHES_PREFIX + btoa(utf8).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
}

export function saveDismissedBreach(dbPath: string, entryUuid: string): void {
  if (typeof window !== "undefined" && dbPath) {
    const key = getDismissedBreachesKey(dbPath);
    const stored = localStorage.getItem(key);
    let dismissed: string[] = [];
    
    if (stored) {
      try {
        dismissed = JSON.parse(stored) as string[];
      } catch {
        dismissed = [];
      }
    }
    
    if (!dismissed.includes(entryUuid)) {
      dismissed.push(entryUuid);
      localStorage.setItem(key, JSON.stringify(dismissed));
    }
  }
}

export function getDismissedBreaches(dbPath: string): string[] {
  if (typeof window !== "undefined" && dbPath) {
    const key = getDismissedBreachesKey(dbPath);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored) as string[];
      } catch {
        return [];
      }
    }
  }
  return [];
}

export function clearDismissedBreach(dbPath: string, entryUuid: string): void {
  if (typeof window !== "undefined" && dbPath) {
    const key = getDismissedBreachesKey(dbPath);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        let dismissed = JSON.parse(stored) as string[];
        dismissed = dismissed.filter(uuid => uuid !== entryUuid);
        localStorage.setItem(key, JSON.stringify(dismissed));
      } catch {
        // Ignore errors
      }
    }
  }
}
