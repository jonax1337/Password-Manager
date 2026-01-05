"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuCheckboxItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { ColumnConfig, ColumnId, SortConfig } from "./types";

interface ColumnHeaderProps {
  columns: ColumnConfig[];
  visibleColumns: ColumnConfig[];
  currentSort: SortConfig;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onSort: (columnId: ColumnId) => void;
  onToggleColumn: (columnId: ColumnId) => void;
}

export function ColumnHeader({
  columns,
  visibleColumns,
  currentSort,
  isAllSelected,
  onToggleSelectAll,
  onSort,
  onToggleColumn,
}: ColumnHeaderProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className="sticky top-0 z-10 flex items-center gap-1 border-b bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground">
          <div className="w-4"></div>
          <div className="w-8 flex items-center justify-center">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={onToggleSelectAll}
              title="Select all"
            />
          </div>
          <div className="w-8"></div>
          {visibleColumns.map((col) => (
            <button
              key={col.id}
              onClick={() => onSort(col.id)}
              className="flex-1 flex items-center gap-1 hover:text-foreground transition-colors text-left"
            >
              <span>{col.label}</span>
              {currentSort.column === col.id ? (
                currentSort.direction === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-30" />
              )}
            </button>
          ))}
          <div className="w-8"></div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Show Columns</div>
        <ContextMenuSeparator />
        {columns.map((col) => (
          <ContextMenuCheckboxItem
            key={col.id}
            checked={col.visible}
            onCheckedChange={() => onToggleColumn(col.id)}
          >
            {col.label}
          </ContextMenuCheckboxItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}
