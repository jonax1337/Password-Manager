"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Lock,
  Search,
  Plus,
  Moon,
  Sun,
  LogOut,
  Save,
  Settings,
} from "lucide-react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { saveDatabase } from "@/lib/tauri";
import { GroupTree } from "@/components/group-tree";
import { EntryList } from "@/components/entry-list";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { openEntryWindow, openSettingsWindow } from "@/lib/window";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "next-themes";
import { closeDatabase, getGroups, searchEntries, getFavoriteEntries } from "@/lib/tauri";
import type { GroupData, EntryData } from "@/lib/tauri";
import { clearLastDatabasePath } from "@/lib/storage";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { loadGroupTreeState } from "@/lib/group-state";
import { ResizablePanel } from "./resizable-panel";

interface MainAppProps {
  onClose: (isManualLogout?: boolean) => void;
}

export function MainApp({ onClose }: MainAppProps) {
  const [rootGroup, setRootGroup] = useState<GroupData | null>(null);
  const [selectedGroupUuid, setSelectedGroupUuid] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EntryData[]>([]);
  const [favoriteEntries, setFavoriteEntries] = useState<EntryData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFavoritesView, setIsFavoritesView] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [dbPath, setDbPath] = useState<string>("");
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [closeAction, setCloseAction] = useState<'logout' | 'window' | null>(null);
  const [initialExpandedGroups, setInitialExpandedGroups] = useState<Set<string> | undefined>(undefined);
  const [autoLockSeconds, setAutoLockSeconds] = useState<number>(0);
  const isDirtyRef = useRef(isDirty);
  const lastActivityRef = useRef<number>(Date.now());
  const autoLockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // Keep ref in sync with state
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Initialize and listen for auto-lock setting changes
  useEffect(() => {
    // Load initial setting
    const seconds = parseInt(localStorage.getItem("autoLockSeconds") || "0");
    setAutoLockSeconds(seconds);

    // Listen for storage changes (from settings window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "autoLockSeconds" && e.newValue) {
        const newSeconds = parseInt(e.newValue);
        setAutoLockSeconds(newSeconds);
      }
    };

    // Also listen for custom event from same window (settings dialog in same window)
    const handleCustomStorageChange = () => {
      const seconds = parseInt(localStorage.getItem("autoLockSeconds") || "0");
      setAutoLockSeconds(seconds);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('autoLockChanged', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('autoLockChanged', handleCustomStorageChange);
    };
  }, []);

  useEffect(() => {
    // Load database path on mount first
    const loadDbInfo = async () => {
      const lastPath = localStorage.getItem("lastDatabasePath");
      if (lastPath) {
        setDbPath(lastPath);
      }
    };
    loadDbInfo();
  }, []);

  useEffect(() => {
    // Only load groups after dbPath is available
    if (dbPath) {
      loadGroups();
    }
  }, [refreshTrigger, dbPath]);

  // Add Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty]);

  // Update window title with database path and unsaved indicator
  useEffect(() => {
    const updateTitle = async () => {
      const appWindow = getCurrentWindow();
      const title = dbPath 
        ? (isDirty ? `${dbPath}* - Simple Password Manager` : `${dbPath} - Simple Password Manager`)
        : 'Simple Password Manager';
      await appWindow.setTitle(title);
    };
    updateTitle();
  }, [dbPath, isDirty]);

  // Auto-lock functionality
  useEffect(() => {
    if (autoLockSeconds === 0) {
      // Auto-lock disabled
      if (autoLockTimerRef.current) {
        clearInterval(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }
      return;
    }

    // Initialize last activity to now
    lastActivityRef.current = Date.now();

    // Update last activity on user interaction
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Track user activity
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);

    // Check inactivity every second
    autoLockTimerRef.current = setInterval(() => {
      const inactiveTime = Date.now() - lastActivityRef.current;
      const autoLockMs = autoLockSeconds * 1000;

      if (inactiveTime >= autoLockMs) {
        clearInterval(autoLockTimerRef.current!);
        performClose(false); // Auto-lock is not manual logout - preserve Quick Unlock
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      
      if (autoLockTimerRef.current) {
        clearInterval(autoLockTimerRef.current);
      }
    };
  }, [autoLockSeconds]); // Re-initialize when setting changes

  // Listen for entry updates from child windows
  useEffect(() => {
    const unlistenUpdated = listen('entry-updated', () => {
      console.log('Entry updated in child window, refreshing...');
      handleRefresh();
    });

    const unlistenDeleted = listen('entry-deleted', () => {
      console.log('Entry deleted in child window, refreshing...');
      handleRefresh();
    });

    return () => {
      unlistenUpdated.then(fn => fn());
      unlistenDeleted.then(fn => fn());
    };
  }, []);

  // Handle window close event
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupCloseHandler = async () => {
      const appWindow = getCurrentWindow();
      unlisten = await appWindow.onCloseRequested(async (event) => {
        const closeToTray = localStorage.getItem("closeToTray") === "true";
        
        if (isDirtyRef.current) {
          event.preventDefault();
          setCloseAction('window');
          setShowUnsavedDialog(true);
        } else if (closeToTray) {
          // Close to tray enabled and no unsaved changes
          event.preventDefault();
          await appWindow.hide();
        }
        // Otherwise let window close normally
      });
    };

    setupCloseHandler();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []); // Empty deps - handler stays stable, uses ref for current value

  const loadGroups = async () => {
    try {
      const groups = await getGroups();
      setRootGroup(groups);
      
      // Load persisted state on first load
      if (!selectedGroupUuid && dbPath) {
        const state = loadGroupTreeState(dbPath, groups.uuid, groups);
        setSelectedGroupUuid(state.selectedGroup || groups.uuid);
        setInitialExpandedGroups(new Set(state.expandedGroups));
      } else if (!selectedGroupUuid) {
        setSelectedGroupUuid(groups.uuid);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to load groups",
        variant: "destructive",
      });
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      try {
        const results = await searchEntries(query);
        setSearchResults(results);
      } catch (error: any) {
        toast({
          title: "Search Error",
          description: error || "Failed to search entries",
          variant: "destructive",
        });
      }
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const handleSave = async () => {
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
        description: error || "Failed to save database",
        variant: "destructive",
      });
    }
  };

  const handleClose = async () => {
    if (isDirty) {
      setCloseAction('logout');
      setShowUnsavedDialog(true);
    } else {
      await performClose(true); // Manual logout
    }
  };

  const performClose = async (isManualLogout: boolean = false) => {
    try {
      // Reset window title before closing
      const appWindow = getCurrentWindow();
      await appWindow.setTitle("Simple Password Manager");
      
      await closeDatabase();
      onClose(isManualLogout);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to close database",
        variant: "destructive",
      });
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
      await performClose(true); // Manual logout
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
      await performClose(true); // Manual logout
    }
    
    setCloseAction(null);
  };

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
    setIsDirty(true); // Mark as dirty on any change
    // Don't clear selected entry - keep it open after refresh
    
    // Reload favorites if favorites view is active
    if (isFavoritesView) {
      getFavoriteEntries().then(setFavoriteEntries);
    }
  };

  const handleGroupSelect = async (uuid: string) => {
    setSelectedGroupUuid(uuid);
    setIsSearching(false);
    setSearchQuery("");
    setSearchResults([]);
    
    // Handle favorites view
    if (uuid === "_favorites") {
      setIsFavoritesView(true);
      try {
        const favorites = await getFavoriteEntries();
        setFavoriteEntries(favorites);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error || "Failed to load favorites",
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
      <div className="flex items-center gap-4 border-b px-4 py-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            className="w-full pl-9"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            title={isDirty ? "Save database (unsaved changes)" : "Save database"}
            className={isDirty ? "text-orange-500" : ""}
          >
            <Save className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => openSettingsWindow()}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" onClick={handleClose} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
                // If the deleted group was selected, deselect it
                if (selectedGroupUuid === deletedUuid) {
                  handleGroupSelect(rootGroup.uuid);
                }
              }}
              dbPath={dbPath}
              initialExpandedGroups={initialExpandedGroups}
            />
          )}
        </ResizablePanel>

        <div className="flex-1">
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
