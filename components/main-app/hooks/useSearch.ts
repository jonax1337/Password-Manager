"use client";

import { useState } from "react";
import { searchEntries } from "@/lib/tauri";
import { useToast } from "@/components/ui/use-toast";
import type { EntryData } from "@/lib/tauri";

export function useSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EntryData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      try {
        const results = await searchEntries(query);
        setSearchResults(results);
      } catch (error: any) {
        toast({
          title: "Search Error",
          description: typeof error === 'string' ? error : (error?.message || "Failed to search entries"),
          variant: "destructive",
        });
      }
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  };

  return {
    searchQuery,
    searchResults,
    isSearching,
    handleSearch,
    clearSearch,
    setIsSearching,
  };
}
