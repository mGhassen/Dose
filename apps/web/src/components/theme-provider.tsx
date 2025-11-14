"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useUserSettings } from "./user-settings-provider";

interface ThemeContextType {
  theme: "light" | "dark" | "auto";
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark" | "auto") => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, updateSetting, isLoading } = useUserSettings();
  const [mounted, setMounted] = useState(false);

  // On mount, set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update class on theme change
  useEffect(() => {
    if (mounted && !isLoading) {
      let isDark = false;
      
      if (settings.theme === "dark") {
        isDark = true;
      } else if (settings.theme === "auto") {
        // Check system preference
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      
      document.documentElement.classList.toggle("dark", isDark);
    }
  }, [settings.theme, mounted, isLoading]);

  // Listen for system theme changes when auto theme is selected
  useEffect(() => {
    if (mounted && !isLoading && settings.theme === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      
      const handleChange = () => {
        const isDark = mediaQuery.matches;
        document.documentElement.classList.toggle("dark", isDark);
      };
      
      mediaQuery.addEventListener("change", handleChange);
      
      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }
  }, [settings.theme, mounted, isLoading]);

  const toggleTheme = () => {
    const newTheme = settings.theme === "light" ? "dark" : "light";
    updateSetting("theme", newTheme);
  };

  const setTheme = (theme: "light" | "dark" | "auto") => {
    updateSetting("theme", theme);
  };

  return (
    <ThemeContext.Provider value={{ theme: settings.theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
} 