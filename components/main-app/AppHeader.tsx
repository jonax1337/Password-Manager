"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Save, Settings, LogOut, Globe, Folder, ChevronDown } from "lucide-react";
import { openSettingsWindow } from "@/lib/window";
import type { SearchScope } from "@/lib/storage";

interface AppHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isDirty: boolean;
  onSave: () => void;
  onLogout: () => void;
  searchScope: SearchScope;
  onSearchScopeChange: (scope: SearchScope) => void;
  canSearchInFolder: boolean;
}

export function AppHeader({
  searchQuery,
  onSearchChange,
  isDirty,
  onSave,
  onLogout,
  searchScope,
  onSearchScopeChange,
  canSearchInFolder,
}: AppHeaderProps) {
  return (
    <div className="flex items-center gap-4 border-b px-4 py-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search entries..."
          className={canSearchInFolder ? "w-full pl-9 pr-28" : "w-full pl-9"}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {canSearchInFolder && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs font-medium"
                >
                  {searchScope === "global" ? (
                    <>
                      <Globe className="h-3.5 w-3.5" />
                      <span>Global</span>
                    </>
                  ) : (
                    <>
                      <Folder className="h-3.5 w-3.5" />
                      <span>Folder</span>
                    </>
                  )}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => onSearchScopeChange("global")}
                  className="gap-2 cursor-pointer"
                >
                  <Globe className="h-4 w-4" />
                  <span>Global Search</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSearchScopeChange("folder")}
                  className="gap-2 cursor-pointer"
                >
                  <Folder className="h-4 w-4" />
                  <span>Folder Search</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
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
