"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KEEPASS_ICONS, getIconById, getIconComponentById } from "@/lib/keepass-icons";
import type { LucideIcon } from "lucide-react";

interface IconPickerProps {
  value: number;
  onChange: (iconId: number) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedIcon = getIconById(value);
  const IconComponent = selectedIcon.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-10 w-10" title={selectedIcon.description}>
          <IconComponent className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-2" 
        align="start" 
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="mb-2 text-xs text-muted-foreground px-1">
          Standard Icons (68)
        </div>
        <ScrollArea className="h-64" type="always" onWheel={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-8 gap-1 pr-3">
            {KEEPASS_ICONS.map((iconData) => {
              const Icon = iconData.icon;
              return (
                <Button
                  key={iconData.id}
                  variant={value === iconData.id ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => {
                    onChange(iconData.id);
                    setOpen(false);
                  }}
                  title={`${iconData.id}: ${iconData.description}`}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// Helper to get icon component by ID for display
export function getIconComponent(iconId: number): LucideIcon {
  return getIconComponentById(iconId);
}

// Static component that renders an icon by ID - use this instead of getIconComponent in render
interface DynamicIconProps {
  iconId: number;
  className?: string;
}

/* eslint-disable react-hooks/static-components */
export function DynamicIcon({ iconId, className }: DynamicIconProps) {
  const IconComponent = getIconComponentById(iconId);
  return <IconComponent className={className} />;
}
/* eslint-enable react-hooks/static-components */
