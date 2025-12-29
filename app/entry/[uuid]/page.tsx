"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { EntryEditor } from "@/components/entry-editor";
import type { EntryData } from "@/lib/tauri";
import { getEntries } from "@/lib/tauri";

export default function EntryPage() {
  const params = useParams();
  const uuid = params.uuid as string;
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEntry = async () => {
      try {
        // Get the group UUID from URL query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const groupUuid = urlParams.get('groupUuid');
        
        if (!groupUuid) {
          console.error('No group UUID found in URL parameters');
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

    if (uuid) {
      loadEntry();
    }
  }, [uuid]);

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
      />
    </div>
  );
}
