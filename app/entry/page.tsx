"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EntryEditor } from "@/components/entry-editor";
import type { EntryData } from "@/lib/tauri";
import { getEntries } from "@/lib/tauri";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ask } from "@tauri-apps/plugin-dialog";

function EntryContent() {
  const searchParams = useSearchParams();
  const uuid = searchParams.get('uuid');
  const groupUuid = searchParams.get('groupUuid');
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const isClosingRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const loadEntry = async () => {
      try {
        if (!groupUuid || !uuid) {
          console.error('Missing UUID parameters');
          setLoading(false);
          return;
        }

        const entries = await getEntries(groupUuid);
        const foundEntry = entries.find((e) => e.uuid === uuid);
        
        if (foundEntry) {
          setEntry(foundEntry);
        }
      } catch (error) {
        console.error('Failed to load entry:', error);
      } finally {
        setLoading(false);
      }
    };

    if (uuid && groupUuid) {
      loadEntry();
    }
  }, [uuid, groupUuid]);

  // Handle window close event with unsaved changes check
  useEffect(() => {
    const entryWindow = getCurrentWindow();
    let unlisten: (() => void) | undefined;

    const setupCloseHandler = async () => {
      unlisten = await entryWindow.onCloseRequested(async (event) => {
        // Skip prompt if already in closing process
        if (isClosingRef.current) {
          return;
        }

        if (hasUnsavedChangesRef.current) {
          event.preventDefault();
          
          const shouldClose = await ask(
            "You have unsaved changes. Are you sure you want to close this window?",
            {
              title: "Unsaved Changes",
              kind: "warning",
            }
          );

          if (shouldClose) {
            // Set flag to prevent re-triggering prompt
            isClosingRef.current = true;
            await entryWindow.destroy();
          }
        }
      });
    };

    setupCloseHandler();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const handleClose = () => {
    // Close this window
    if (typeof window !== 'undefined') {
      window.close();
    }
  };

  const handleRefresh = () => {
    // Reload entry data
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading entry...</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Entry not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <EntryEditor
        entry={entry}
        onClose={handleClose}
        onRefresh={handleRefresh}
        onHasChangesChange={setHasUnsavedChanges}
      />
    </div>
  );
}

export default function EntryPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <EntryContent />
    </Suspense>
  );
}
