"use client";

import { useState } from "react";
import { searchEntries, searchEntriesInGroup } from "@/lib/tauri";
import { useToast } from "@/components/ui/use-toast";
import type { EntryData } from "@/lib/tauri";
import type { SearchScope } from "@/lib/storage";

export function useSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EntryData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchScope, setSearchScope] = useState<SearchScope>("global");
  const { toast } = useToast();

  const handleSearch = async (query: string, scope: SearchScope, groupUuid?: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      try {
        let results: EntryData[];
        if (scope === 'folder' && groupUuid) {
          results = await searchEntriesInGroup(query, groupUuid);
        } else {
          results = await searchEntries(query);
        }
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

  const refreshSearch = async (scope: SearchScope, groupUuid?: string) => {
    if (searchQuery.trim() && isSearching) {
      try {
        let results: EntryData[];
        if (scope === 'folder' && groupUuid) {
          results = await searchEntriesInGroup(searchQuery, groupUuid);
        } else {
          results = await searchEntries(searchQuery);
        }
        setSearchResults(results);
      } catch (error: any) {
        toast({
          title: "Search Error",
          description: typeof error === 'string' ? error : (error?.message || "Failed to refresh search"),
          variant: "destructive",
        });
      }
    }
  };

  return {
    searchQuery,
    searchResults,
    isSearching,
    searchScope,
    setSearchScope,
    handleSearch,
    clearSearch,
    refreshSearch,
    setIsSearching,
  };
}
