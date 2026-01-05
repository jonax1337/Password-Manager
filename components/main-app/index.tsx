"use client";

import { useState, useEffect, useCallback } from "react";
import { saveDatabase, closeDatabase, getGroups, getFavoriteEntries } from "@/lib/tauri";
import { GroupTree } from "@/components/group-tree";
import { EntryList } from "@/components/entry-list";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { Dashboard } from "@/components/Dashboard";
import { openEntryWindow } from "@/lib/window";
import { useToast } from "@/components/ui/use-toast";
import type { GroupData, EntryData } from "@/lib/tauri";
import { loadGroupTreeState } from "@/lib/group-state";
import { ResizablePanel } from "@/components/ResizablePanel";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { AppHeader } from "./AppHeader";
import { useAutoLock } from "./hooks/useAutoLock";
import { useWindowManagement } from "./hooks/useWindowManagement";
import { useSearch } from "./hooks/useSearch";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useEntryEvents } from "./hooks/useEntryEvents";

interface MainAppProps {
  onClose: (isManualLogout?: boolean) => void;
}

export function MainApp({ onClose }: MainAppProps) {
  const [rootGroup, setRootGroup] = useState<GroupData | null>(null);
  const [selectedGroupUuid, setSelectedGroupUuid] = useState<string>("");
  const [favoriteEntries, setFavoriteEntries] = useState<EntryData[]>([]);
  const [isFavoritesView, setIsFavoritesView] = useState(false);
  const [isDashboardView, setIsDashboardView] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [dbPath, setDbPath] = useState<string>("");
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [closeAction, setCloseAction] = useState<'logout' | 'window' | null>(null);
  const [initialExpandedGroups, setInitialExpandedGroups] = useState<Set<string> | undefined>(undefined);
  const { toast } = useToast();

  // Define handleRefresh early so it can be used in hooks
  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
    setIsDirty(true);
    
    if (isFavoritesView) {
      getFavoriteEntries().then(setFavoriteEntries);
    }
  }, [isFavoritesView]);

  // Define performClose
  const performClose = useCallback(async (isManualLogout: boolean = false) => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.setTitle("Simple Password Manager");
      
      setSelectedGroupUuid("");
      setIsDashboardView(true);
      setIsFavoritesView(false);
      setRootGroup(null);
      
      await closeDatabase();
      onClose(isManualLogout);
    } catch (error: any) {
      toast({
        title: "Error",
        description: typeof error === 'string' ? error : (error?.message || "Failed to close database"),
        variant: "destructive",
      });
    }
  }, [onClose, toast]);

  // Custom hooks
  const { searchQuery, searchResults, isSearching, handleSearch, clearSearch, setIsSearching } = useSearch();
  
  useAutoLock(performClose);
  
  useWindowManagement({
    dbPath,
    isDirty,
    onCloseRequested: () => {
      setCloseAction('window');
      setShowUnsavedDialog(true);
    },
  });

  const handleSave = useCallback(async () => {
    try {
      await saveDatabase();
      setIsDirty(false);
      toast({
        title: "Success",
        description: "Database saved successfully",
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: typeof error === 'string' ? error : (error?.message || "Failed to save database"),
        variant: "destructive",
      });
    }
  }, [toast]);

  useKeyboardShortcuts({ onSave: handleSave });
  useEntryEvents(handleRefresh);

  // Load database path on mount
  useEffect(() => {
    const loadDbInfo = async () => {
      const lastPath = localStorage.getItem("lastDatabasePath");
      if (lastPath) {
        setDbPath(lastPath);
      }
    };
    loadDbInfo();
  }, []);

  // Load groups after dbPath is available
  useEffect(() => {
    if (dbPath) {
      loadGroups();
    }
  }, [refreshTrigger, dbPath]);

  const loadGroups = async () => {
    try {
      const groups = await getGroups();
      setRootGroup(groups);
      
      if (!selectedGroupUuid) {
        setSelectedGroupUuid("_dashboard");
        setIsDashboardView(true);
        if (dbPath) {
          const state = loadGroupTreeState(dbPath, groups.uuid, groups);
          setInitialExpandedGroups(new Set(state.expandedGroups));
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: typeof error === 'string' ? error : (error?.message || "Failed to load groups"),
        variant: "destructive",
      });
    }
  };

  const handleClose = async () => {
    if (isDirty) {
      setCloseAction('logout');
      setShowUnsavedDialog(true);
    } else {
      await performClose(true);
    }
  };

  const handleUnsavedCancel = () => {
    setShowUnsavedDialog(false);
    setCloseAction(null);
  };

  const handleUnsavedDontSave = async () => {
    setShowUnsavedDialog(false);
    setIsDirty(false);
    
    if (closeAction === 'window') {
      const appWindow = getCurrentWindow();
      const closeToTray = localStorage.getItem("closeToTray") === "true";
      if (closeToTray) {
        await appWindow.hide();
      } else {
        await appWindow.close();
      }
    } else if (closeAction === 'logout') {
      await performClose(true);
    }
    
    setCloseAction(null);
  };

  const handleUnsavedSave = async () => {
    setShowUnsavedDialog(false);
    await handleSave();
    
    if (closeAction === 'window') {
      const appWindow = getCurrentWindow();
      const closeToTray = localStorage.getItem("closeToTray") === "true";
      if (closeToTray) {
        await appWindow.hide();
      } else {
        await appWindow.close();
      }
    } else if (closeAction === 'logout') {
      await performClose(true);
    }
    
    setCloseAction(null);
  };

  const handleGroupSelect = async (uuid: string) => {
    setSelectedGroupUuid(uuid);
    setIsSearching(false);
    clearSearch();
    
    if (uuid === "_dashboard") {
      setIsDashboardView(true);
      setIsFavoritesView(false);
      setFavoriteEntries([]);
      return;
    }
    
    setIsDashboardView(false);
    
    if (uuid === "_favorites") {
      setIsFavoritesView(true);
      try {
        const favorites = await getFavoriteEntries();
        setFavoriteEntries(favorites);
      } catch (error: any) {
        toast({
          title: "Error",
          description: typeof error === 'string' ? error : (error?.message || "Failed to load favorites"),
          variant: "destructive",
        });
      }
    } else {
      setIsFavoritesView(false);
      setFavoriteEntries([]);
    }
  };

  const getGroupPath = (root: GroupData, targetUuid: string): string => {
    const findPath = (g: GroupData, uuid: string, path: string[]): string[] | null => {
      if (g.uuid === uuid) {
        return [...path, g.name];
      }
      for (const child of g.children) {
        const result = findPath(child, uuid, [...path, g.name]);
        if (result) return result;
      }
      return null;
    };
    
    const path = findPath(root, targetUuid, []);
    return path ? path.join(" / ") : "";
  };

  return (
    <div className="flex h-full w-full flex-col">
      <AppHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        isDirty={isDirty}
        onSave={handleSave}
        onLogout={handleClose}
      />

      <div className="flex flex-1 overflow-hidden">
        <ResizablePanel
          defaultWidth={256}
          minWidth={200}
          maxWidth={500}
          storageKey="groupTreeWidth"
        >
          {rootGroup && (
            <GroupTree
              group={rootGroup}
              selectedUuid={selectedGroupUuid}
              onSelectGroup={handleGroupSelect}
              onRefresh={handleRefresh}
              onGroupDeleted={(deletedUuid) => {
                if (selectedGroupUuid === deletedUuid) {
                  handleGroupSelect(rootGroup.uuid);
                }
              }}
              dbPath={dbPath}
              initialExpandedGroups={initialExpandedGroups}
            />
          )}
        </ResizablePanel>

        <div className="flex-1 overflow-hidden">
          <div className={isDashboardView ? "h-full" : "hidden"}>
            <Dashboard refreshTrigger={refreshTrigger} databasePath={dbPath} isDirty={isDirty} />
          </div>
          
          {!isDashboardView && (
            <EntryList
              groupUuid={isSearching || isFavoritesView ? "" : selectedGroupUuid}
              searchResults={isSearching ? searchResults : isFavoritesView ? favoriteEntries : []}
              selectedEntry={null}
              onSelectEntry={(entry) => openEntryWindow(entry, entry.group_uuid)}
              onRefresh={handleRefresh}
              isSearching={isSearching || isFavoritesView}
              selectedGroupName={
                isFavoritesView 
                  ? "Favorites"
                  : rootGroup && selectedGroupUuid 
                  ? getGroupPath(rootGroup, selectedGroupUuid)
                  : undefined
              }
              databasePath={dbPath}
            />
          )}
        </div>
      </div>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onCancel={handleUnsavedCancel}
        onDontSave={handleUnsavedDontSave}
        onSave={handleUnsavedSave}
      />
    </div>
  );
}
