"use client";

import { useEffect } from "react";

export function ContextMenuBlocker() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Allow context menu on input fields for copy/paste
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Allow Radix UI ContextMenu triggers to handle the event
      if (target.closest("[data-radix-context-menu-trigger]")) {
        return;
      }

      e.preventDefault();
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  return null;
}
