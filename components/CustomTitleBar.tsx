"use client";

import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Copy, Save, Settings, LogOut, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { openSettingsWindow } from "@/lib/window";

interface CustomTitleBarProps {
  title?: string;
  hideMaximize?: boolean;
  showMenu?: boolean;
  isDirty?: boolean;
  onSave?: () => void;
  onLogout?: () => void;
  onToggleSearch?: () => void;
}

export function CustomTitleBar({ 
  title = "Password Manager",
  hideMaximize = false,
  showMenu = false,
  isDirty = false,
  onSave,
  onLogout,
  onToggleSearch,
}: CustomTitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

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
            className="h-full pl-4 pr-4 hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Menu bar mode (for main app - minimal with File menu and DB name)
  return (
    <div 
      className="h-9 bg-muted/50 border-b select-none flex items-center justify-between px-2 relative"
      data-tauri-drag-region
      onMouseDown={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).hasAttribute('data-tauri-drag-region')) {
          startDragging();
        }
      }}
    >
      {/* Left: Icon + File Menu */}
      <div className="flex items-center gap-2 z-10">
        <img 
          src="/app-icon.png" 
          alt="App Icon" 
          className="h-4 w-4"
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

      {/* Center: DB Name */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center" data-tauri-drag-region>
        <span className="text-xs font-semibold text-foreground truncate max-w-md">
          {title}
        </span>
      </div>

      {/* Right: Search + Settings + Window Controls */}
      <div className="flex items-center h-full z-10">
        {onToggleSearch && (
          <button
            onClick={onToggleSearch}
            className="h-full px-3 hover:bg-accent transition-colors flex items-center justify-center"
            title="Toggle Search (Ctrl+F)"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        )}
        
        <button
          onClick={() => openSettingsWindow()}
          className="h-full px-3 hover:bg-accent transition-colors flex items-center justify-center"
          title="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={handleMinimize}
          className="h-full px-3 hover:bg-accent transition-colors flex items-center justify-center"
          aria-label="Minimize"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        {!hideMaximize && (
          <button
            onClick={handleMaximize}
            className="h-full px-3 hover:bg-accent transition-colors flex items-center justify-center"
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
          className="h-full pl-3 pr-4 hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
