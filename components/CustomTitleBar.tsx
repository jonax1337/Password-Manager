"use client";

import { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Copy, Search, Save, Settings, LogOut, Globe, Folder, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { openSettingsWindow } from "@/lib/window";
import type { SearchScope } from "@/lib/storage";

interface CustomTitleBarProps {
  title?: string;
  hideMaximize?: boolean;
  // Menu mode props (for main app)
  showMenu?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isDirty?: boolean;
  onSave?: () => void;
  onLogout?: () => void;
  searchScope?: SearchScope;
  onSearchScopeChange?: (scope: SearchScope) => void;
  showSearchScopeDropdown?: boolean;
  isSearchScopeDisabled?: boolean;
}

export function CustomTitleBar({ 
  title = "Simple Password Manager", 
  hideMaximize = false,
  showMenu = false,
  searchQuery = "",
  onSearchChange,
  isDirty = false,
  onSave,
  onLogout,
  searchScope = "global",
  onSearchScopeChange,
  showSearchScopeDropdown = false,
  isSearchScopeDisabled = false,
}: CustomTitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMaximized = async () => {
      const appWindow = getCurrentWindow();
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };

    checkMaximized();

    const unlisten = getCurrentWindow().onResized(() => {
      checkMaximized();
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  // Keyboard shortcut: Ctrl+F / Cmd+F to focus search bar
  useEffect(() => {
    if (!showMenu) return; // Only for menu mode

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+F (Windows/Linux) or Cmd+F (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMenu]);

  const handleMinimize = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.minimize();
  };

  const handleMaximize = async () => {
    const appWindow = getCurrentWindow();
    if (isMaximized) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
    setIsMaximized(!isMaximized);
  };

  const handleClose = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  };

  const startDragging = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.startDragging();
  };

  // Simple title bar (for Settings, Entry, Unlock screens)
  if (!showMenu) {
    return (
      <div 
        className="h-9 bg-muted/50 border-b flex items-center justify-between select-none"
        data-tauri-drag-region
        onMouseDown={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).hasAttribute('data-tauri-drag-region')) {
            startDragging();
          }
        }}
      >
        <div className="flex items-center px-4 flex-1" data-tauri-drag-region>
          <img 
            src="/app-icon.png" 
            alt="App Icon" 
            className="h-4 w-4 mr-2 pointer-events-none"
          />
          <span className="text-xs font-medium text-foreground pointer-events-none">
            {title}
          </span>
        </div>

        <div className="flex items-center h-full">
          <button
            onClick={handleMinimize}
            className="h-full px-4 hover:bg-accent transition-colors flex items-center justify-center"
            aria-label="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          {!hideMaximize && (
            <button
              onClick={handleMaximize}
              className="h-full px-4 hover:bg-accent transition-colors flex items-center justify-center"
              aria-label={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? (
                <Copy className="h-3 w-3" />
              ) : (
                <Square className="h-3 w-3" />
              )}
            </button>
          )}
          <button
            onClick={handleClose}
            className="h-full px-4 hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Menu bar mode (for main app - VS Code style)
  return (
    <div 
      className="h-9 bg-muted/50 border-b flex items-center justify-between select-none relative"
      data-tauri-drag-region
      onMouseDown={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).hasAttribute('data-tauri-drag-region')) {
          startDragging();
        }
      }}
    >
      {/* Left: Icon + File Menu */}
      <div className="flex items-center gap-1 px-2 z-10">
        <img 
          src="/app-icon.png" 
          alt="App Icon" 
          className="h-4 w-4 mr-1"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="px-2 py-1 text-xs font-medium hover:bg-accent rounded transition-colors">
              File
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem
              onClick={onSave}
              disabled={!isDirty}
              className="gap-2 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Save Database</span>
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+S</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onLogout}
              className="gap-2 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Center: Search Bar - Absolutely positioned for perfect centering */}
      <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-xs px-2 sm:max-w-md sm:px-8 md:max-w-lg md:px-12 lg:max-w-xl lg:px-16 xl:max-w-2xl xl:px-20" data-tauri-drag-region>
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search entries..."
            className={`h-7 text-xs pl-8 ${showSearchScopeDropdown ? 'pr-28' : 'pr-2'}`}
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
          {showSearchScopeDropdown && (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={isSearchScopeDisabled}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 gap-1 px-2 text-xs flex items-center ${isSearchScopeDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isSearchScopeDisabled}
                  >
                    {searchScope === "global" ? (
                      <>
                        <Globe className="h-3 w-3" />
                        <span className="text-[10px]">Global</span>
                      </>
                    ) : (
                      <>
                        <Folder className="h-3 w-3" />
                        <span className="text-[10px]">Folder</span>
                      </>
                    )}
                    <ChevronDown className="h-2.5 w-2.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    onClick={() => onSearchScopeChange?.("global")}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>Global</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onSearchScopeChange?.("folder")}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <Folder className="h-3.5 w-3.5" />
                    <span>Folder</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Right: Action Buttons + Window Controls */}
      <div className="flex items-center h-full z-10">
        
        {/* Settings Button */}
        <button
          onClick={() => openSettingsWindow()}
          className="h-full px-3 hover:bg-accent transition-colors flex items-center justify-center"
          title="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>

        {/* Window Controls */}
        <button
          onClick={handleMinimize}
          className="h-full px-4 hover:bg-accent transition-colors flex items-center justify-center"
          aria-label="Minimize"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        {!hideMaximize && (
          <button
            onClick={handleMaximize}
            className="h-full px-4 hover:bg-accent transition-colors flex items-center justify-center"
            aria-label={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <Copy className="h-3 w-3" />
            ) : (
              <Square className="h-3 w-3" />
            )}
          </button>
        )}
        <button
          onClick={handleClose}
          className="h-full px-4 hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
