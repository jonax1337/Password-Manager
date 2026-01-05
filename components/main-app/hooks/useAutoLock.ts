"use client";

import { useState, useEffect, useRef } from "react";

export function useAutoLock(onLock: (isManualLogout: boolean) => void) {
  const [autoLockSeconds, setAutoLockSeconds] = useState<number>(0);
  const lastActivityRef = useRef<number>(Date.now());
  const autoLockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and listen for auto-lock setting changes
  useEffect(() => {
    // Load initial setting
    const seconds = parseInt(localStorage.getItem("autoLockSeconds") || "0");
    setAutoLockSeconds(seconds);

    // Listen for storage changes (from settings window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "autoLockSeconds" && e.newValue) {
        const newSeconds = parseInt(e.newValue);
        setAutoLockSeconds(newSeconds);
      }
    };

    // Also listen for custom event from same window (settings dialog in same window)
    const handleCustomStorageChange = () => {
      const seconds = parseInt(localStorage.getItem("autoLockSeconds") || "0");
      setAutoLockSeconds(seconds);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('autoLockChanged', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('autoLockChanged', handleCustomStorageChange);
    };
  }, []);

  // Auto-lock functionality
  useEffect(() => {
    if (autoLockSeconds === 0) {
      // Auto-lock disabled
      if (autoLockTimerRef.current) {
        clearInterval(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }
      return;
    }

    // Initialize last activity to now
    lastActivityRef.current = Date.now();

    // Update last activity on user interaction
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Track user activity
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);

    // Check inactivity every second
    autoLockTimerRef.current = setInterval(() => {
      const inactiveTime = Date.now() - lastActivityRef.current;
      const autoLockMs = autoLockSeconds * 1000;

      if (inactiveTime >= autoLockMs) {
        clearInterval(autoLockTimerRef.current!);
        onLock(false); // Auto-lock is not manual logout - preserve Quick Unlock
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      
      if (autoLockTimerRef.current) {
        clearInterval(autoLockTimerRef.current);
      }
    };
  }, [autoLockSeconds, onLock]);

  return { autoLockSeconds };
}
