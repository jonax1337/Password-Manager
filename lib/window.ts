import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { EntryData } from "@/lib/tauri";

export async function openEntryWindow(entry: EntryData, groupUuid: string) {
  try {
    // Create a unique window label (must be alphanumeric and hyphens only)
    const windowLabel = `entry-${entry.uuid.replace(/[^a-zA-Z0-9-]/g, '-')}`;
    
    // Check if window already exists
    const existingWindow = await WebviewWindow.getByLabel(windowLabel);
    if (existingWindow) {
      await existingWindow.setFocus();
      return;
    }

    // Create new window with localhost URL for development
    // Pass group UUID as query parameter since sessionStorage doesn't work across Tauri windows
    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev ? 'http://localhost:3000' : window.location.origin;
    
    const webview = new WebviewWindow(windowLabel, {
      url: `${baseUrl}/entry/${entry.uuid}?groupUuid=${encodeURIComponent(groupUuid)}`,
      title: entry.title || "Entry Editor",
      width: 800,
      height: 600,
      resizable: true,
      center: true,
    });

    console.log('Creating entry window:', windowLabel);
    
    // Wait for window to be ready
    webview.once("tauri://created", () => {
      console.log("Entry window created successfully");
    });

    webview.once("tauri://error", (e) => {
      console.error("Error creating entry window:", e);
    });
  } catch (error) {
    console.error("Failed to open entry window:", error);
    throw error;
  }
}
