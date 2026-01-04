const LAST_DATABASE_KEY = "lastDatabasePath";
const COLUMN_CONFIG_PREFIX = "columnConfig_";
const DISMISSED_BREACHES_PREFIX = "dismissedBreaches_";

// Simple encryption/decryption using Web Crypto API
async function encryptData(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const keyBuffer = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    dataBuffer
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decryptData(encryptedData: string, key: string): Promise<string | null> {
  try {
    const encoder = new TextEncoder();
    const keyBuffer = encoder.encode(key.padEnd(32, '0').slice(0, 32));
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch {
    return null;
  }
}

// Generate encryption key from database path
function getEncryptionKey(dbPath: string): string {
  // Use database path as basis for encryption key
  // In production, this should ideally be derived from user credentials
  return dbPath + '_breach_dismissals';
}

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

export async function saveDismissedBreach(dbPath: string, entryUuid: string): Promise<void> {
  if (typeof window !== "undefined" && dbPath) {
    const key = getDismissedBreachesKey(dbPath);
    const stored = localStorage.getItem(key);
    let dismissed: string[] = [];
    
    if (stored) {
      try {
        const decrypted = await decryptData(stored, getEncryptionKey(dbPath));
        if (decrypted) {
          dismissed = JSON.parse(decrypted) as string[];
        }
      } catch {
        dismissed = [];
      }
    }
    
    if (!dismissed.includes(entryUuid)) {
      dismissed.push(entryUuid);
      const encrypted = await encryptData(JSON.stringify(dismissed), getEncryptionKey(dbPath));
      localStorage.setItem(key, encrypted);
    }
  }
}

export async function getDismissedBreaches(dbPath: string): Promise<string[]> {
  if (typeof window !== "undefined" && dbPath) {
    const key = getDismissedBreachesKey(dbPath);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const decrypted = await decryptData(stored, getEncryptionKey(dbPath));
        if (decrypted) {
          return JSON.parse(decrypted) as string[];
        }
      } catch {
        return [];
      }
    }
  }
  return [];
}

export async function clearDismissedBreach(dbPath: string, entryUuid: string): Promise<void> {
  if (typeof window !== "undefined" && dbPath) {
    const key = getDismissedBreachesKey(dbPath);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const decrypted = await decryptData(stored, getEncryptionKey(dbPath));
        if (decrypted) {
          let dismissed = JSON.parse(decrypted) as string[];
          dismissed = dismissed.filter(uuid => uuid !== entryUuid);
          const encrypted = await encryptData(JSON.stringify(dismissed), getEncryptionKey(dbPath));
          localStorage.setItem(key, encrypted);
        }
      } catch {
        // Ignore errors
      }
    }
  }
}
