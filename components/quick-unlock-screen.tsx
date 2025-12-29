"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, X } from "lucide-react";
import { openDatabase } from "@/lib/tauri";
import { useToast } from "@/components/ui/use-toast";

interface QuickUnlockScreenProps {
  lastDatabasePath: string;
  onUnlock: () => void;
  onCancel: () => void;
}

export function QuickUnlockScreen({
  lastDatabasePath,
  onUnlock,
  onCancel,
}: QuickUnlockScreenProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getFileName = (path: string) => {
    return path.split("\\").pop()?.split("/").pop() || path;
  };

  const handleUnlock = async () => {
    if (!password) {
      toast({
        title: "Missing Password",
        description: "Please enter your master password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const [rootGroup, dbPath] = await openDatabase(lastDatabasePath, password);
      toast({
        title: "Success",
        description: "Database unlocked successfully",
        variant: "success",
      });
      onUnlock();
    } catch (error: any) {
      toast({
        title: "Failed to Unlock",
        description: error?.toString() || "Invalid password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="relative w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-lg">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2"
          onClick={onCancel}
          title="Open different database"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex flex-col items-center space-y-2">
          <div className="rounded-full bg-primary p-3">
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Quick Unlock</h2>
          <p className="text-center text-sm text-muted-foreground">
            {getFileName(lastDatabasePath)}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-password">Master Password</Label>
            <Input
              id="quick-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              placeholder="Enter your master password"
              autoFocus
            />
          </div>

          <Button
            onClick={handleUnlock}
            disabled={loading || !password}
            className="w-full"
          >
            {loading ? "Unlocking..." : "Unlock"}
          </Button>

          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full"
            disabled={loading}
          >
            Open Different Database
          </Button>
        </div>
      </div>
    </div>
  );
}
