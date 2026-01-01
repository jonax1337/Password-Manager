"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface KdfWarningDialogProps {
  open: boolean;
  onSkip: () => void;
  onUpgrade: () => void;
  kdfType: string;
}

export function KdfWarningDialog({ open, onSkip, onUpgrade, kdfType }: KdfWarningDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleUpgrade = () => {
    if (dontShowAgain) {
      localStorage.setItem("kdf_warning_dismissed", "true");
    }
    onUpgrade();
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      localStorage.setItem("kdf_warning_dismissed", "true");
    }
    onSkip();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Weak Key Transformation Settings</DialogTitle>
          <DialogDescription className="space-y-3">
            <p>
              The key transformation settings of the database are weak.
            </p>
            <p>
              Do you want to set them to the current default values (recommended)?
            </p>
            <div className="text-xs bg-muted p-2 rounded mt-3">
              <strong>Current:</strong> {kdfType}<br />
              <strong>Recommended:</strong> Argon2id (2 iterations, 64 MB, 2 threads)
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 py-2">
          <Checkbox
            id="dont-show"
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked === true)}
          />
          <label
            htmlFor="dont-show"
            className="text-sm text-muted-foreground cursor-pointer select-none"
          >
            Do not show this dialog again; always &apos;No&apos;.
          </label>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSkip}>
            No
          </Button>
          <Button onClick={handleUpgrade}>
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
