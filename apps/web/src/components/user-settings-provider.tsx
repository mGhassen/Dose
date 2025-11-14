'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  getUserSettings, 
  saveUserSettings, 
  resetUserSettings, 
  getUserSetting, 
  updateUserSetting,
  DEFAULT_USER_SETTINGS,
  type UserSettings 
} from '@smartlogbook/lib/user-settings';

interface UserSettingsContextType {
  settings: UserSettings;
  isLoading: boolean;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  resetToDefaults: () => void;
  getSetting: <K extends keyof UserSettings>(key: K) => UserSettings[K];
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const storedSettings = getUserSettings();
        setSettings(storedSettings);
      } catch (error) {
        console.error('Error loading user settings:', error);
        setSettings(DEFAULT_USER_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Update a specific setting
  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    try {
      updateUserSetting(key, value);
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Error updating user setting:', error);
    }
  };

  // Update multiple settings at once
  const updateSettings = (newSettings: Partial<UserSettings>) => {
    try {
      saveUserSettings(newSettings);
      setSettings(prev => ({ ...prev, ...newSettings }));
    } catch (error) {
      console.error('Error updating user settings:', error);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    try {
      resetUserSettings();
      setSettings(DEFAULT_USER_SETTINGS);
    } catch (error) {
      console.error('Error resetting user settings:', error);
    }
  };

  // Get a specific setting value
  const getSetting = <K extends keyof UserSettings>(key: K): UserSettings[K] => {
    return settings[key];
  };

  const value: UserSettingsContextType = {
    settings,
    isLoading,
    updateSetting,
    updateSettings,
    resetToDefaults,
    getSetting
  };

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const context = useContext(UserSettingsContext);
  if (context === undefined) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return context;
}
