"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EntryData, CustomField } from "@/lib/tauri";

interface AdvancedTabProps {
  formData: EntryData;
  setFormData: React.Dispatch<React.SetStateAction<EntryData>>;
  setHasChanges: React.Dispatch<React.SetStateAction<boolean>>;
}

export function AdvancedTab({ formData, setFormData, setHasChanges }: AdvancedTabProps) {
  const [selectedCustomField, setSelectedCustomField] = useState<number | null>(null);
  const [editingCustomField, setEditingCustomField] = useState<CustomField | null>(null);

  const handleAddField = () => {
    const newField: CustomField = { name: "", value: "", protected: false };
    setFormData(prev => ({
      ...prev,
      custom_fields: [...(prev.custom_fields || []), newField]
    }));
    setHasChanges(true);
    setSelectedCustomField((formData.custom_fields || []).length);
    setEditingCustomField(newField);
  };

  const handleEditField = () => {
    if (selectedCustomField !== null) {
      setEditingCustomField(formData.custom_fields?.[selectedCustomField] || null);
    }
  };

  const handleDeleteField = () => {
    if (selectedCustomField !== null) {
      const newFields = (formData.custom_fields || []).filter((_, i) => i !== selectedCustomField);
      setFormData(prev => ({ ...prev, custom_fields: newFields }));
      setHasChanges(true);
      setSelectedCustomField(null);
    }
  };

  const handleSaveField = () => {
    if (selectedCustomField !== null && editingCustomField) {
      const newFields = [...(formData.custom_fields || [])];
      newFields[selectedCustomField] = editingCustomField;
      setFormData(prev => ({ ...prev, custom_fields: newFields }));
      setHasChanges(true);
      setEditingCustomField(null);
    }
  };

  const handleTagsChange = (value: string) => {
    setFormData(prev => ({ ...prev, tags: value }));
    setHasChanges(true);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="border rounded-md">
          <div className="px-3 py-2 bg-muted/50 border-b font-medium text-sm">
            String fields
          </div>
          <div className="flex">
            <div className="flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Name</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(formData.custom_fields || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                        No custom fields
                      </TableCell>
                    </TableRow>
                  ) : (
                    (formData.custom_fields || []).map((field, index) => (
                      <TableRow 
                        key={index}
                        className={selectedCustomField === index ? "bg-accent" : "cursor-pointer"}
                        onClick={() => setSelectedCustomField(index)}
                      >
                        <TableCell className="font-medium">
                          {field.protected && <Shield className="h-3 w-3 inline mr-1" />}
                          {field.name || "(unnamed)"}
                        </TableCell>
                        <TableCell className="font-mono">
                          {field.protected ? "••••••••" : field.value || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="border-l p-2 flex flex-col gap-2 w-[100px]">
              <Button variant="outline" size="sm" onClick={handleAddField}>
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedCustomField === null}
                onClick={handleEditField}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedCustomField === null}
                onClick={handleDeleteField}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Edit Custom Field Dialog */}
        {editingCustomField !== null && selectedCustomField !== null && (
          <div className="border rounded-md p-4 space-y-3 bg-muted/30">
            <h4 className="font-medium">Edit Field</h4>
            <div className="grid grid-cols-[60px_1fr] items-center gap-2">
              <Label>Name:</Label>
              <Input
                value={editingCustomField.name}
                onChange={(e) => setEditingCustomField(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="Field name"
              />
            </div>
            <div className="grid grid-cols-[60px_1fr] items-center gap-2">
              <Label>Value:</Label>
              <Input
                type={editingCustomField.protected ? "password" : "text"}
                value={editingCustomField.value}
                onChange={(e) => setEditingCustomField(prev => prev ? { ...prev, value: e.target.value } : null)}
                placeholder="Field value"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={editingCustomField.protected}
                onCheckedChange={(checked) => setEditingCustomField(prev => prev ? { ...prev, protected: checked === true } : null)}
              />
              <Label className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Protected
              </Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingCustomField(null)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveField}>
                OK
              </Button>
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="border rounded-md">
          <div className="px-3 py-2 bg-muted/50 border-b font-medium text-sm">
            Tags
          </div>
          <div className="p-3">
            <Input
              value={formData.tags}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="Comma-separated tags"
            />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
