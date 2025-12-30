"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

interface ZoomContextType {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

const ZoomContext = createContext<ZoomContextType | undefined>(undefined);

const ZOOM_LEVELS = [0.75, 0.85, 1.0, 1.1, 1.25, 1.5];
const DEFAULT_ZOOM_INDEX = 2;
const STORAGE_KEY_ZOOM = "deviceZoomLevel";
const STORAGE_KEY_AUTO = "deviceZoomAuto";

function getResponsiveZoomIndex(): number {
  if (typeof window === "undefined") return DEFAULT_ZOOM_INDEX;
  
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  
  // Kleinere Bildschirme oder höhere DPI = größerer Zoom
  if (width <= 1366 || dpr >= 1.5) {
    return 3; // 110%
  } else if (width <= 1600) {
    return 2; // 100%
  } else if (width <= 1920) {
    return 2; // 100%
  } else {
    return 1; // 85% für sehr große Bildschirme
  }
}

export function ZoomProvider({ children }: { children: React.ReactNode }) {
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [isAuto, setIsAuto] = useState(true);

  // Initial load: Check if auto mode or manual zoom
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAuto = localStorage.getItem(STORAGE_KEY_AUTO);
      const savedZoom = localStorage.getItem(STORAGE_KEY_ZOOM);
      
      if (savedAuto === "false" && savedZoom) {
        // User has manually set zoom
        setIsAuto(false);
        const parsed = parseFloat(savedZoom);
        const index = ZOOM_LEVELS.indexOf(parsed);
        if (index !== -1) {
          setZoomIndex(index);
        }
      } else {
        // Auto mode: responsive zoom
        setIsAuto(true);
        setZoomIndex(getResponsiveZoomIndex());
      }
    }
  }, []);

  // Apply zoom to document
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.style.fontSize = `${ZOOM_LEVELS[zoomIndex] * 16}px`;
    }
  }, [zoomIndex]);

  // Save to localStorage when changed manually
  const saveZoomSettings = (index: number, auto: boolean) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ZOOM, ZOOM_LEVELS[index].toString());
      localStorage.setItem(STORAGE_KEY_AUTO, auto.toString());
    }
  };

  // Handle window resize for auto mode
  useEffect(() => {
    if (!isAuto || typeof window === "undefined") return;

    const handleResize = () => {
      const newIndex = getResponsiveZoomIndex();
      if (newIndex !== zoomIndex) {
        setZoomIndex(newIndex);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isAuto, zoomIndex]);

  useEffect(() => {
    const unlistenZoomSet = listen<number>("zoom-set", (event) => {
      setIsAuto(false);
      const zoomLevel = event.payload;
      const index = ZOOM_LEVELS.indexOf(zoomLevel);
      if (index !== -1) {
        setZoomIndex(index);
        saveZoomSettings(index, false);
      }
    });

    const unlistenZoomIn = listen("zoom-in", () => {
      setIsAuto(false);
      setZoomIndex((prev) => {
        const newIndex = Math.min(prev + 1, ZOOM_LEVELS.length - 1);
        saveZoomSettings(newIndex, false);
        return newIndex;
      });
    });

    const unlistenZoomOut = listen("zoom-out", () => {
      setIsAuto(false);
      setZoomIndex((prev) => {
        const newIndex = Math.max(prev - 1, 0);
        saveZoomSettings(newIndex, false);
        return newIndex;
      });
    });

    const unlistenZoomReset = listen("zoom-reset", () => {
      setIsAuto(true);
      const autoIndex = getResponsiveZoomIndex();
      setZoomIndex(autoIndex);
      saveZoomSettings(autoIndex, true);
    });

    return () => {
      unlistenZoomSet.then((fn) => fn());
      unlistenZoomIn.then((fn) => fn());
      unlistenZoomOut.then((fn) => fn());
      unlistenZoomReset.then((fn) => fn());
    };
  }, []);

  const zoomIn = () => {
    setIsAuto(false);
    setZoomIndex((prev) => {
      const newIndex = Math.min(prev + 1, ZOOM_LEVELS.length - 1);
      saveZoomSettings(newIndex, false);
      return newIndex;
    });
  };

  const zoomOut = () => {
    setIsAuto(false);
    setZoomIndex((prev) => {
      const newIndex = Math.max(prev - 1, 0);
      saveZoomSettings(newIndex, false);
      return newIndex;
    });
  };

  const resetZoom = () => {
    setIsAuto(true);
    const autoIndex = getResponsiveZoomIndex();
    setZoomIndex(autoIndex);
    saveZoomSettings(autoIndex, true);
  };

  return (
    <ZoomContext.Provider
      value={{
        zoom: ZOOM_LEVELS[zoomIndex],
        zoomIn,
        zoomOut,
        resetZoom,
      }}
    >
      {children}
    </ZoomContext.Provider>
  );
}

export function useZoom() {
  const context = useContext(ZoomContext);
  if (context === undefined) {
    throw new Error("useZoom must be used within a ZoomProvider");
  }
  return context;
}
