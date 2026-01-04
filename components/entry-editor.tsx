"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Save, Copy, Edit, Wand2, Check, Plus, X, Shield, Clock, Calendar } from "lucide-react";
import { updateEntry, deleteEntry, generatePassword } from "@/lib/tauri";
import { useToast } from "@/components/ui/use-toast";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { EntryData, CustomField } from "@/lib/tauri";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [copiedCustomField, setCopiedCustomField] = useState<number | null>(null);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const [viewHistoryDialogOpen, setViewHistoryDialogOpen] = useState(false);
  const [showHistoryPassword, setShowHistoryPassword] = useState(false);
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
        description: typeof error === 'string' ? error : (error?.message || "Failed to update entry"),
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

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "—";
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date);
    } catch {
      return "—";
    }
  };

  const [selectedCustomField, setSelectedCustomField] = useState<number | null>(null);
  const [editingCustomField, setEditingCustomField] = useState<CustomField | null>(null);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 bg-muted/30">
        <IconPicker value={iconId} onChange={handleIconChange} />
        <div>
          <h1 className="text-lg font-semibold">Edit Entry</h1>
          <p className="text-sm text-muted-foreground">You are editing an existing entry.</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
          <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            General
          </TabsTrigger>
          <TabsTrigger value="advanced" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            Advanced
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            History
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Title Row */}
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <Label htmlFor="title">Title:</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Entry title"
                />
              </div>

              {/* Username Row */}
              <div className="grid grid-cols-[80px_1fr_auto] items-center gap-2">
                <Label htmlFor="username">User name:</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(formData.username, "Username", "username")}
                  disabled={!formData.username}
                  title="Copy username"
                  className="h-10 w-10"
                >
                  {copiedUsername ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Password Row */}
              <div className="grid grid-cols-[80px_1fr_auto] items-center gap-2">
                <Label htmlFor="password">Password:</Label>
                <div className="relative">
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(formData.password, "Password", "password")}
                  disabled={!formData.password}
                  title="Copy password"
                  className="h-10 w-10"
                >
                  {copiedPassword ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Repeat Password Row */}
              <div className="grid grid-cols-[80px_1fr_auto] items-center gap-2">
                <Label htmlFor="repeat">Repeat:</Label>
                <Input
                  id="repeat"
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
                  className={repeatPassword && formData.password && formData.password !== repeatPassword ? "border-red-500" : ""}
                  disabled={showPassword}
                />
                <Select value="" onValueChange={handleGeneratePassword}>
                  <SelectTrigger className="h-10 w-10 px-0 justify-center [&>svg[aria-hidden]]:hidden" title="Generate password">
                    <Wand2 className="h-4 w-4" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weak">Weak (8)</SelectItem>
                    <SelectItem value="medium">Medium (12)</SelectItem>
                    <SelectItem value="strong">Strong (16)</SelectItem>
                    <SelectItem value="very-strong">Very Strong (20)</SelectItem>
                    <SelectItem value="maximum">Maximum (32)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quality/Strength Row */}
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <Label>Quality:</Label>
                <PasswordStrengthMeter password={formData.password} />
              </div>

              {/* URL Row */}
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <Label htmlFor="url">URL:</Label>
                <div className="space-y-1">
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => handleChange("url", e.target.value)}
                    className={urlError ? "border-red-500" : ""}
                    placeholder="https://example.com"
                  />
                  {urlError && <p className="text-xs text-red-500">{urlError}</p>}
                </div>
              </div>

              {/* Notes */}
              <div className="grid grid-cols-[80px_1fr] items-start gap-2">
                <Label htmlFor="notes" className="pt-2">Notes:</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Expires */}
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="expires"
                    checked={formData.expires}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      const updates: Partial<typeof formData> = { expires: isChecked };
                      
                      // Set default expiry time to 1 year from now if enabling and no time set
                      if (isChecked && !formData.expiry_time) {
                        const oneYearFromNow = new Date();
                        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
                        // Use local time, not UTC (KeePass stores local time)
                        const year = oneYearFromNow.getFullYear();
                        const month = String(oneYearFromNow.getMonth() + 1).padStart(2, '0');
                        const day = String(oneYearFromNow.getDate()).padStart(2, '0');
                        const hours = String(oneYearFromNow.getHours()).padStart(2, '0');
                        const minutes = String(oneYearFromNow.getMinutes()).padStart(2, '0');
                        updates.expiry_time = `${year}-${month}-${day}T${hours}:${minutes}`;
                      }
                      
                      setFormData(prev => ({ ...prev, ...updates }));
                      setHasChanges(true);
                    }}
                  />
                  <Label htmlFor="expires">Expires:</Label>
                </div>
                <div className="flex gap-2 w-full">
                  <Input
                    type="datetime-local"
                    value={formData.expiry_time?.slice(0, 16) || ''}
                    onChange={(e) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        expiry_time: e.target.value,
                        expires: true // Auto-enable expires when setting a time
                      }));
                      setHasChanges(true);
                    }}
                    disabled={!formData.expires}
                    className="flex-1"
                  />
                  <Select
                    value=""
                    onValueChange={(value) => {
                      const now = new Date();
                      let targetDate = new Date();
                      
                      switch(value) {
                        case '1day':
                          targetDate.setDate(now.getDate() + 1);
                          break;
                        case '1week':
                          targetDate.setDate(now.getDate() + 7);
                          break;
                        case '2weeks':
                          targetDate.setDate(now.getDate() + 14);
                          break;
                        case '1month':
                          targetDate.setMonth(now.getMonth() + 1);
                          break;
                        case '3months':
                          targetDate.setMonth(now.getMonth() + 3);
                          break;
                        case '6months':
                          targetDate.setMonth(now.getMonth() + 6);
                          break;
                        case '1year':
                          targetDate.setFullYear(now.getFullYear() + 1);
                          break;
                      }
                      
                      const year = targetDate.getFullYear();
                      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
                      const day = String(targetDate.getDate()).padStart(2, '0');
                      const hours = String(targetDate.getHours()).padStart(2, '0');
                      const minutes = String(targetDate.getMinutes()).padStart(2, '0');
                      
                      setFormData(prev => ({ 
                        ...prev, 
                        expiry_time: `${year}-${month}-${day}T${hours}:${minutes}`,
                        expires: true
                      }));
                      setHasChanges(true);
                    }}
                    disabled={!formData.expires}
                  >
                    <SelectTrigger className="h-10 w-10 px-0 justify-center [&>svg[aria-hidden]]:hidden" title="Set expiry preset">
                      <Clock className="h-4 w-4" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1day">1 Day</SelectItem>
                      <SelectItem value="1week">1 Week</SelectItem>
                      <SelectItem value="2weeks">2 Weeks</SelectItem>
                      <SelectItem value="1month">1 Month</SelectItem>
                      <SelectItem value="3months">3 Months</SelectItem>
                      <SelectItem value="6months">6 Months</SelectItem>
                      <SelectItem value="1year">1 Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Advanced Tab - String Fields */}
        <TabsContent value="advanced" className="flex-1 m-0">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newField: CustomField = { name: "", value: "", protected: false };
                        setFormData(prev => ({
                          ...prev,
                          custom_fields: [...(prev.custom_fields || []), newField]
                        }));
                        setHasChanges(true);
                        setSelectedCustomField((formData.custom_fields || []).length);
                        setEditingCustomField(newField);
                      }}
                    >
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedCustomField === null}
                      onClick={() => {
                        if (selectedCustomField !== null) {
                          setEditingCustomField(formData.custom_fields?.[selectedCustomField] || null);
                        }
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedCustomField === null}
                      onClick={() => {
                        if (selectedCustomField !== null) {
                          const newFields = (formData.custom_fields || []).filter((_, i) => i !== selectedCustomField);
                          setFormData(prev => ({ ...prev, custom_fields: newFields }));
                          setHasChanges(true);
                          setSelectedCustomField(null);
                        }
                      }}
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
                    <Button
                      size="sm"
                      onClick={() => {
                        const newFields = [...(formData.custom_fields || [])];
                        newFields[selectedCustomField] = editingCustomField;
                        setFormData(prev => ({ ...prev, custom_fields: newFields }));
                        setHasChanges(true);
                        setEditingCustomField(null);
                      }}
                    >
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
                    onChange={(e) => handleChange("tags", e.target.value)}
                    placeholder="Comma-separated tags"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Created and Modified timestamps */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-normal w-20">Created:</Label>
                  <span className="text-sm">{formatTimestamp(entry.created)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-normal w-20">Modified:</Label>
                  <span className="text-sm">{formatTimestamp(entry.modified)}</span>
                </div>
              </div>

              {/* Previous versions section */}
              <div className="space-y-2 mt-4">
                <Label className="text-sm font-normal">Previous versions:</Label>
                
                {entry.history && entry.history.length > 0 ? (
                  <>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[200px]">Version</TableHead>
                            <TableHead>Changes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entry.history
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map((historyEntry, index, sortedArray) => {
                              // Compare with the next newer version (or current entry for the newest history entry)
                              const newerVersion = index === 0 ? entry : sortedArray[index - 1];
                              
                              const changes: string[] = [];
                              if (historyEntry.title !== newerVersion.title) changes.push("Title");
                              if (historyEntry.username !== newerVersion.username) changes.push("Username");
                              if (historyEntry.password !== newerVersion.password) changes.push("Password");
                              if (historyEntry.url !== newerVersion.url) changes.push("URL");
                              if (historyEntry.notes !== newerVersion.notes) changes.push("Notes");
                              
                              const changeDescription = changes.length > 0 
                                ? changes.join(", ") + " changed"
                                : "Entry modified";
                              
                              return (
                                <TableRow 
                                  key={index}
                                  className={`cursor-pointer ${selectedHistoryIndex === index ? 'bg-accent' : ''}`}
                                  onClick={() => setSelectedHistoryIndex(index)}
                                  onDoubleClick={() => {
                                    setSelectedHistoryIndex(index);
                                    setViewHistoryDialogOpen(true);
                                    setShowHistoryPassword(false);
                                  }}
                                >
                                  <TableCell className="text-sm font-mono">
                                    {formatTimestamp(historyEntry.timestamp)}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {changeDescription}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={selectedHistoryIndex === null}
                        onClick={() => {
                          if (selectedHistoryIndex !== null) {
                            setViewHistoryDialogOpen(true);
                            setShowHistoryPassword(false);
                          }
                        }}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={selectedHistoryIndex === null}
                        onClick={async () => {
                          if (selectedHistoryIndex !== null) {
                            const sortedHistory = [...entry.history].sort(
                              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                            );
                            const selected = sortedHistory[selectedHistoryIndex];
                            const confirmed = await ask(
                              "Are you sure you want to restore this version? Current data will be moved to history.",
                              { title: "Restore History Entry", kind: "warning" }
                            );
                            if (confirmed) {
                              setFormData({
                                ...formData,
                                title: selected.title,
                                username: selected.username,
                                password: selected.password,
                                url: selected.url,
                                notes: selected.notes,
                              });
                              setRepeatPassword(selected.password);
                              setHasChanges(true);
                              toast({
                                title: "Restored",
                                description: "History entry restored. Click Save to apply changes.",
                              });
                            }
                          }
                        }}
                      >
                        Restore
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="border rounded-md p-8 text-center text-sm text-muted-foreground">
                    No history entries available. History entries will be created when you modify the entry.
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t px-4 py-3 bg-background">
        <Button 
          variant="outline" 
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || !!urlError || !!(formData.password && repeatPassword && formData.password !== repeatPassword)}
        >
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>

      {/* View History Dialog */}
      <Dialog open={viewHistoryDialogOpen} onOpenChange={setViewHistoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>History Entry Details</DialogTitle>
          </DialogHeader>
          {selectedHistoryIndex !== null && entry.history && (
            (() => {
              const sortedHistory = [...entry.history].sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              );
              const selected = sortedHistory[selectedHistoryIndex];
              
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Version:</Label>
                    <span className="text-sm">{formatTimestamp(selected.timestamp)}</span>
                  </div>
                  
                  <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Title:</Label>
                    <span className="text-sm">{selected.title || "—"}</span>
                  </div>
                  
                  <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Username:</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{selected.username || "—"}</span>
                      {selected.username && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await writeText(selected.username);
                            toast({ title: "Copied", description: "Username copied to clipboard" });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Password:</Label>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${selected.password ? 'font-mono' : ''}`}>
                        {selected.password ? (showHistoryPassword ? selected.password : "•".repeat(selected.password.length)) : "—"}
                      </span>
                      {selected.password && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowHistoryPassword(!showHistoryPassword)}
                          >
                            {showHistoryPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await writeText(selected.password);
                              toast({ title: "Copied", description: "Password copied to clipboard" });
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                    <Label className="text-sm text-muted-foreground">URL:</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm break-all">{selected.url || "—"}</span>
                      {selected.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await writeText(selected.url);
                            toast({ title: "Copied", description: "URL copied to clipboard" });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-[120px_1fr] items-start gap-2">
                    <Label className="text-sm text-muted-foreground pt-2">Notes:</Label>
                    <ScrollArea className="max-h-32 w-full">
                      <span className="text-sm whitespace-pre-wrap">{selected.notes || "—"}</span>
                    </ScrollArea>
                  </div>
                </div>
              );
            })()
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
