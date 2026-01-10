"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Trash2, Database as DatabaseIcon } from "lucide-react";
import { getRecentDatabases, clearRecentDatabase } from "@/lib/storage";

interface OpenRecentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDatabase: (path: string) => void;
}

export function OpenRecentDialog({ open, onOpenChange, onSelectDatabase }: OpenRecentDialogProps) {
  const [recentDatabases, setRecentDatabases] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setRecentDatabases(getRecentDatabases());
    }
  }, [open]);

  const handleRemove = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentDatabase(path);
    setRecentDatabases(getRecentDatabases());
  };

  const handleSelect = (path: string) => {
    onSelectDatabase(path);
    onOpenChange(false);
  };

  const getFileName = (path: string) => {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Open Recent Database
          </DialogTitle>
          <DialogDescription>
            Select a recently opened database to unlock it
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {recentDatabases.length === 0 ? (
            <div className="text-center py-8">
              <DatabaseIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No recent databases</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {recentDatabases.map((path, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer group"
                  onClick={() => handleSelect(path)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <DatabaseIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{getFileName(path)}</p>
                      <p className="text-xs text-muted-foreground truncate">{path}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleRemove(path, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
