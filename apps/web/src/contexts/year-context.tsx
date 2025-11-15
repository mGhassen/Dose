"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { safeLocalStorage } from "@kit/lib";

const YEAR_STORAGE_KEY = "app-selected-year";

interface YearContextType {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  availableYears: string[];
}

const YearContext = createContext<YearContextType | undefined>(undefined);

export function YearProvider({ children }: { children: ReactNode }) {
  const currentYear = new Date().getFullYear();
  
  // Generate available years (current year ± 2 years) - compute before useState
  const availableYears = Array.from({ length: 5 }, (_, i) => 
    String(currentYear - 2 + i)
  );

  // Initialize from localStorage synchronously on client side
  // This function is called only once during useState initialization
  const getInitialYear = (): string => {
    if (typeof window === 'undefined') {
      return String(currentYear);
    }
    
    try {
      const saved = safeLocalStorage.getItem(YEAR_STORAGE_KEY);
      // Validate that saved year is in available years
      if (saved && availableYears.includes(saved)) {
        return saved;
      }
    } catch (error) {
      console.warn('Failed to read year from localStorage:', error);
    }
    
    // Default to current year (don't save here to avoid side effects during init)
    return String(currentYear);
  };

  const [selectedYear, setSelectedYearState] = useState<string>(getInitialYear);

  // Save to localStorage and cookie whenever year changes
  // Cookie is needed for server-side prefetching
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const currentSaved = safeLocalStorage.getItem(YEAR_STORAGE_KEY);
        // Always save the current selectedYear to ensure consistency
        if (currentSaved !== selectedYear) {
          safeLocalStorage.setItem(YEAR_STORAGE_KEY, selectedYear);
        }
        
        // Always set cookie for server-side access (even on initial mount)
        // This ensures server-side prefetching can read the year
        document.cookie = `app-selected-year=${selectedYear}; path=/; max-age=31536000; SameSite=Lax`;
      } catch (error) {
        console.warn('Failed to save year to localStorage/cookie:', error);
      }
    }
  }, [selectedYear]);

  const setSelectedYear = (year: string) => {
    if (availableYears.includes(year)) {
      setSelectedYearState(year);
    }
  };

  return (
    <YearContext.Provider value={{ selectedYear, setSelectedYear, availableYears }}>
      {children}
    </YearContext.Provider>
  );
}

export function useYear() {
  const context = useContext(YearContext);
  if (context === undefined) {
    throw new Error("useYear must be used within a YearProvider");
  }
  return context;
}

