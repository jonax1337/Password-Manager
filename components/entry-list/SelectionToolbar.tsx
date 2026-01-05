"use client";

import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";

interface SelectionToolbarProps {
  selectionCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
}

export function SelectionToolbar({ 
  selectionCount, 
  onClearSelection, 
  onBulkDelete 
}: SelectionToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-2 bg-accent/50">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">
          {selectionCount} {selectionCount === 1 ? 'entry' : 'entries'} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-7 text-xs"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={onBulkDelete}
          className="h-7 text-xs"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
}
