"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Printer, Download, SkipForward, Copy, CheckCircle2 } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

interface RecoveryKeyDialogProps {
  isOpen: boolean;
  masterPassword: string;
  databaseName: string;
  onClose: () => void;
}

export function RecoveryKeyDialog({
  isOpen,
  masterPassword,
  databaseName,
  onClose,
}: RecoveryKeyDialogProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handlePrint = () => {
    // Create a printable view
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (printWindow) {
      // Escape HTML to prevent XSS
      const escapeHtml = (text: string) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      const safeDatabaseName = escapeHtml(databaseName);
      const safeRecoveryKey = escapeHtml(masterPassword);
      const safeDate = escapeHtml(new Date().toLocaleString());
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Recovery Key - ${safeDatabaseName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              color: #333;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .warning {
              background-color: #fff3cd;
              border: 1px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .key-container {
              background-color: #f5f5f5;
              border: 2px solid #333;
              padding: 20px;
              margin: 20px 0;
              font-family: 'Courier New', monospace;
              font-size: 18px;
              text-align: center;
              letter-spacing: 2px;
              word-break: break-all;
            }
            .instructions {
              margin: 20px 0;
              line-height: 1.6;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <h1>Database Master Password Backup</h1>
          <p><strong>Database:</strong> ${safeDatabaseName}</p>
          <p><strong>Created:</strong> ${safeDate}</p>
          
          <div class="warning">
            <strong>⚠️ WICHTIG / IMPORTANT:</strong><br/>
            Bewahren Sie dieses Dokument an einem sehr sicheren Ort auf (z.B. Tresor).
            Dies ist Ihr Master-Passwort für die Datenbank.<br/>
            Keep this document in a very secure location (e.g., safe).
            This is your master password for the database.
          </div>
          
          <div class="key-container">
            ${safeRecoveryKey}
          </div>
          
          <div class="instructions">
            <h2>Sicherheitshinweise / Security Notes:</h2>
            <ul>
              <li>Lagern Sie dieses Dokument an einem sicheren Ort (z.B. Tresor)</li>
              <li>Store this document in a secure location (e.g., safe)</li>
              <li>Teilen Sie den Schlüssel nicht mit anderen</li>
              <li>Do not share this key with others</li>
              <li>Erstellen Sie bei Bedarf mehrere Kopien für verschiedene sichere Orte</li>
              <li>Create multiple copies for different secure locations if needed</li>
            </ul>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    
    toast({
      title: "Druckansicht geöffnet",
      description: "Die Druckansicht wurde in einem neuen Fenster geöffnet.",
    });
    onClose();
  };

  const handleSaveToFile = async () => {
    try {
      const filePath = await save({
        defaultPath: `${databaseName}-master-password.txt`,
        filters: [
          {
            name: "Text Files",
            extensions: ["txt"],
          },
        ],
      });

      if (filePath) {
        const content = `Database Master Password Backup
========================================

Database: ${databaseName}
Created: ${new Date().toLocaleString()}

MASTER PASSWORD:
${masterPassword}

⚠️ WICHTIG / IMPORTANT:
Bewahren Sie diese Datei an einem sehr sicheren Ort auf.
Keep this file in a very secure location.

WARNUNG / WARNING:
Das Speichern des Master-Passworts in einer Datei ist ein Sicherheitsrisiko.
Stellen Sie sicher, dass die Datei verschlüsselt oder an einem sehr sicheren Ort gespeichert wird.
Ziehen Sie in Betracht, diese Datei nach dem Memorieren des Passworts zu löschen.

Saving the master password to a file is a security risk.
Make sure the file is encrypted or stored in a very secure location.
Consider deleting this file after you have memorized the password.
`;

        await writeTextFile(filePath, content);
        
        toast({
          title: "Erfolgreich gespeichert",
          description: "Das Master-Passwort wurde in einer Datei gespeichert.",
          variant: "success",
        });
        onClose();
      }
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error?.toString() || "Konnte Datei nicht speichern",
        variant: "destructive",
      });
    }
  };

  const handleSkip = () => {
    toast({
      title: "Übersprungen",
      description: "Master-Passwort wurde nicht gesichert. Stellen Sie sicher, dass Sie es sich merken können!",
      variant: "destructive",
    });
    onClose();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(masterPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Kopiert",
        description: "Master-Passwort in die Zwischenablage kopiert",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Konnte nicht in die Zwischenablage kopieren",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Master-Passwort sichern</DialogTitle>
          <DialogDescription>
            Ihre Datenbank wurde erfolgreich erstellt. Sie können Ihr Master-Passwort jetzt
            ausdrucken oder speichern, um es sicher aufzubewahren.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              ⚠️ Wichtiger Sicherheitshinweis / Important Security Note
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Bewahren Sie Ihr Master-Passwort an einem sehr sicheren Ort auf.
              Jeder mit Zugriff darauf kann Ihre Datenbank öffnen!
              <br/><br/>
              Keep your master password in a very secure location.
              Anyone with access to it can open your database!
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Master-Passwort / Master Password:</label>
            <div className="relative">
              <div className="bg-muted p-4 rounded-lg font-mono text-sm break-all border-2 border-border">
                {masterPassword}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium">Wählen Sie eine Option:</p>
            
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={handlePrint}
            >
              <Printer className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Drucken (Empfohlen)</div>
                <div className="text-xs text-muted-foreground">
                  Sicher: Passwort ausdrucken und an einem sicheren Ort aufbewahren
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={handleSaveToFile}
            >
              <Download className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">In Datei speichern</div>
                <div className="text-xs text-muted-foreground">
                  Riskant: Passwort als Textdatei exportieren
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={handleSkip}
            >
              <SkipForward className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Überspringen</div>
                <div className="text-xs text-muted-foreground">
                  Nicht empfohlen: Kein Backup erstellen
                </div>
              </div>
            </Button>
          </div>
        </div>

        <DialogFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            Sie können diese Optionen nur jetzt nutzen. Das Master-Passwort wird danach nicht erneut angezeigt.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
