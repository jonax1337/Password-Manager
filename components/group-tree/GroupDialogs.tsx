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

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  iconId: number;
  onGroupNameChange: (name: string) => void;
  onIconIdChange: (iconId: number) => void;
  onSubmit: () => void;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  groupName,
  iconId,
  onGroupNameChange,
  onIconIdChange,
  onSubmit,
}: CreateGroupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Enter a name for the new group
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <div className="flex gap-2">
              <IconPicker value={iconId} onChange={onIconIdChange} />
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => onGroupNameChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                placeholder="Enter group name"
                className="flex-1"
                autoFocus
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RenameGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  iconId: number;
  onGroupNameChange: (name: string) => void;
  onIconIdChange: (iconId: number) => void;
  onSubmit: () => void;
}

export function RenameGroupDialog({
  open,
  onOpenChange,
  groupName,
  iconId,
  onGroupNameChange,
  onIconIdChange,
  onSubmit,
}: RenameGroupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Group</DialogTitle>
          <DialogDescription>
            Enter a new name for the group
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="renameGroupName">Group Name</Label>
            <div className="flex gap-2">
              <IconPicker value={iconId} onChange={onIconIdChange} />
              <Input
                id="renameGroupName"
                value={groupName}
                onChange={(e) => onGroupNameChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                placeholder="Enter group name"
                className="flex-1"
                autoFocus
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>Rename</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
