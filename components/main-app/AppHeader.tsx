"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Save, Settings, LogOut } from "lucide-react";
import { openSettingsWindow } from "@/lib/window";

interface AppHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isDirty: boolean;
  onSave: () => void;
  onLogout: () => void;
}

export function AppHeader({
  searchQuery,
  onSearchChange,
  isDirty,
  onSave,
  onLogout,
}: AppHeaderProps) {
  return (
    <div className="flex items-center gap-4 border-b px-4 py-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search entries..."
          className="w-full pl-9"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onSave}
          title={isDirty ? "Save database (unsaved changes)" : "Save database"}
          className={isDirty ? "text-orange-500" : ""}
        >
          <Save className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => openSettingsWindow()}
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={onLogout} title="Logout">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
