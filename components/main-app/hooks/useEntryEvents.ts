"use client";

import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

export function useEntryEvents(onRefresh: () => void) {
  useEffect(() => {
    const unlistenUpdated = listen('entry-updated', () => {
      console.log('Entry updated in child window, refreshing...');
      onRefresh();
    });

    const unlistenDeleted = listen('entry-deleted', () => {
      console.log('Entry deleted in child window, refreshing...');
      onRefresh();
    });

    return () => {
      unlistenUpdated.then(fn => fn());
      unlistenDeleted.then(fn => fn());
    };
  }, [onRefresh]);
}
