import type { EntryData } from "@/lib/tauri";

export type ColumnId = 'title' | 'username' | 'password' | 'url' | 'notes' | 'created' | 'modified';
export type SortDirection = 'asc' | 'desc';

export interface ColumnConfig {
  id: ColumnId;
  label: string;
  visible: boolean;
}

export interface SortConfig {
  column: ColumnId;
  direction: SortDirection;
}

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'title', label: 'Title', visible: true },
  { id: 'username', label: 'Username', visible: true },
  { id: 'password', label: 'Password', visible: true },
  { id: 'url', label: 'URL', visible: true },
  { id: 'notes', label: 'Notes', visible: true },
  { id: 'created', label: 'Created', visible: false },
  { id: 'modified', label: 'Modified', visible: false },
];

export interface EntryListProps {
  groupUuid: string;
  searchResults: EntryData[];
  selectedEntry: EntryData | null;
  onSelectEntry: (entry: EntryData) => void;
  onRefresh: () => void;
  isSearching?: boolean;
  selectedGroupName?: string;
  databasePath?: string;
}

export type { EntryData };
