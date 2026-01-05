"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Download, Upload, FileIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import type { EntryAttachment } from "@/lib/tauri";

interface AttachmentsTabProps {
  attachments: EntryAttachment[];
  onAttachmentsChange: (attachments: EntryAttachment[]) => void;
  onChange: () => void;
}

export function AttachmentsTab({ attachments, onAttachmentsChange, onChange }: AttachmentsTabProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleAddAttachment = async () => {
    try {
      setIsUploading(true);
      
      // Open file picker
      const selected = await open({
        multiple: false,
        title: "Select file to attach",
      });

      if (!selected || typeof selected !== 'string') {
        setIsUploading(false);
        return;
      }

      // Read file content
      const content = await readFile(selected);
      
      // Extract filename from path
      const filename = selected.split(/[/\\]/).pop() || "attachment";
      
      // Check if filename already exists
      const existingIndex = attachments.findIndex(a => a.key === filename);
      if (existingIndex !== -1) {
        toast({
          title: "File already exists",
          description: "An attachment with this name already exists. Please rename the file or remove the existing attachment first.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      // Add to attachments
      const newAttachment: EntryAttachment = {
        key: filename,
        data: Array.from(content),
      };

      onAttachmentsChange([...attachments, newAttachment]);
      onChange();

      toast({
        title: "Attachment added",
        description: `File "${filename}" has been attached`,
        variant: "success",
      });
    } catch (error: any) {
      console.error("Failed to add attachment:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to add attachment",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadAttachment = async (attachment: EntryAttachment) => {
    try {
      // Open save dialog
      const savePath = await save({
        defaultPath: attachment.key,
        title: "Save attachment",
      });

      if (!savePath) {
        return;
      }

      // Convert number array back to Uint8Array
      const data = new Uint8Array(attachment.data);
      
      // Write file
      await writeFile(savePath, data);

      toast({
        title: "Attachment saved",
        description: `File saved to ${savePath}`,
        variant: "success",
      });
    } catch (error: any) {
      console.error("Failed to save attachment:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save attachment",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAttachment = (key: string) => {
    const updated = attachments.filter(a => a.key !== key);
    onAttachmentsChange(updated);
    onChange();

    toast({
      title: "Attachment removed",
      description: `File "${key}" has been removed`,
      variant: "info",
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Attachments</h3>
          <p className="text-sm text-muted-foreground">
            Attach files to this entry
          </p>
        </div>
        <Button onClick={handleAddAttachment} disabled={isUploading}>
          <Upload className="mr-2 h-4 w-4" />
          {isUploading ? "Uploading..." : "Add File"}
        </Button>
      </div>

      {attachments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No attachments</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click &quot;Add File&quot; to attach a file to this entry
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <Card key={attachment.key}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{attachment.key}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(attachment.data.length)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownloadAttachment(attachment)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteAttachment(attachment.key)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
