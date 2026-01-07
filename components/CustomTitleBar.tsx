"use client";

import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Copy } from "lucide-react";

interface CustomTitleBarProps {
  title?: string;
  hideMaximize?: boolean;
}

export function CustomTitleBar({ title = "Simple Password Manager", hideMaximize = false }: CustomTitleBarProps) {
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

  return (
    <div 
      className="h-9 bg-muted/50 border-b flex items-center justify-between select-none"
      data-tauri-drag-region
      onMouseDown={(e) => {
        // Only start dragging if clicking on the title bar itself, not on buttons
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
