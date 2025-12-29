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
import { Plus, Search, Trash2 } from "lucide-react";
import { getEntries, createEntry, deleteEntry } from "@/lib/tauri";
import { useToast } from "@/components/ui/use-toast";
import type { EntryData } from "@/lib/tauri";
import { getIconComponent } from "@/components/icon-picker";
import { ask } from "@tauri-apps/plugin-dialog";
import { openEntryWindow } from "@/lib/window";

interface EntryListProps {
  groupUuid: string;
  searchResults: EntryData[];
  selectedEntry: EntryData | null;
  onSelectEntry: (entry: EntryData) => void;
  onRefresh: () => void;
  isSearching?: boolean;
}

export function EntryList({
  groupUuid,
  searchResults,
  selectedEntry,
  onSelectEntry,
  onRefresh,
  isSearching = false,
}: EntryListProps) {
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newEntryTitle, setNewEntryTitle] = useState("");
  const [contextMenuEntryUuid, setContextMenuEntryUuid] = useState<string | null>(null);
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
        icon_id: 0, // Default icon
      };

      await createEntry(newEntry);
      
      toast({
        title: "Success",
        description: "Entry created successfully",
        variant: "success",
      });
      setNewEntryTitle("");
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

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h2 className="text-sm font-semibold">
            {isSearching
              ? `Search Results (${entries.length})`
              : `Entries (${entries.length})`}
          </h2>
          {isSearching ? (
            <div className="h-7 w-7 flex items-center justify-center">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
          ) : groupUuid && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {entries.map((entry) => {
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
                  <ContextMenuTrigger>
                    <div
                      className={`flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer hover:bg-accent ${
                        selectedEntry?.uuid === entry.uuid || isContextMenuOpen ? "bg-accent" : ""
                      }`}
                      onDoubleClick={() => onSelectEntry(entry)}
                    >
                      <EntryIcon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium">{entry.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {entry.username || "No username"}
                        </p>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => handleDeleteEntry(entry)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}

            {entries.length === 0 && (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                {isSearching
                  ? "No results found"
                  : groupUuid
                  ? "No entries in this group"
                  : "Select a group to view entries"}
              </div>
            )}
          </div>
        </ScrollArea>
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
              <Input
                id="entryTitle"
                value={newEntryTitle}
                onChange={(e) => setNewEntryTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateEntry()}
                placeholder="Enter entry title"
              />
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
