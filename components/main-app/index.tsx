"use client";

import { useState, useEffect, useCallback } from "react";
import { saveDatabase, closeDatabase, getGroups, getFavoriteEntries, moveEntry } from "@/lib/tauri";
import { GroupTree } from "@/components/group-tree";
import { EntryList } from "@/components/entry-list";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { Dashboard } from "@/components/Dashboard";
import { openEntryWindow, requestCloseAllChildWindows } from "@/lib/window";
import { useToast } from "@/components/ui/use-toast";
import type { GroupData, EntryData } from "@/lib/tauri";
import { loadGroupTreeState } from "@/lib/group-state";
import { ResizablePanel } from "@/components/ResizablePanel";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
} from "@dnd-kit/core";
import { getIconComponent } from "@/components/IconPicker";
import { moveGroup } from "@/lib/tauri";
import { findGroupByUuid, isDescendant } from "@/components/group-tree/utils";

import { AppHeader } from "./AppHeader";
import { useAutoLock } from "./hooks/useAutoLock";
import { useWindowManagement } from "./hooks/useWindowManagement";
import { useSearch } from "./hooks/useSearch";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useEntryEvents } from "./hooks/useEntryEvents";
import { listen } from "@tauri-apps/api/event";

interface MainAppProps {
  onClose: (isManualLogout?: boolean) => void;
}

type DragData = 
  | { type: 'entry'; entry: EntryData }
  | { type: 'folder' }
  | null;

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
  const [dndActiveId, setDndActiveId] = useState<string | null>(null);
  const [dndOverId, setDndOverId] = useState<string | null>(null);
  const [dndActiveType, setDndActiveType] = useState<'folder' | 'entry' | null>(null);
  const [dndActiveData, setDndActiveData] = useState<DragData>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Custom collision detection: use pointerWithin for entries (strict), rectIntersection for folders
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    // For entry drags, use pointerWithin - only detect when pointer is directly over target
    if (dndActiveType === 'entry') {
      return pointerWithin(args);
    }
    // For folder drags, use rectIntersection for easier targeting
    return rectIntersection(args);
  }, [dndActiveType]);

  useEffect(() => {
    if (dndActiveId) {
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.cursor = '';
    }
    return () => { document.body.style.cursor = ''; };
  }, [dndActiveId]);

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
      // Request all child windows to close (they will prompt for unsaved changes)
      const allClosed = await requestCloseAllChildWindows();
      
      if (!allClosed) {
        // Some windows stayed open (user cancelled due to unsaved changes)
        // Abort the logout/close
        return;
      }
      
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

  // Listen for HIBP setting changes from Settings window
  useEffect(() => {
    const unlisten = listen('hibp-setting-changed', async () => {
      console.log('HIBP setting changed, reloading database...');
      await performClose(false);
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [performClose]);

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

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current as DragData;
    setDndActiveId(active.id as string);
    setDndActiveType(activeData?.type || null);
    setDndActiveData(activeData);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      if (dndOverId !== null) setDndOverId(null);
      return;
    }
    if (dndOverId !== over.id) setDndOverId(over.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const activeData = active.data.current as DragData;
    
    setDndActiveId(null);
    setDndOverId(null);
    setDndActiveType(null);
    setDndActiveData(null);

    if (!over || active.id === over.id) return;

    const draggedType = activeData?.type;
    const targetId = over.id as string;

    // Handle Entry drop onto Folder
    if (activeData && activeData.type === 'entry') {
      const entry = activeData.entry;
      const targetGroup = rootGroup ? findGroupByUuid(rootGroup, targetId) : null;
      
      if (!targetGroup) {
        toast({
          title: "Invalid Target",
          description: "Please drop the entry onto a valid folder",
          variant: "destructive",
        });
        return;
      }

      // Don't move if already in the same group
      if (entry.group_uuid === targetId) {
        return;
      }

      try {
        await moveEntry(entry.uuid, targetId);
        toast({
          title: "Success",
          description: `Moved "${entry.title}" to "${targetGroup.name}"`,
          variant: "success",
        });
        handleRefresh();
      } catch (error: any) {
        toast({
          title: "Error",
          description: typeof error === 'string' ? error : (error?.message || "Failed to move entry"),
          variant: "destructive",
        });
      }
      return;
    }

    // Handle Folder drop onto Folder
    if (draggedType === 'folder' && rootGroup) {
      const draggedId = active.id as string;
      const draggedGroup = findGroupByUuid(rootGroup, draggedId);
      const targetGroup = findGroupByUuid(rootGroup, targetId);
      
      if (!draggedGroup || !targetGroup) return;

      try {
        if (isDescendant(draggedGroup, targetGroup)) {
          toast({
            title: "Invalid Move",
            description: "Cannot move a group into its own descendant",
            variant: "destructive",
          });
          return;
        }

        await moveGroup(draggedId, targetId);
        toast({
          title: "Success",
          description: `Moved "${draggedGroup.name}" into "${targetGroup.name}"`,
          variant: "success",
        });
        handleRefresh();
      } catch (error: any) {
        toast({
          title: "Error",
          description: typeof error === 'string' ? error : (error?.message || "Failed to move group"),
          variant: "destructive",
        });
      }
    }
  };

  // Get active entry for DragOverlay
  const getActiveEntry = (): EntryData | null => {
    if (dndActiveData && dndActiveData.type === 'entry') {
      return dndActiveData.entry;
    }
    return null;
  };

  // Get active group for DragOverlay
  const getActiveGroup = (): GroupData | null => {
    if (dndActiveType === 'folder' && dndActiveId && rootGroup) {
      return findGroupByUuid(rootGroup, dndActiveId);
    }
    return null;
  };

  const activeEntry = getActiveEntry();
  const activeGroup = getActiveGroup();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
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
                activeId={dndActiveId}
                overId={dndOverId}
                activeType={dndActiveType}
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

      <DragOverlay dropAnimation={null}>
        {activeEntry ? (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-accent rounded shadow-lg opacity-80 border">
            {(() => {
              const EntryIcon = getIconComponent(activeEntry.icon_id ?? 0);
              return <EntryIcon className="h-4 w-4 text-muted-foreground" />;
            })()}
            <span className="text-sm font-medium">{activeEntry.title}</span>
          </div>
        ) : activeGroup ? (
          <div className="flex items-center gap-1 px-2 py-1.5 bg-accent/50 rounded shadow-lg opacity-60">
            {(() => {
              const FolderIcon = getIconComponent(activeGroup.icon_id ?? 48);
              return <FolderIcon className="h-4 w-4 text-muted-foreground" />;
            })()}
            <span className="text-sm font-medium">{activeGroup.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
