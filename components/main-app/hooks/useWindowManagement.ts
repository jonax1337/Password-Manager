"use client";

import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface UseWindowManagementProps {
  dbPath: string;
  isDirty: boolean;
  onCloseRequested: () => void;
}

export function useWindowManagement({ dbPath, isDirty, onCloseRequested }: UseWindowManagementProps) {
  const isDirtyRef = useRef(isDirty);

  // Keep ref in sync with state
  useEffect(() => {
    isDirtyRef.current = isDirty;
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

  // Handle window close event
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupCloseHandler = async () => {
      const appWindow = getCurrentWindow();
      unlisten = await appWindow.onCloseRequested(async (event) => {
        const closeToTray = localStorage.getItem("closeToTray") === "true";
        
        if (isDirtyRef.current) {
          event.preventDefault();
          onCloseRequested();
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
  }, [onCloseRequested]);

  return { isDirtyRef };
}
