"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Edit, User, Key, Trash2, ExternalLink, Star, GripVertical } from "lucide-react";
import { getIconComponent } from "@/components/IconPicker";
import { updateEntry } from "@/lib/tauri";
import { useDraggable } from "@dnd-kit/core";
import { useToast } from "@/components/ui/use-toast";
import type { EntryData } from "@/lib/tauri";
import type { ColumnConfig } from "./types";

interface EntryListItemProps {
  entry: EntryData;
  visibleColumns: ColumnConfig[];
  isSelected: boolean;
  isContextMenuOpen: boolean;
  isChecked: boolean;
  isDragging?: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
  onContextMenuChange: (open: boolean) => void;
  onCopyField: (text: string, fieldName: string) => void;
  onOpenUrl: (url: string) => void;
  onDelete: () => void;
  onRefresh: () => void;
  formatTimestamp: (timestamp?: string) => string;
}

export function EntryListItem({
  entry,
  visibleColumns,
  isSelected,
  isContextMenuOpen,
  isChecked,
  isDragging: isDraggingProp,
  onSelect,
  onToggleCheck,
  onContextMenuChange,
  onCopyField,
  onOpenUrl,
  onDelete,
  onRefresh,
  formatTimestamp,
}: EntryListItemProps) {
  const { toast } = useToast();
  const iconId = entry.icon_id ?? 0;
  const EntryIcon = getIconComponent(iconId);

  const { attributes, listeners, setNodeRef, isDragging: isDraggingLocal } = useDraggable({
    id: `entry-${entry.uuid}`,
    data: { 
      type: 'entry',
      entry: entry,
    },
  });

  const isDragging = isDraggingProp || isDraggingLocal;

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateEntry({
        ...entry,
        is_favorite: !entry.is_favorite,
      });
      onRefresh();
      toast({
        title: entry.is_favorite ? "Removed from favorites" : "Added to favorites",
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    }
  };

  return (
    <ContextMenu onOpenChange={onContextMenuChange}>
      <ContextMenuTrigger onContextMenu={(e) => e.stopPropagation()}>
        <div
          ref={setNodeRef}
          className={`flex items-center gap-1 border-b px-4 py-2.5 hover:bg-accent cursor-pointer select-none ${
            isSelected || isContextMenuOpen || isChecked ? "bg-accent" : ""
          } ${isDragging ? "opacity-50 bg-accent" : ""}`}
          onDoubleClick={onSelect}
          style={{ touchAction: 'none' }}
        >
          {/* Drag Handle */}
          <div
            {...listeners}
            {...attributes}
            className="flex items-center justify-center w-4 flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </div>
          {/* Checkbox */}
          <div className="flex items-center w-8 justify-center flex-shrink-0">
            <Checkbox
              checked={isChecked}
              onCheckedChange={onToggleCheck}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          {/* Icon */}
          <div className="flex items-center w-8 flex-shrink-0">
            <EntryIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* Dynamic columns */}
          {visibleColumns.map((col) => (
            <div key={col.id} className="flex-1 overflow-hidden min-w-0">
              {col.id === 'title' && (
                <p className="truncate text-sm font-medium">{entry.title}</p>
              )}
              {col.id === 'username' && (
                <p 
                  className="truncate text-sm text-muted-foreground cursor-pointer"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onCopyField(entry.username, "Username");
                  }}
                  title="Double-click to copy"
                >
                  {entry.username || "—"}
                </p>
              )}
              {col.id === 'password' && (
                <p 
                  className="truncate text-sm text-muted-foreground font-mono cursor-pointer"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onCopyField(entry.password, "Password");
                  }}
                  title="Double-click to copy"
                >
                  {entry.password ? "••••••••" : "—"}
                </p>
              )}
              {col.id === 'url' && (
                <div className="flex items-center gap-1">
                  {entry.url ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenUrl(entry.url);
                      }}
                      className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline truncate group"
                      title={entry.url}
                    >
                      <span className="truncate">{entry.url}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              )}
              {col.id === 'notes' && (
                <p className="truncate text-sm text-muted-foreground" title={entry.notes}>
                  {entry.notes || "—"}
                </p>
              )}
              {col.id === 'created' && (
                <p className="truncate text-sm text-muted-foreground">
                  {formatTimestamp(entry.created)}
                </p>
              )}
              {col.id === 'modified' && (
                <p className="truncate text-sm text-muted-foreground">
                  {formatTimestamp(entry.modified)}
                </p>
              )}
            </div>
          ))}
          
          {/* Favorite Star */}
          <div className="flex items-center justify-center w-8 flex-shrink-0">
            <button
              onClick={handleToggleFavorite}
              className="p-1 hover:bg-accent rounded transition-colors"
              title={entry.is_favorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star 
                className={`h-4 w-4 transition-colors ${
                  entry.is_favorite 
                    ? "fill-yellow-400 text-yellow-400" 
                    : "text-muted-foreground hover:text-yellow-400"
                }`}
              />
            </button>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onSelect}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Entry
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={() => onCopyField(entry.username, "Username")}
          disabled={!entry.username}
        >
          <User className="mr-2 h-4 w-4" />
          Copy Username
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={() => onCopyField(entry.password, "Password")}
          disabled={!entry.password}
        >
          <Key className="mr-2 h-4 w-4" />
          Copy Password
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={onDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Entry
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
