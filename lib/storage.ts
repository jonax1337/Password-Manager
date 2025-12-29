const LAST_DATABASE_KEY = "lastDatabasePath";

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
