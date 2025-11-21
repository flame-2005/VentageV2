"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface SearchContextType {
  searchTerm: string;
  inputValue: string;
  setInputValue: (term: string) => void;
  setSearchTerm: (term: string) => void;
  applySearch: (term?: string) => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

interface SearchProviderProps {
  children: ReactNode;
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [searchTerm, setSearchTerm] = useState(""); // Applied search term
  const [inputValue, setInputValue] = useState(""); // Input field value

  const applySearch = (value?: string) => {
  const term = value ?? inputValue;
  setSearchTerm(term);
};

  const clearSearch = () => {
    setSearchTerm("");
    setInputValue("");
  };

  return (
    <SearchContext.Provider
      value={{
        searchTerm,
        inputValue,
        setInputValue,
        setSearchTerm,
        applySearch,
        clearSearch,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

// Custom hook to use the search context
export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}

// Export the context for direct access if needed
export { SearchContext };