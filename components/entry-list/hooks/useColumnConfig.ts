"use client";

import { useState, useEffect } from "react";
import { saveColumnConfig, getColumnConfig, type ColumnVisibility } from "@/lib/storage";
import { DEFAULT_COLUMNS, type ColumnConfig, type ColumnId, type SortConfig } from "../types";

export function useColumnConfig(databasePath?: string) {
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);

  // Load column config from storage when database changes
  useEffect(() => {
    if (databasePath) {
      const savedConfig = getColumnConfig(databasePath);
      if (savedConfig) {
        setColumns(prev => prev.map(col => ({
          ...col,
          visible: savedConfig[col.id as keyof ColumnVisibility] ?? col.visible
        })));
      } else {
        // Reset to defaults if no saved config
        setColumns(DEFAULT_COLUMNS);
      }
    }
  }, [databasePath]);

  // Toggle column visibility and save to storage
  const toggleColumn = (columnId: ColumnId) => {
    setColumns(prev => {
      const newColumns = prev.map(col => 
        col.id === columnId ? { ...col, visible: !col.visible } : col
      );
      
      // Save to storage if we have a database path
      if (databasePath) {
        const config: ColumnVisibility = {
          title: newColumns.find(c => c.id === 'title')?.visible ?? true,
          username: newColumns.find(c => c.id === 'username')?.visible ?? true,
          password: newColumns.find(c => c.id === 'password')?.visible ?? true,
          url: newColumns.find(c => c.id === 'url')?.visible ?? true,
          notes: newColumns.find(c => c.id === 'notes')?.visible ?? true,
          created: newColumns.find(c => c.id === 'created')?.visible ?? false,
          modified: newColumns.find(c => c.id === 'modified')?.visible ?? false,
        };
        saveColumnConfig(databasePath, config);
      }
      
      return newColumns;
    });
  };

  const visibleColumns = columns.filter(col => col.visible);

  return {
    columns,
    visibleColumns,
    toggleColumn,
  };
}

export function useSortConfig(groupUuid: string) {
  const [sortConfigPerGroup, setSortConfigPerGroup] = useState<Record<string, SortConfig>>({});

  // Get current sort config for this group (default: created desc)
  const currentSort = sortConfigPerGroup[groupUuid] || { 
    column: 'created' as ColumnId, 
    direction: 'desc' as const 
  };

  // Set sorting for current group
  const handleSort = (columnId: ColumnId) => {
    setSortConfigPerGroup(prev => {
      const current = prev[groupUuid] || { column: 'created', direction: 'desc' };
      const newDirection = current.column === columnId && current.direction === 'asc' ? 'desc' : 'asc';
      return {
        ...prev,
        [groupUuid]: { column: columnId, direction: newDirection }
      };
    });
  };

  return {
    currentSort,
    handleSort,
  };
}
