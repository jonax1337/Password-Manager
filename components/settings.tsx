"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Moon, Sun, Monitor } from "lucide-react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [autoLockMinutes, setAutoLockMinutes] = useState<string>("0");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load auto-lock setting from localStorage
    const saved = localStorage.getItem("autoLockMinutes");
    if (saved) {
      setAutoLockMinutes(saved);
    }
  }, []);

  const handleClose = async () => {
    const window = getCurrentWebviewWindow();
    await window.close();
  };

  const handleAutoLockChange = (value: string) => {
    setAutoLockMinutes(value);
    localStorage.setItem("autoLockMinutes", value);
    // Dispatch custom event to notify main app of setting change
    window.dispatchEvent(new Event('autoLockChanged'));
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Settings</h1>
        <Button variant="ghost" size="icon" className="pointer-events-none">
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Appearance Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Appearance</h2>
              <p className="text-sm text-muted-foreground">
                Customize the look and feel of the application
              </p>
            </div>

            <div className="space-y-3">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setTheme("light")}
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setTheme("system")}
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </Button>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Security</h2>
              <p className="text-sm text-muted-foreground">
                Configure security and privacy settings
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="auto-lock">Auto-Lock</Label>
              <Select value={autoLockMinutes} onValueChange={handleAutoLockChange}>
                <SelectTrigger id="auto-lock">
                  <SelectValue placeholder="Select auto-lock duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Disabled</SelectItem>
                  <SelectItem value="1">1 minute</SelectItem>
                  <SelectItem value="2">2 minutes</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Automatically lock the database after a period of inactivity
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
