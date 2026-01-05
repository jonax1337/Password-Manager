"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { ask } from "@tauri-apps/plugin-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatTimestamp } from "./utils/formatters";
import type { EntryData, HistoryEntry } from "@/lib/tauri";

interface HistoryTabProps {
  entry: EntryData;
  formData: EntryData;
  setFormData: React.Dispatch<React.SetStateAction<EntryData>>;
  setRepeatPassword: React.Dispatch<React.SetStateAction<string>>;
  setHasChanges: React.Dispatch<React.SetStateAction<boolean>>;
}

export function HistoryTab({ 
  entry, 
  formData, 
  setFormData, 
  setRepeatPassword, 
  setHasChanges 
}: HistoryTabProps) {
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const [viewHistoryDialogOpen, setViewHistoryDialogOpen] = useState(false);
  const [showHistoryPassword, setShowHistoryPassword] = useState(false);
  const { toast } = useToast();

  const sortedHistory = entry.history 
    ? [...entry.history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  const getChangeDescription = (historyEntry: HistoryEntry, newerVersion: EntryData | HistoryEntry): string => {
    const changes: string[] = [];
    if (historyEntry.title !== newerVersion.title) changes.push("Title");
    if (historyEntry.username !== newerVersion.username) changes.push("Username");
    if (historyEntry.password !== newerVersion.password) changes.push("Password");
    if (historyEntry.url !== newerVersion.url) changes.push("URL");
    if (historyEntry.notes !== newerVersion.notes) changes.push("Notes");
    
    return changes.length > 0 ? changes.join(", ") + " changed" : "Entry modified";
  };

  const handleRestore = async () => {
    if (selectedHistoryIndex === null) return;
    
    const selected = sortedHistory[selectedHistoryIndex];
    const confirmed = await ask(
      "Are you sure you want to restore this version? Current data will be moved to history.",
      { title: "Restore History Entry", kind: "warning" }
    );
    
    if (confirmed) {
      setFormData({
        ...formData,
        title: selected.title,
        username: selected.username,
        password: selected.password,
        url: selected.url,
        notes: selected.notes,
      });
      setRepeatPassword(selected.password);
      setHasChanges(true);
      toast({
        title: "Restored",
        description: "History entry restored. Click Save to apply changes.",
      });
    }
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    await writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard` });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Created and Modified timestamps */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-normal w-20">Created:</Label>
            <span className="text-sm">{formatTimestamp(entry.created)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm font-normal w-20">Modified:</Label>
            <span className="text-sm">{formatTimestamp(entry.modified)}</span>
          </div>
        </div>

        {/* Previous versions section */}
        <div className="space-y-2 mt-4">
          <Label className="text-sm font-normal">Previous versions:</Label>
          
          {sortedHistory.length > 0 ? (
            <>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[200px]">Version</TableHead>
                      <TableHead>Changes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedHistory.map((historyEntry, index) => {
                      // Compare with the next newer version (or current entry for the newest history entry)
                      const newerVersion = index === 0 ? entry : sortedHistory[index - 1];
                      const changeDescription = getChangeDescription(historyEntry, newerVersion);
                      
                      return (
                        <TableRow 
                          key={index}
                          className={`cursor-pointer ${selectedHistoryIndex === index ? 'bg-accent' : ''}`}
                          onClick={() => setSelectedHistoryIndex(index)}
                          onDoubleClick={() => {
                            setSelectedHistoryIndex(index);
                            setViewHistoryDialogOpen(true);
                            setShowHistoryPassword(false);
                          }}
                        >
                          <TableCell className="text-sm font-mono">
                            {formatTimestamp(historyEntry.timestamp)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {changeDescription}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedHistoryIndex === null}
                  onClick={() => {
                    if (selectedHistoryIndex !== null) {
                      setViewHistoryDialogOpen(true);
                      setShowHistoryPassword(false);
                    }
                  }}
                >
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedHistoryIndex === null}
                  onClick={handleRestore}
                >
                  Restore
                </Button>
              </div>
            </>
          ) : (
            <div className="border rounded-md p-8 text-center text-sm text-muted-foreground">
              No history entries available. History entries will be created when you modify the entry.
            </div>
          )}
        </div>
      </div>

      {/* View History Dialog */}
      <Dialog open={viewHistoryDialogOpen} onOpenChange={setViewHistoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>History Entry Details</DialogTitle>
          </DialogHeader>
          {selectedHistoryIndex !== null && sortedHistory[selectedHistoryIndex] && (
            <HistoryDetailContent
              selected={sortedHistory[selectedHistoryIndex]}
              showPassword={showHistoryPassword}
              onTogglePassword={() => setShowHistoryPassword(!showHistoryPassword)}
              onCopy={handleCopyToClipboard}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}

interface HistoryDetailContentProps {
  selected: HistoryEntry;
  showPassword: boolean;
  onTogglePassword: () => void;
  onCopy: (text: string, label: string) => void;
}

function HistoryDetailContent({ selected, showPassword, onTogglePassword, onCopy }: HistoryDetailContentProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[120px_1fr] items-center gap-2">
        <Label className="text-sm text-muted-foreground">Version:</Label>
        <span className="text-sm">{formatTimestamp(selected.timestamp)}</span>
      </div>
      
      <div className="grid grid-cols-[120px_1fr] items-center gap-2">
        <Label className="text-sm text-muted-foreground">Title:</Label>
        <span className="text-sm">{selected.title || "—"}</span>
      </div>
      
      <div className="grid grid-cols-[120px_1fr] items-center gap-2">
        <Label className="text-sm text-muted-foreground">Username:</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm">{selected.username || "—"}</span>
          {selected.username && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopy(selected.username, "Username")}
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-[120px_1fr] items-center gap-2">
        <Label className="text-sm text-muted-foreground">Password:</Label>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${selected.password ? 'font-mono' : ''}`}>
            {selected.password ? (showPassword ? selected.password : "•".repeat(selected.password.length)) : "—"}
          </span>
          {selected.password && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onTogglePassword}
              >
                {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(selected.password, "Password")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-[120px_1fr] items-center gap-2">
        <Label className="text-sm text-muted-foreground">URL:</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm break-all">{selected.url || "—"}</span>
          {selected.url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopy(selected.url, "URL")}
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-[120px_1fr] items-start gap-2">
        <Label className="text-sm text-muted-foreground pt-2">Notes:</Label>
        <ScrollArea className="max-h-32 w-full">
          <span className="text-sm whitespace-pre-wrap">{selected.notes || "—"}</span>
        </ScrollArea>
      </div>
    </div>
  );
}
