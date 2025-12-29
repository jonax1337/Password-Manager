"use client";

import { useState, useEffect } from "react";
import { UnlockScreen } from "@/components/unlock-screen";
import { QuickUnlockScreen } from "@/components/quick-unlock-screen";
import { MainApp } from "@/components/main-app";
import { Toaster } from "@/components/ui/toaster";
import { getLastDatabasePath } from "@/lib/storage";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function Home() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [lastDatabasePath, setLastDatabasePath] = useState<string | null>(null);
  const [showQuickUnlock, setShowQuickUnlock] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const lastPath = getLastDatabasePath();
    setLastDatabasePath(lastPath);
    setShowQuickUnlock(!!lastPath);
    setIsChecking(false);
  }, []);

  // Reset window title when on unlock screen
  useEffect(() => {
    if (!isUnlocked) {
      const resetTitle = async () => {
        const appWindow = getCurrentWindow();
        await appWindow.setTitle("Simple Password Manager");
      };
      resetTitle();
    }
  }, [isUnlocked]);

  if (isChecking) {
    return null;
  }

  return (
    <main className="h-screen w-screen overflow-hidden">
      {!isUnlocked ? (
        showQuickUnlock && lastDatabasePath ? (
          <QuickUnlockScreen
            lastDatabasePath={lastDatabasePath}
            onUnlock={() => setIsUnlocked(true)}
            onCancel={() => setShowQuickUnlock(false)}
          />
        ) : (
          <UnlockScreen onUnlock={() => setIsUnlocked(true)} />
        )
      ) : (
        <MainApp onClose={() => setIsUnlocked(false)} />
      )}
      <Toaster />
    </main>
  );
}
