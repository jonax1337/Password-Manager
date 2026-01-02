"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Trash2, Copy, ExternalLink, X, Edit, User, Key, ChevronRight, Star, Clock, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ContextMenuSeparator, ContextMenuCheckboxItem } from "@/components/ui/context-menu";
import { getEntries, createEntry, deleteEntry, updateEntry, touchEntry } from "@/lib/tauri";
import { useToast } from "@/components/ui/use-toast";
import type { EntryData } from "@/lib/tauri";
import { getIconComponent, IconPicker } from "@/components/icon-picker";
import { ask } from "@tauri-apps/plugin-dialog";
import { openEntryWindow } from "@/lib/window";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { open } from "@tauri-apps/plugin-shell";
import { saveColumnConfig, getColumnConfig, type ColumnVisibility } from "@/lib/storage";

type ColumnId = 'title' | 'username' | 'password' | 'url' | 'notes' | 'created' | 'modified';
type SortDirection = 'asc' | 'desc';

interface ColumnConfig {
  id: ColumnId;
  label: string;
  visible: boolean;
}

interface SortConfig {
  column: ColumnId;
  direction: SortDirection;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'title', label: 'Title', visible: true },
  { id: 'username', label: 'Username', visible: true },
  { id: 'password', label: 'Password', visible: true },
  { id: 'url', label: 'URL', visible: true },
  { id: 'notes', label: 'Notes', visible: true },
  { id: 'created', label: 'Created', visible: false },
  { id: 'modified', label: 'Modified', visible: false },
];

interface EntryListProps {
  groupUuid: string;
  searchResults: EntryData[];
  selectedEntry: EntryData | null;
  onSelectEntry: (entry: EntryData) => void;
  onRefresh: () => void;
  isSearching?: boolean;
  selectedGroupName?: string;
  databasePath?: string;
}

export function EntryList({
  groupUuid,
  searchResults,
  selectedEntry,
  onSelectEntry,
  onRefresh,
  isSearching = false,
  selectedGroupName,
  databasePath,
}: EntryListProps) {
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newEntryTitle, setNewEntryTitle] = useState("");
  const [newEntryIconId, setNewEntryIconId] = useState(0);
  const [contextMenuEntryUuid, setContextMenuEntryUuid] = useState<string | null>(null);
  const [clearTimeoutId, setClearTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [hoveredEntry, setHoveredEntry] = useState<EntryData | null>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [sortConfigPerGroup, setSortConfigPerGroup] = useState<Record<string, SortConfig>>({});
  const { toast } = useToast();

  // Load column config from storage when database changes
  useEffect(() => {
    if (databasePath) {
      const savedConfig = getColumnConfig(databasePath);
      if (savedConfig) {
        setColumns(prev => prev.map(col => ({
          ...col,
          visible: savedConfig[col.id as keyof ColumnVisibility] ?? col.visible
        })));
      } else {
        // Reset to defaults if no saved config
        setColumns(DEFAULT_COLUMNS);
      }
    }
  }, [databasePath]);

  // Get current sort config for this group (default: created desc)
  const currentSort = sortConfigPerGroup[groupUuid] || { column: 'created' as ColumnId, direction: 'desc' as SortDirection };

  // Toggle column visibility and save to storage
  const toggleColumn = (columnId: ColumnId) => {
    setColumns(prev => {
      const newColumns = prev.map(col => 
        col.id === columnId ? { ...col, visible: !col.visible } : col
      );
      
      // Save to storage if we have a database path
      if (databasePath) {
        const config: ColumnVisibility = {
          title: newColumns.find(c => c.id === 'title')?.visible ?? true,
          username: newColumns.find(c => c.id === 'username')?.visible ?? true,
          password: newColumns.find(c => c.id === 'password')?.visible ?? true,
          url: newColumns.find(c => c.id === 'url')?.visible ?? true,
          notes: newColumns.find(c => c.id === 'notes')?.visible ?? true,
          created: newColumns.find(c => c.id === 'created')?.visible ?? false,
          modified: newColumns.find(c => c.id === 'modified')?.visible ?? false,
        };
        saveColumnConfig(databasePath, config);
      }
      
      return newColumns;
    });
  };

  // Set sorting for current group
  const handleSort = (columnId: ColumnId) => {
    setSortConfigPerGroup(prev => {
      const current = prev[groupUuid] || { column: 'created', direction: 'desc' };
      const newDirection = current.column === columnId && current.direction === 'asc' ? 'desc' : 'asc';
      return {
        ...prev,
        [groupUuid]: { column: columnId, direction: newDirection }
      };
    });
  };

  // Sort entries based on current sort config
  const sortedEntries = [...entries].sort((a, b) => {
    const { column, direction } = currentSort;
    let aVal: string | number = '';
    let bVal: string | number = '';

    switch (column) {
      case 'title':
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
        break;
      case 'username':
        aVal = a.username.toLowerCase();
        bVal = b.username.toLowerCase();
        break;
      case 'password':
        aVal = a.password ? 1 : 0;
        bVal = b.password ? 1 : 0;
        break;
      case 'url':
        aVal = a.url.toLowerCase();
        bVal = b.url.toLowerCase();
        break;
      case 'notes':
        aVal = a.notes.toLowerCase();
        bVal = b.notes.toLowerCase();
        break;
      case 'created':
        aVal = a.created || '';
        bVal = b.created || '';
        break;
      case 'modified':
        aVal = a.modified || '';
        bVal = b.modified || '';
        break;
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Get visible columns
  const visibleColumns = columns.filter(col => col.visible);

  useEffect(() => {
    if (groupUuid && !isSearching) {
      loadEntries();
    }
  }, [groupUuid, isSearching]);

  useEffect(() => {
    if (isSearching) {
      setEntries(searchResults);
    } else if (groupUuid) {
      loadEntries();
    }
  }, [searchResults, isSearching]);

  // Clear selection when switching groups or search mode
  useEffect(() => {
    setSelectedEntries(new Set());
  }, [groupUuid, isSearching]);

  const loadEntries = async () => {
    if (!groupUuid) return;

    try {
      const fetchedEntries = await getEntries(groupUuid);
      setEntries(fetchedEntries);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to load entries",
        variant: "destructive",
      });
    }
  };

  const handleCreateEntry = async () => {
    if (!newEntryTitle.trim() || !groupUuid) return;

    try {
      // Generate UUID for the new entry
      const entryUuid = crypto.randomUUID();
      
      const newEntry: EntryData = {
        uuid: entryUuid,
        title: newEntryTitle,
        username: "",
        password: "",
        url: "",
        notes: "",
        tags: "",
        group_uuid: groupUuid,
        icon_id: newEntryIconId,
        is_favorite: false,
        expires: false,
        usage_count: 0,
      };

      await createEntry(newEntry);
      
      toast({
        title: "Success",
        description: "Entry created successfully",
        variant: "success",
      });
      setNewEntryTitle("");
      setNewEntryIconId(0);
      setShowCreateDialog(false);
      onRefresh();
      
      // Wait a moment for database write to complete before opening window
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Open the entry editor window for the newly created entry
      await openEntryWindow(newEntry, groupUuid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to create entry",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEntry = async (entry: EntryData) => {
    const shouldDelete = await ask(
      `Are you sure you want to delete "${entry.title}" and all its data?`,
      { kind: "warning", title: "Delete Entry" }
    );
    
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteEntry(entry.uuid);
      toast({
        title: "Success",
        description: "Entry deleted successfully",
        variant: "success",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedEntries.size;
    const shouldDelete = await ask(
      `Are you sure you want to delete ${count} ${count === 1 ? 'entry' : 'entries'}?`,
      { kind: "warning", title: "Delete Entries" }
    );
    
    if (!shouldDelete) {
      return;
    }

    try {
      // Delete all selected entries
      await Promise.all(
        Array.from(selectedEntries).map(uuid => deleteEntry(uuid))
      );
      
      toast({
        title: "Success",
        description: `${count} ${count === 1 ? 'entry' : 'entries'} deleted successfully`,
        variant: "success",
      });
      
      setSelectedEntries(new Set());
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to delete entries",
        variant: "destructive",
      });
    }
  };

  const toggleSelectEntry = (uuid: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(uuid)) {
      newSelected.delete(uuid);
    } else {
      newSelected.add(uuid);
    }
    setSelectedEntries(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedEntries.size === entries.length && entries.length > 0) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(entries.map(e => e.uuid)));
    }
  };

  const clearSelection = () => {
    setSelectedEntries(new Set());
  };

  const handleOpenUrl = async (url: string) => {
    if (!url) return;
    
    try {
      // Add https:// if no protocol specified
      const fullUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      await open(fullUrl);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to open URL",
        variant: "destructive",
      });
    }
  };

  const handleCopyField = async (text: string, fieldName: string, entryUuid: string) => {
    if (!text) {
      toast({
        title: "Nothing to copy",
        description: `${fieldName} is empty`,
        variant: "destructive",
      });
      return;
    }

    try {
      await writeText(text);

      // Update last access time when copying password
      if (fieldName === "Password") {
        await touchEntry(entryUuid);
        onRefresh();
      }

      // Clear any existing timeout
      if (clearTimeoutId) {
        clearTimeout(clearTimeoutId);
      }

      toast({
        title: "Copied",
        description: `${fieldName} copied to clipboard - will clear in 30s`,
        variant: "info",
      });

      // Auto-clear after 30 seconds
      const timeoutId = setTimeout(async () => {
        await writeText("");
        toast({
          title: "Clipboard cleared",
          description: "Clipboard has been cleared for security",
          variant: "default",
        });
      }, 30000);

      setClearTimeoutId(timeoutId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "—";
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(date);
    } catch {
      return "—";
    }
  };

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Selection Toolbar */}
        {selectedEntries.size > 0 && (
          <div className="flex items-center justify-between border-b px-4 py-2 bg-accent/50">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">
                {selectedEntries.size} {selectedEntries.size === 1 ? 'entry' : 'entries'} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-7 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                className="h-7 text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Normal Header */}
        {selectedEntries.size === 0 && (
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {isSearching && selectedGroupName === "Favorites" ? (
                <h2 className="text-sm font-semibold">Favorites</h2>
              ) : isSearching ? (
                <h2 className="text-sm font-semibold">Search Results</h2>
              ) : selectedGroupName && (
                <div className="flex items-center gap-1.5 text-sm font-semibold truncate">
                  {selectedGroupName.split('/').map((segment, index, array) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <span className="truncate">{segment}</span>
                      {index < array.length - 1 && (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                ({entries.length})
              </span>
            </div>
            {isSearching && selectedGroupName === "Favorites" ? (
              <div className="h-7 w-7 flex items-center justify-center flex-shrink-0">
                <Star className="h-4 w-4 text-muted-foreground" />
              </div>
            ) : isSearching ? (
              <div className="h-7 w-7 flex items-center justify-center flex-shrink-0">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
            ) : groupUuid && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        <ContextMenu>
          <ContextMenuTrigger asChild>
            <ScrollArea className="flex-1">
              {entries.length > 0 ? (
                <div className="min-h-full">
                  {/* Header with column config context menu */}
                  <ContextMenu>
                    <ContextMenuTrigger>
                      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground">
                        <div className="w-8 flex items-center justify-center">
                          <Checkbox
                            checked={selectedEntries.size === sortedEntries.length && sortedEntries.length > 0}
                            onCheckedChange={toggleSelectAll}
                            title="Select all"
                          />
                        </div>
                        <div className="w-8"></div>
                        {visibleColumns.map((col) => (
                          <button
                            key={col.id}
                            onClick={() => handleSort(col.id)}
                            className="flex-1 flex items-center gap-1 hover:text-foreground transition-colors text-left"
                          >
                            <span>{col.label}</span>
                            {currentSort.column === col.id ? (
                              currentSort.direction === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-30" />
                            )}
                          </button>
                        ))}
                        <div className="w-8"></div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Show Columns</div>
                      <ContextMenuSeparator />
                      {columns.map((col) => (
                        <ContextMenuCheckboxItem
                          key={col.id}
                          checked={col.visible}
                          onCheckedChange={() => toggleColumn(col.id)}
                        >
                          {col.label}
                        </ContextMenuCheckboxItem>
                      ))}
                    </ContextMenuContent>
                  </ContextMenu>
                  
                  {/* Entries */}
                  {sortedEntries.map((entry) => {
                    const iconId = entry.icon_id ?? 0;
                    const EntryIcon = getIconComponent(iconId);
                    const isContextMenuOpen = contextMenuEntryUuid === entry.uuid;
                    
                    return (
                      <ContextMenu 
                        key={entry.uuid}
                        onOpenChange={(open) => {
                          setContextMenuEntryUuid(open ? entry.uuid : null);
                        }}
                      >
                        <ContextMenuTrigger onContextMenu={(e) => e.stopPropagation()}>
                          <div
                            className={`flex items-center gap-2 border-b px-4 py-2.5 hover:bg-accent ${
                              selectedEntry?.uuid === entry.uuid || isContextMenuOpen || selectedEntries.has(entry.uuid) ? "bg-accent" : ""
                            }`}
                            onMouseEnter={() => setHoveredEntry(entry)}
                            onMouseLeave={() => setHoveredEntry(null)}
                          >
                            {/* Checkbox */}
                            <div className="flex items-center w-8 justify-center flex-shrink-0">
                              <Checkbox
                                checked={selectedEntries.has(entry.uuid)}
                                onCheckedChange={() => toggleSelectEntry(entry.uuid)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            
                            {/* Icon */}
                            <div className="flex items-center w-8 flex-shrink-0">
                              <EntryIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            
                            {/* Dynamic columns */}
                            {visibleColumns.map((col) => (
                              <div key={col.id} className="flex-1 overflow-hidden min-w-0">
                                {col.id === 'title' && (
                                  <div 
                                    className="cursor-pointer"
                                    onDoubleClick={async () => {
                                      await touchEntry(entry.uuid);
                                      onSelectEntry(entry);
                                      onRefresh();
                                    }}
                                  >
                                    <p className="truncate text-sm font-medium">{entry.title}</p>
                                  </div>
                                )}
                                {col.id === 'username' && (
                                  <div 
                                    className="cursor-pointer"
                                    onDoubleClick={() => handleCopyField(entry.username, "Username", entry.uuid)}
                                    title="Double-click to copy"
                                  >
                                    <p className="truncate text-sm text-muted-foreground">
                                      {entry.username || "—"}
                                    </p>
                                  </div>
                                )}
                                {col.id === 'password' && (
                                  <div 
                                    className="cursor-pointer"
                                    onDoubleClick={() => handleCopyField(entry.password, "Password", entry.uuid)}
                                    title="Double-click to copy"
                                  >
                                    <p className="truncate text-sm text-muted-foreground font-mono">
                                      {entry.password ? "••••••••" : "—"}
                                    </p>
                                  </div>
                                )}
                                {col.id === 'url' && (
                                  <div className="flex items-center gap-1">
                                    {entry.url ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenUrl(entry.url);
                                        }}
                                        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline truncate group"
                                        title={entry.url}
                                      >
                                        <span className="truncate">{entry.url}</span>
                                        <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </button>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">—</span>
                                    )}
                                  </div>
                                )}
                                {col.id === 'notes' && (
                                  <p className="truncate text-sm text-muted-foreground" title={entry.notes}>
                                    {entry.notes || "—"}
                                  </p>
                                )}
                                {col.id === 'created' && (
                                  <p className="truncate text-sm text-muted-foreground">
                                    {formatTimestamp(entry.created)}
                                  </p>
                                )}
                                {col.id === 'modified' && (
                                  <p className="truncate text-sm text-muted-foreground">
                                    {formatTimestamp(entry.modified)}
                                  </p>
                                )}
                              </div>
                            ))}
                            
                            {/* Favorite Star */}
                            <div className="flex items-center justify-center w-8 flex-shrink-0">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await updateEntry({
                                      ...entry,
                                      is_favorite: !entry.is_favorite,
                                    });
                                    onRefresh();
                                    toast({
                                      title: entry.is_favorite ? "Removed from favorites" : "Added to favorites",
                                      variant: "success",
                                    });
                                  } catch (error: any) {
                                    toast({
                                      title: "Error",
                                      description: "Failed to update favorite status",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="p-1 hover:bg-accent rounded transition-colors"
                                title={entry.is_favorite ? "Remove from favorites" : "Add to favorites"}
                              >
                                <Star 
                                  className={`h-4 w-4 transition-colors ${
                                    entry.is_favorite 
                                      ? "fill-yellow-400 text-yellow-400" 
                                      : "text-muted-foreground hover:text-yellow-400"
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => onSelectEntry(entry)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Entry
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem 
                            onClick={() => handleCopyField(entry.username, "Username", entry.uuid)}
                            disabled={!entry.username}
                          >
                            <User className="mr-2 h-4 w-4" />
                            Copy Username
                          </ContextMenuItem>
                          <ContextMenuItem 
                            onClick={() => handleCopyField(entry.password, "Password", entry.uuid)}
                            disabled={!entry.password}
                          >
                            <Key className="mr-2 h-4 w-4" />
                            Copy Password
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDeleteEntry(entry)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Entry
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  {isSearching
                    ? "No results found"
                    : groupUuid
                    ? "No entries in this group"
                    : "Select a group to view entries"}
                </div>
              )}
            </ScrollArea>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {!isSearching && groupUuid && (
              <ContextMenuItem onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Entry
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>

        {/* Timestamp Bar - Always visible, content only on hover */}
        <div className="border-t bg-muted/30 px-4 h-[28px] flex items-center gap-4 text-xs text-muted-foreground">
          {hoveredEntry && (
            <>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span className="font-medium">Created:</span>
                <span>{formatTimestamp(hoveredEntry.created)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span className="font-medium">Modified:</span>
                <span>{formatTimestamp(hoveredEntry.modified)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span className="font-medium">Accessed:</span>
                <span>{formatTimestamp(hoveredEntry.last_accessed)}</span>
              </div>
              {hoveredEntry.usage_count > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">Usage:</span>
                  <span>{hoveredEntry.usage_count}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Entry</DialogTitle>
            <DialogDescription>
              Enter a title for the new entry
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="entryTitle">Title</Label>
              <div className="flex gap-2">
                <IconPicker 
                  value={newEntryIconId} 
                  onChange={setNewEntryIconId}
                />
                <Input
                  id="entryTitle"
                  value={newEntryTitle}
                  onChange={(e) => setNewEntryTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateEntry()}
                  placeholder="Enter entry title"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateEntry}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
