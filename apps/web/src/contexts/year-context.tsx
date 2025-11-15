"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
  
  // Generate available years (current year ± 2 years)
  const availableYears = Array.from({ length: 5 }, (_, i) => 
    String(currentYear - 2 + i)
  );

  // Initialize from localStorage or use current year
  const [selectedYear, setSelectedYearState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = safeLocalStorage.getItem(YEAR_STORAGE_KEY);
      if (saved && availableYears.includes(saved)) {
        return saved;
      }
    }
    return String(currentYear);
  });

  // Save to localStorage whenever year changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      safeLocalStorage.setItem(YEAR_STORAGE_KEY, selectedYear);
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

