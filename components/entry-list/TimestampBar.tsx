"use client";

import { Clock } from "lucide-react";
import type { EntryData } from "@/lib/tauri";

interface TimestampBarProps {
  hoveredEntry: EntryData | null;
  formatTimestamp: (timestamp?: string) => string;
}

export function TimestampBar({ hoveredEntry, formatTimestamp }: TimestampBarProps) {
  return (
    <div className="border-t bg-muted/30 px-4 h-[28px] flex items-center gap-4 text-xs text-muted-foreground">
      {hoveredEntry && (
        <>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span className="font-medium">Created:</span>
            <span>{formatTimestamp(hoveredEntry.created)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span className="font-medium">Modified:</span>
            <span>{formatTimestamp(hoveredEntry.modified)}</span>
          </div>
          {hoveredEntry.expires && hoveredEntry.expiry_time && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span className="font-medium">Expires:</span>
              <span>{formatTimestamp(hoveredEntry.expiry_time)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
