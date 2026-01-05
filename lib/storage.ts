import { invoke } from "@tauri-apps/api/core";

const LAST_DATABASE_KEY = "lastDatabasePath";
const COLUMN_CONFIG_PREFIX = "columnConfig_";
const HIBP_ENABLED_KEY = "hibpEnabled";
const SEARCH_SCOPE_PREFIX = "searchScope_";

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

// Dismissed breach management using secure Tauri backend storage
export async function saveDismissedBreach(dbPath: string, entryUuid: string): Promise<void> {
  if (!dbPath) {
    throw new Error("Database path is required to save dismissed breach");
  }
  if (!entryUuid) {
    throw new Error("Entry UUID is required to save dismissed breach");
  }
  
  try {
    await invoke("save_dismissed_breach", { dbPath, entryUuid });
  } catch (error) {
    // Log detailed error for debugging (only visible in dev console, not exposed to user)
    console.error("[Storage] Failed to save dismissed breach", { error });
    // Throw generic error without sensitive details
    throw new Error("Failed to save dismissed breach");
  }
}

export async function getDismissedBreaches(dbPath: string): Promise<string[]> {
  if (!dbPath) {
    console.warn("[Storage] Database path missing, returning empty dismissed breaches array");
    return [];
  }
  
  try {
    return await invoke<string[]>("get_dismissed_breaches", { dbPath });
  } catch (error) {
    // Log detailed error for debugging without exposing sensitive data
    console.error("[Storage] Failed to get dismissed breaches", { error });
    // Return empty array as fallback to prevent UI breakage
    return [];
  }
}

export async function clearDismissedBreach(dbPath: string, entryUuid: string): Promise<void> {
  if (!dbPath) {
    throw new Error("Database path is required to clear dismissed breach");
  }
  if (!entryUuid) {
    throw new Error("Entry UUID is required to clear dismissed breach");
  }
  
  try {
    await invoke("clear_dismissed_breach", { dbPath, entryUuid });
  } catch (error) {
    // Log detailed error for debugging (only visible in dev console, not exposed to user)
    console.error("[Storage] Failed to clear dismissed breach", { error });
    // Throw generic error without sensitive details
    throw new Error("Failed to clear dismissed breach");
  }
}

// HIBP (Have I Been Pwned) breach checking - disabled by default for privacy
export function setHibpEnabled(enabled: boolean): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(HIBP_ENABLED_KEY, enabled.toString());
  }
}

export function getHibpEnabled(): boolean {
  if (typeof window !== "undefined") {
    return localStorage.getItem(HIBP_ENABLED_KEY) === "true";
  }
  return false;
}

// Search scope management (global or folder-specific)
export type SearchScope = 'global' | 'folder';

function getSearchScopeKey(dbPath: string): string {
  return SEARCH_SCOPE_PREFIX + btoa(dbPath).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
}

export function saveSearchScope(dbPath: string, scope: SearchScope): void {
  if (typeof window !== "undefined" && dbPath) {
    localStorage.setItem(getSearchScopeKey(dbPath), scope);
  }
}

export function getSearchScope(dbPath: string): SearchScope {
  if (typeof window !== "undefined" && dbPath) {
    const stored = localStorage.getItem(getSearchScopeKey(dbPath));
    if (stored === 'folder') {
      return 'folder';
    }
  }
  return 'global';
}
