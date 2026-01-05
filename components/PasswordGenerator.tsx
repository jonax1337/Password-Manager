"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Copy, RefreshCw, Check, X } from "lucide-react";
import { generatePassword } from "@/lib/tauri";
import { useToast } from "@/components/ui/use-toast";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

interface PasswordGeneratorProps {
  onClose: () => void;
}

export function PasswordGenerator({ onClose }: PasswordGeneratorProps) {
  const [password, setPassword] = useState("");
  const [length, setLength] = useState([16]);
  const [useUppercase, setUseUppercase] = useState(true);
  const [useLowercase, setUseLowercase] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const { toast } = useToast();

  const handleGenerate = async () => {
    try {
      const newPassword = await generatePassword(
        length[0],
        useUppercase,
        useLowercase,
        useNumbers,
        useSymbols
      );
      setPassword(newPassword);
    } catch (error: any) {
      toast({
        title: "Error",
        description: typeof error === 'string' ? error : (error?.message || "Failed to generate password"),
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    if (!password) return;

    try {
      await writeText(password);
      toast({
        title: "Copied",
        description: "Password copied to clipboard",
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-lg font-semibold">Password Generator</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-6 p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="space-y-3">
              <div className="rounded-md border bg-muted p-4">
                <div className="flex items-center justify-between">
                  <code className="text-sm break-all">{password}</code>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopy}
                      disabled={!password}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <PasswordStrengthMeter password={password} />
            </div>
          </div>

          <Button onClick={handleGenerate} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Generate Password
          </Button>
        </div>

        <Separator />

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Length: {length[0]}</Label>
            </div>
            <Slider
              value={length}
              onValueChange={setLength}
              min={8}
              max={64}
              step={1}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="uppercase">Uppercase (A-Z)</Label>
              <Switch
                id="uppercase"
                checked={useUppercase}
                onCheckedChange={setUseUppercase}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="lowercase">Lowercase (a-z)</Label>
              <Switch
                id="lowercase"
                checked={useLowercase}
                onCheckedChange={setUseLowercase}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="numbers">Numbers (0-9)</Label>
              <Switch
                id="numbers"
                checked={useNumbers}
                onCheckedChange={setUseNumbers}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="symbols">Symbols (!@#$...)</Label>
              <Switch
                id="symbols"
                checked={useSymbols}
                onCheckedChange={setUseSymbols}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
