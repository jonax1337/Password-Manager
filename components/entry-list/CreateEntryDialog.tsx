"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconPicker } from "@/components/IconPicker";

interface CreateEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  iconId: number;
  onTitleChange: (title: string) => void;
  onIconChange: (iconId: number) => void;
  onSubmit: () => void;
}

export function CreateEntryDialog({
  open,
  onOpenChange,
  title,
  iconId,
  onTitleChange,
  onIconChange,
  onSubmit,
}: CreateEntryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Entry</DialogTitle>
          <DialogDescription>
            Enter a title for the new entry
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="entryTitle">Title</Label>
            <div className="flex gap-2">
              <IconPicker 
                value={iconId} 
                onChange={onIconChange}
              />
              <Input
                id="entryTitle"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                placeholder="Enter entry title"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={onSubmit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
