"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, Save, Copy, Trash2, Edit, Wand2, Check } from "lucide-react";
import { updateEntry, deleteEntry, generatePassword } from "@/lib/tauri";
import { useToast } from "@/components/ui/use-toast";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { EntryData } from "@/lib/tauri";
import { PasswordStrengthMeter } from "@/components/password-strength-meter";
import { IconPicker } from "@/components/icon-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ask } from "@tauri-apps/plugin-dialog";
import { emit } from "@tauri-apps/api/event";

interface EntryEditorProps {
  entry: EntryData;
  onClose: () => void;
  onRefresh: () => void;
  onHasChangesChange?: (hasChanges: boolean) => void;
}

export function EntryEditor({ entry, onClose, onRefresh, onHasChangesChange }: EntryEditorProps) {
  const [formData, setFormData] = useState<EntryData>(entry);
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [repeatPassword, setRepeatPassword] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [iconId, setIconId] = useState(0);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setFormData(entry);
    setHasChanges(false);
    setShowPassword(false);
    setShowRepeatPassword(false);
    setRepeatPassword(entry.password); // Auto-fill repeat password
    // Load icon ID from entry.icon_id field
    setIconId(entry.icon_id ?? 0);
  }, [entry.uuid]);

  // Notify parent when hasChanges state changes
  useEffect(() => {
    onHasChangesChange?.(hasChanges);
  }, [hasChanges, onHasChangesChange]);

  const validateUrl = (url: string): boolean => {
    if (!url || url.trim() === "") {
      setUrlError(null);
      return true; // Empty URL is valid
    }

    try {
      // Add https:// if no protocol
      const urlToTest = url.match(/^https?:\/\//) ? url : `https://${url}`;
      const urlObj = new URL(urlToTest);
      
      // Check if it has a valid hostname
      if (!urlObj.hostname || urlObj.hostname.length === 0) {
        setUrlError("Invalid URL format");
        return false;
      }
      
      // Check if it's an IP address (IPv4 or IPv6)
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
      const isIpAddress = ipv4Regex.test(urlObj.hostname) || ipv6Regex.test(urlObj.hostname);
      
      // Allow localhost and IP addresses
      if (urlObj.hostname === "localhost" || isIpAddress) {
        setUrlError(null);
        return true;
      }
      
      // Check for at least one dot in hostname (e.g., example.com)
      if (!urlObj.hostname.includes(".")) {
        setUrlError("URL must be a valid domain (e.g., example.com)");
        return false;
      }
      
      // Check that domain contains at least one letter (reject pure numbers like 123.de)
      const domainParts = urlObj.hostname.split(".");
      const hasLetter = domainParts.some(part => /[a-zA-Z]/.test(part));
      if (!hasLetter) {
        setUrlError("Domain must contain at least one letter");
        return false;
      }
      
      // Validate domain name format (letters, numbers, hyphens)
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
      if (!domainRegex.test(urlObj.hostname)) {
        setUrlError("Invalid domain format");
        return false;
      }
      
      setUrlError(null);
      return true;
    } catch (error) {
      setUrlError("Invalid URL format");
      return false;
    }
  };

  const handleChange = (field: keyof EntryData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    
    // Validate URL field
    if (field === "url") {
      validateUrl(value);
    }
  };

  const handleIconChange = (newIconId: number) => {
    setIconId(newIconId);
    // Store icon ID in icon_id field
    setFormData((prev) => ({
      ...prev,
      icon_id: newIconId,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Validate URL before saving
    if (!validateUrl(formData.url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL or leave it empty",
        variant: "destructive",
      });
      return;
    }

    // Check if passwords match - only when both are filled
    if (formData.password && repeatPassword && formData.password !== repeatPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both password fields match",
        variant: "destructive",
      });
      return;
    }

    // Always ensure we're saving with the correct UUID
    const dataToSave = {
      ...formData,
      uuid: entry.uuid,
    };
    
    try {
      await updateEntry(dataToSave);
      
      // Emit event to main window to refresh and mark as dirty
      await emit('entry-updated', { entryUuid: entry.uuid });
      
      toast({
        title: "Success",
        description: "Entry updated successfully",
        variant: "success",
      });
      setHasChanges(false);
      // Don't close or navigate away - just refresh the data in background
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to update entry",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async (text: string, label: string, field: 'username' | 'password') => {
    try {
      await writeText(text);
      
      // Set copied state for visual feedback
      if (field === 'username') {
        setCopiedUsername(true);
        setTimeout(() => setCopiedUsername(false), 2000);
      } else {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      }
      
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
        variant: "info",
      });

      setTimeout(async () => {
        await writeText("");
      }, 30000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleGeneratePassword = async (strength: string) => {
    try {
      let length = 16;
      let useUppercase = true;
      let useLowercase = true;
      let useDigits = true;
      let useSymbols = true;

      switch (strength) {
        case "weak":
          length = 8;
          useSymbols = false;
          break;
        case "medium":
          length = 12;
          break;
        case "strong":
          length = 16;
          break;
        case "very-strong":
          length = 20;
          break;
        case "maximum":
          length = 32;
          break;
      }

      const password = await generatePassword(length, useUppercase, useLowercase, useDigits, useSymbols);
      
      // Auto-fill both password fields
      setFormData((prev) => ({ ...prev, password }));
      setRepeatPassword(password);
      setHasChanges(true);

      toast({
        title: "Password generated",
        description: `Generated ${strength} password (${length} characters)`,
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate password",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Edit Entry</h1>
        <Button variant="ghost" size="icon" className="pointer-events-none">
          <Edit className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4 pb-6">
          <div className="space-y-1">
            <Label htmlFor="title">Title</Label>
            <div className="flex gap-2">
              <IconPicker value={iconId} onChange={handleIconChange} />
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Entry title"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="username">Username</Label>
            <div className="flex gap-2">
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleChange("username", e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(formData.username, "Username", "username")}
                disabled={!formData.username}
                title="Copy username"
              >
                {copiedUsername ? (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(formData.password, "Password", "password")}
                  disabled={!formData.password}
                  title="Copy password"
                >
                  {copiedPassword ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {/* Repeat Password Field */}
            <div className="space-y-1 mt-3">
              <Label htmlFor="repeat-password">Repeat Password</Label>
              <div className="flex gap-2">
                <Input
                  id="repeat-password"
                  type="password"
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  onPaste={(e) => {
                    e.preventDefault();
                    toast({
                      title: "Paste disabled",
                      description: "Please type the password to confirm",
                      variant: "destructive",
                    });
                  }}
                  className={repeatPassword && formData.password && formData.password !== repeatPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
                  placeholder="Repeat password to confirm"
                  disabled={showPassword}
                />
                <Select value="" onValueChange={handleGeneratePassword}>
                  <SelectTrigger className="w-10 h-10 flex items-center justify-center [&>svg[aria-hidden]]:hidden hover:bg-accent hover:text-accent-foreground transition-colors" title="Generate password">
                    <Wand2 className="h-4 w-4" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weak" className="pl-2">Weak (8)</SelectItem>
                    <SelectItem value="medium" className="pl-2">Medium (12)</SelectItem>
                    <SelectItem value="strong" className="pl-2">Strong (16)</SelectItem>
                    <SelectItem value="very-strong" className="pl-2">Very Strong (20)</SelectItem>
                    <SelectItem value="maximum" className="pl-2">Maximum (32)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-4 mb-6">
              <PasswordStrengthMeter password={formData.password} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="url">URL</Label>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => handleChange("url", e.target.value)}
                  className={urlError ? "border-red-500 focus-visible:ring-red-500" : ""}
                  placeholder="https://example.com"
                />
                {urlError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{urlError}</p>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(formData.url, "URL", "password")}
                disabled={!formData.url}
                title="Copy URL"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Additional notes..."
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => handleChange("tags", e.target.value)}
              placeholder="Comma-separated tags"
            />
          </div>
        </div>
      </ScrollArea>

      <div className="sticky bottom-0 flex items-center justify-end gap-2 bg-background px-4 py-3 border-t">
        <Button onClick={handleSave} size="sm" disabled={!hasChanges || !!urlError || !!(formData.password && repeatPassword && formData.password !== repeatPassword)}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
}
