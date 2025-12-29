"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, Save, Copy, Trash2 } from "lucide-react";
import { updateEntry, deleteEntry } from "@/lib/tauri";
import { useToast } from "@/components/ui/use-toast";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { EntryData } from "@/lib/tauri";
import { PasswordStrengthMeter } from "@/components/password-strength-meter";
import { IconPicker } from "@/components/icon-picker";
import { confirm } from "@tauri-apps/plugin-dialog";
import { emit } from "@tauri-apps/api/event";

interface EntryEditorProps {
  entry: EntryData;
  onClose: () => void;
  onRefresh: () => void;
}

export function EntryEditor({ entry, onClose, onRefresh }: EntryEditorProps) {
  const [formData, setFormData] = useState<EntryData>(entry);
  const [showPassword, setShowPassword] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [iconId, setIconId] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    setFormData(entry);
    setHasChanges(false);
    setShowPassword(false);
    // Load icon ID from entry.icon_id field
    setIconId(entry.icon_id ?? 0);
  }, [entry.uuid]);

  const handleChange = (field: keyof EntryData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleIconChange = (newIconId: number) => {
    setIconId(newIconId);
    // Store icon ID in icon_id field
    setFormData((prev) => ({
      ...prev,
      icon_id: newIconId,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Always ensure we're saving with the correct UUID
    const dataToSave = {
      ...formData,
      uuid: entry.uuid,
    };
    
    try {
      await updateEntry(dataToSave);
      
      // Emit event to main window to refresh and mark as dirty
      await emit('entry-updated', { entryUuid: entry.uuid });
      
      toast({
        title: "Success",
        description: "Entry updated successfully",
        variant: "success",
      });
      setHasChanges(false);
      // Don't close or navigate away - just refresh the data in background
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to update entry",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm(
      "Are you sure you want to delete this entry?",
      { title: "Delete Entry", kind: "warning" }
    );
    
    if (!confirmed) {
      return;
    }

    try {
      await deleteEntry(entry.uuid);
      
      // Emit event to main window to refresh and mark as dirty
      await emit('entry-deleted', { entryUuid: entry.uuid });
      
      toast({
        title: "Success",
        description: "Entry deleted successfully",
        variant: "success",
      });
      onClose();
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await writeText(text);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
        variant: "info",
      });

      setTimeout(async () => {
        await writeText("");
      }, 30000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-lg font-semibold">{entry.title}</h2>
        <div className="flex gap-2">
          {hasChanges && (
            <Button onClick={handleSave} size="sm">
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          )}
          <Button onClick={handleDelete} variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <div className="flex gap-2">
              <IconPicker value={iconId} onChange={handleIconChange} />
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Entry title"
                className="flex-1"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex gap-2">
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleChange("username", e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(formData.username, "Username")}
                disabled={!formData.username}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(formData.password, "Password")}
                disabled={!formData.password}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <PasswordStrengthMeter password={formData.password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => handleChange("url", e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(formData.url, "URL")}
                disabled={!formData.url}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Additional notes..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => handleChange("tags", e.target.value)}
              placeholder="Comma-separated tags"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
