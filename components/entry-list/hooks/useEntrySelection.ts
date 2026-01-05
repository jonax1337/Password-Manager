"use client";

import { useState, useEffect } from "react";
import type { EntryData } from "@/lib/tauri";

export function useEntrySelection(groupUuid: string, isSearching: boolean, entries: EntryData[]) {
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  // Clear selection when switching groups or search mode
  useEffect(() => {
    setSelectedEntries(new Set());
  }, [groupUuid, isSearching]);

  const toggleSelectEntry = (uuid: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(uuid)) {
      newSelected.delete(uuid);
    } else {
      newSelected.add(uuid);
    }
    setSelectedEntries(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedEntries.size === entries.length && entries.length > 0) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(entries.map(e => e.uuid)));
    }
  };

  const clearSelection = () => {
    setSelectedEntries(new Set());
  };

  const isSelected = (uuid: string) => selectedEntries.has(uuid);
  const selectionCount = selectedEntries.size;
  const isAllSelected = selectedEntries.size === entries.length && entries.length > 0;

  return {
    selectedEntries,
    toggleSelectEntry,
    toggleSelectAll,
    clearSelection,
    isSelected,
    selectionCount,
    isAllSelected,
  };
}
