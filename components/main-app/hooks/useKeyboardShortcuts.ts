"use client";

import { useEffect } from "react";

interface UseKeyboardShortcutsProps {
  onSave: () => void;
  onToggleSearch?: () => void;
  onCloseSearch?: () => void;
  isSearchVisible?: boolean;
}

export function useKeyboardShortcuts({ onSave, onToggleSearch, onCloseSearch, isSearchVisible }: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
      // Ctrl/Cmd+F: Open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        onToggleSearch?.();
      }
      // ESC: Close search if visible
      if (e.key === 'Escape' && isSearchVisible) {
        e.preventDefault();
        onCloseSearch?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onToggleSearch, onCloseSearch, isSearchVisible]);
}
