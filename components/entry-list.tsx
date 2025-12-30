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
import { Plus, Search, Trash2, Copy, CheckCircle2, ExternalLink, X, Edit, User, Key } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ContextMenuSeparator } from "@/components/ui/context-menu";
import { getEntries, createEntry, deleteEntry } from "@/lib/tauri";
import { useToast } from "@/components/ui/use-toast";
import type { EntryData } from "@/lib/tauri";
import { getIconComponent, IconPicker } from "@/components/icon-picker";
import { ask } from "@tauri-apps/plugin-dialog";
import { openEntryWindow } from "@/lib/window";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { open } from "@tauri-apps/plugin-shell";

interface EntryListProps {
  groupUuid: string;
  searchResults: EntryData[];
  selectedEntry: EntryData | null;
  onSelectEntry: (entry: EntryData) => void;
  onRefresh: () => void;
  isSearching?: boolean;
  selectedGroupName?: string;
}

export function EntryList({
  groupUuid,
  searchResults,
  selectedEntry,
  onSelectEntry,
  onRefresh,
  isSearching = false,
  selectedGroupName,
}: EntryListProps) {
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newEntryTitle, setNewEntryTitle] = useState("");
  const [newEntryIconId, setNewEntryIconId] = useState(0);
  const [contextMenuEntryUuid, setContextMenuEntryUuid] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [clearTimeoutId, setClearTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const { toast } = useToast();

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
      // Clear any existing timeout
      if (clearTimeoutId) {
        clearTimeout(clearTimeoutId);
      }

      await writeText(text);
      const fieldKey = `${entryUuid}-${fieldName}`;
      setCopiedField(fieldKey);

      toast({
        title: "Copied",
        description: `${fieldName} copied - will clear in 30s`,
        variant: "info",
      });

      // Auto-clear after 30 seconds
      const timeoutId = setTimeout(async () => {
        await writeText("");
        setCopiedField(null);
        toast({
          title: "Clipboard cleared",
          description: "Clipboard has been cleared for security",
          variant: "default",
        });
      }, 30000);

      setClearTimeoutId(timeoutId);

      // Clear copied state after 2 seconds
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
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
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h2 className="text-sm font-semibold">
                {isSearching
                  ? `Search Results (${entries.length})`
                  : `Entries (${entries.length})`}
              </h2>
              {!isSearching && selectedGroupName && (
                <span className="text-xs text-muted-foreground truncate">
                  {selectedGroupName}
                </span>
              )}
            </div>
            {isSearching ? (
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
                  {/* Header */}
                  <div className="sticky top-0 z-10 grid grid-cols-[auto_auto_1fr_1fr_1fr_1fr_1fr_auto] gap-2 border-b bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground">
                    <div className="w-8 flex items-center justify-center">
                      <Checkbox
                        checked={selectedEntries.size === entries.length && entries.length > 0}
                        onCheckedChange={toggleSelectAll}
                        title="Select all"
                      />
                    </div>
                    <div className="w-8"></div>
                    <div>Title</div>
                    <div>Username</div>
                    <div>Password</div>
                    <div>URL</div>
                    <div className="hidden xl:block">Notes</div>
                    <div className="w-8"></div>
                  </div>
                  
                  {/* Entries */}
                  {entries.map((entry) => {
                    const iconId = entry.icon_id ?? 0;
                    const EntryIcon = getIconComponent(iconId);
                    const isContextMenuOpen = contextMenuEntryUuid === entry.uuid;
                    const usernameCopied = copiedField === `${entry.uuid}-Username`;
                    const passwordCopied = copiedField === `${entry.uuid}-Password`;
                    
                    return (
                      <ContextMenu 
                        key={entry.uuid}
                        onOpenChange={(open) => {
                          setContextMenuEntryUuid(open ? entry.uuid : null);
                        }}
                      >
                        <ContextMenuTrigger onContextMenu={(e) => e.stopPropagation()}>
                          <div
                            className={`grid grid-cols-[auto_auto_1fr_1fr_1fr_1fr_1fr_auto] gap-2 border-b px-4 py-2.5 hover:bg-accent ${
                              selectedEntry?.uuid === entry.uuid || isContextMenuOpen || selectedEntries.has(entry.uuid) ? "bg-accent" : ""
                            }`}
                          >
                            {/* Checkbox */}
                            <div className="flex items-center w-8 justify-center">
                              <Checkbox
                                checked={selectedEntries.has(entry.uuid)}
                                onCheckedChange={() => toggleSelectEntry(entry.uuid)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            
                            {/* Icon */}
                            <div className="flex items-center w-8">
                              <EntryIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            
                            {/* Title */}
                            <div 
                              className="flex items-center cursor-pointer overflow-hidden"
                              onDoubleClick={() => onSelectEntry(entry)}
                            >
                              <p className="truncate text-sm font-medium">{entry.title}</p>
                            </div>
                            
                            {/* Username */}
                            <div 
                              className="flex items-center gap-2 cursor-pointer overflow-hidden"
                              onDoubleClick={() => handleCopyField(entry.username, "Username", entry.uuid)}
                              title="Double-click to copy"
                            >
                              <p className="truncate text-sm text-muted-foreground flex-1">
                                {entry.username || "—"}
                              </p>
                              {usernameCopied && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                              )}
                            </div>
                            
                            {/* Password */}
                            <div 
                              className="flex items-center gap-2 cursor-pointer overflow-hidden"
                              onDoubleClick={() => handleCopyField(entry.password, "Password", entry.uuid)}
                              title="Double-click to copy"
                            >
                              <p className="truncate text-sm text-muted-foreground font-mono flex-1">
                                {entry.password ? "••••••••" : "—"}
                              </p>
                              {passwordCopied && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                              )}
                            </div>
                            
                            {/* URL */}
                            <div className="flex items-center gap-1 overflow-hidden">
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
                            
                            {/* Notes */}
                            <div className="hidden xl:flex items-center overflow-hidden">
                              <p className="truncate text-sm text-muted-foreground" title={entry.notes}>
                                {entry.notes || "—"}
                              </p>
                            </div>
                            
                            {/* Spacer for alignment */}
                            <div className="w-8"></div>
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
