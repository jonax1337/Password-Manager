"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronDown, Plus, Trash2, Edit2, Star, LayoutDashboard } from "lucide-react";
import { createGroup, deleteGroup, renameGroup, moveGroup, reorderGroup } from "@/lib/tauri";
import { useToast } from "@/components/ui/use-toast";
import type { GroupData } from "@/lib/tauri";
import { ask } from "@tauri-apps/plugin-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { getIconComponent, IconPicker } from "@/components/icon-picker";
import { saveGroupTreeState } from "@/lib/group-state";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

interface GroupTreeProps {
  group: GroupData;
  selectedUuid: string;
  onSelectGroup: (uuid: string) => void;
  onRefresh: () => void;
  onGroupDeleted?: (deletedUuid: string) => void;
  dbPath: string;
  initialExpandedGroups?: Set<string>;
}

export function GroupTree({
  group,
  selectedUuid,
  onSelectGroup,
  onRefresh,
  onGroupDeleted,
  dbPath,
  initialExpandedGroups,
}: GroupTreeProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    initialExpandedGroups || new Set([group.uuid])
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupIconId, setNewGroupIconId] = useState(48);
  const [renameGroupUuid, setRenameGroupUuid] = useState("");
  const [renameGroupName, setRenameGroupName] = useState("");
  const [renameGroupIconId, setRenameGroupIconId] = useState(48);
  const [parentUuid, setParentUuid] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const { toast } = useToast();

  // Save expanded groups to localStorage whenever they change
  useEffect(() => {
    saveGroupTreeState(dbPath, expandedGroups, selectedUuid);
  }, [expandedGroups, selectedUuid, dbPath]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    })
  );

  // Set global cursor during drag
  useEffect(() => {
    if (activeId) {
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.cursor = '';
    }
    return () => {
      document.body.style.cursor = '';
    };
  }, [activeId]);

  const toggleExpand = (uuid: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(uuid)) {
      newExpanded.delete(uuid);
    } else {
      newExpanded.add(uuid);
    }
    setExpandedGroups(newExpanded);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      await createGroup(newGroupName, parentUuid, newGroupIconId);
      toast({
        title: "Success",
        description: "Group created successfully",
        variant: "success",
      });
      setNewGroupName("");
      setNewGroupIconId(48);
      setShowCreateDialog(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: typeof error === 'string' ? error : (error?.message || "Failed to create group"),
        variant: "destructive",
      });
    }
  };

  const handleRenameGroup = async () => {
    if (!renameGroupName.trim()) return;

    try {
      await renameGroup(renameGroupUuid, renameGroupName, renameGroupIconId);
      toast({
        title: "Success",
        description: "Group renamed successfully",
        variant: "success",
      });
      setShowRenameDialog(false);
      setRenameGroupName("");
      setRenameGroupUuid("");
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: typeof error === 'string' ? error : (error?.message || "Failed to rename group"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async (uuid: string) => {
    // Find the group to get its name
    const groupToDelete = findGroupByUuid(group, uuid);
    const groupName = groupToDelete?.name || "this group";
    
    const shouldDelete = await ask(
      `Are you sure you want to delete "${groupName}" and all its contents?`,
      { kind: "warning", title: "Delete Group" }
    );
    
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteGroup(uuid);
      toast({
        title: "Success",
        description: "Group deleted successfully",
        variant: "success",
      });
      
      // Notify parent that group was deleted
      if (onGroupDeleted) {
        onGroupDeleted(uuid);
      }
      
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: typeof error === 'string' ? error : (error?.message || "Failed to delete group"),
        variant: "destructive",
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    console.log('🎯 DragStart:', event.active.id);
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      if (overId !== null) {
        setOverId(null);
      }
      return;
    }
    
    // Simple: just track which folder we're over
    if (overId !== over.id) {
      setOverId(over.id as string);
      console.log('📍 DragOver:', over.id);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('💧 Drop:', active.id, '→', over?.id);
    
    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) {
      console.log('❌ Drop cancelled');
      return;
    }

    const draggedId = active.id as string;
    const targetId = over.id as string;
    
    const draggedGroup = findGroupByUuid(group, draggedId);
    const targetGroup = findGroupByUuid(group, targetId);
    
    if (!draggedGroup || !targetGroup) return;

    try {
      // Simple: always nest into target
      if (isDescendant(draggedGroup, targetGroup)) {
        toast({
          title: "Invalid Move",
          description: "Cannot move a group into its own descendant",
          variant: "destructive",
        });
        return;
      }

      await moveGroup(draggedId, targetId);
      toast({
        title: "Success",
        description: `Moved "${draggedGroup.name}" into "${targetGroup.name}"`,
        variant: "success",
      });
      
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: typeof error === 'string' ? error : (error?.message || "Failed to move group"),
        variant: "destructive",
      });
    }
  };

  const findParentGroup = (g: GroupData, childUuid: string): GroupData | null => {
    for (const child of g.children) {
      if (child.uuid === childUuid) return g;
      const found = findParentGroup(child, childUuid);
      if (found) return found;
    }
    return null;
  };

  const findGroupByUuid = (g: GroupData, uuid: string): GroupData | null => {
    if (g.uuid === uuid) return g;
    for (const child of g.children) {
      const found = findGroupByUuid(child, uuid);
      if (found) return found;
    }
    return null;
  };

  const isDescendant = (parent: GroupData, potentialChild: GroupData): boolean => {
    if (parent.uuid === potentialChild.uuid) return true;
    
    for (const child of parent.children) {
      if (isDescendant(child, potentialChild)) {
        return true;
      }
    }
    
    return false;
  };

  const DraggableFolder = ({ g, depth }: { g: GroupData; depth: number }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: g.uuid,
      disabled: depth === 0, // Root can't be dragged
      data: {
        type: 'folder',
      },
    });
    
    // Prevent drag listeners from interfering with right-click
    const dragListeners = {
      ...listeners,
      onPointerDown: (e: React.PointerEvent) => {
        // Ignore right-click for dragging
        if (e.button === 2) return;
        listeners?.onPointerDown?.(e);
      },
    };

    const { setNodeRef: setDropRef, isOver } = useDroppable({
      id: g.uuid,
    });

    const isExpanded = expandedGroups.has(g.uuid);
    const isSelected = g.uuid === selectedUuid;
    const hasChildren = g.children && g.children.length > 0;
    const FolderIcon = getIconComponent(g.icon_id ?? 48);
    
    const isDropTarget = overId === g.uuid;

    return (
      <div key={g.uuid}>
        <div ref={setDropRef} data-group-id={g.uuid}>
          <div 
            ref={setNodeRef}
            {...dragListeners}
            {...attributes}
            style={{ 
              opacity: isDragging ? 0.6 : 1,
              cursor: isDragging ? 'grabbing' : 'default'
            }}
          >
            <ContextMenu>
              <ContextMenuTrigger asChild onContextMenu={(e: React.MouseEvent) => e.stopPropagation()}>
                <div
                  className={`flex items-center gap-1 px-2 py-1.5 rounded transition-all outline-none hover:bg-accent/50 data-[state=open]:bg-accent/50 ${
                    isSelected ? "bg-accent font-medium" : ""
                  } ${isDropTarget ? "bg-primary/20 border-l-4 border-l-primary" : ""}`}
                  style={{ paddingLeft: `${depth * 12 + 8}px` }}
                >
              <Button
                variant="ghost"
                size="icon"
                className={`h-5 w-5 p-0 ${!hasChildren ? 'pointer-events-none hover:bg-transparent' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  hasChildren && toggleExpand(g.uuid);
                }}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )
                ) : (
                  <div className="h-3 w-3" />
                )}
              </Button>

              <FolderIcon className="h-4 w-4 text-muted-foreground" />

              <span
                className="flex-1 text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGroup(g.uuid);
                }}
              >
                {g.name}
              </span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              onClick={() => {
                setParentUuid(g.uuid);
                setShowCreateDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Subgroup
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                setRenameGroupUuid(g.uuid);
                setRenameGroupName(g.name);
                setRenameGroupIconId(g.icon_id ?? 48);
                setShowRenameDialog(true);
              }}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Rename
            </ContextMenuItem>
            {depth > 0 && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => handleDeleteGroup(g.uuid)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </div>

    {isExpanded &&
      hasChildren &&
      g.children.map((child) => (
        <DraggableFolder key={child.uuid} g={child} depth={depth + 1} />
      ))}
  </div>
  );
  };

  const renderGroup = (g: GroupData, depth: number = 0) => {
    return <DraggableFolder g={g} depth={depth} />;
  };

  const activeGroup = activeId ? findGroupByUuid(group, activeId) : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <h2 className="text-sm font-semibold">Folders</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setParentUuid(null);
                setShowCreateDialog(true);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <ContextMenu>
            <ContextMenuTrigger asChild>
              <ScrollArea className="flex-1">
                <div className="p-1 min-h-full">
                  {/* Virtual Dashboard */}
                  <div
                    className={`flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded transition-colors ${
                      selectedUuid === "_dashboard" ? "bg-accent" : "hover:bg-accent/50"
                    }`}
                    onClick={() => onSelectGroup("_dashboard")}
                  >
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-sm font-medium">Dashboard</span>
                  </div>

                  {/* Virtual Favorites Folder */}
                  <div
                    className={`flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded transition-colors ${
                      selectedUuid === "_favorites" ? "bg-accent" : "hover:bg-accent/50"
                    }`}
                    onClick={() => onSelectGroup("_favorites")}
                  >
                    <Star className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-sm font-medium">Favorites</span>
                  </div>
                  
                  {renderGroup(group, 0)}
                </div>
              </ScrollArea>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => {
                setParentUuid(null);
                setShowCreateDialog(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                New Group
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
        
        <DragOverlay dropAnimation={null}>
          {activeGroup ? (
            <div className="flex items-center gap-1 px-2 py-1.5 bg-accent/50 rounded shadow-lg opacity-60">
              {(() => {
                const FolderIcon = getIconComponent(activeGroup.icon_id ?? 48);
                return <FolderIcon className="h-4 w-4 text-muted-foreground" />;
              })()}
              <span className="text-sm font-medium">{activeGroup.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
                <IconPicker 
                  value={newGroupIconId} 
                  onChange={setNewGroupIconId}
                />
                <Input
                  id="groupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                  placeholder="Enter group name"
                  className="flex-1"
                  autoFocus
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateGroup}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
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
                <IconPicker 
                  value={renameGroupIconId} 
                  onChange={setRenameGroupIconId}
                />
                <Input
                  id="renameGroupName"
                  value={renameGroupName}
                  onChange={(e) => setRenameGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRenameGroup()}
                  placeholder="Enter group name"
                  className="flex-1"
                  autoFocus
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRenameDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameGroup}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
