import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// Hook for managing local search with URL updates
export const useLocalSearch = (tabId, globalSearch) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localSearch, setLocalSearch] = useState("");

  // Get initial local search from URL
  useEffect(() => {
    const urlSearch = searchParams.get(`${tabId}_search`) || '';
    if (!globalSearch && urlSearch !== localSearch) {
      setLocalSearch(urlSearch);
    }
  }, [searchParams, globalSearch, tabId]);

  // Update URL when local search changes
  const updateLocalSearch = (value) => {
    setLocalSearch(value);
    const newSearchParams = new URLSearchParams(searchParams);
    if (value) {
      newSearchParams.set(`${tabId}_search`, value);
    } else {
      newSearchParams.delete(`${tabId}_search`);
    }
    setSearchParams(newSearchParams);
  };

  // Clear local search
  const clearLocalSearch = () => {
    setLocalSearch("");
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete(`${tabId}_search`);
    setSearchParams(newSearchParams);
  };

  return {
    localSearch,
    updateLocalSearch,
    clearLocalSearch
  };
};


