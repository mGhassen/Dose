import { cleanTimezone } from './date-format';

// Default user settings configuration
export const DEFAULT_USER_SETTINGS = {
  theme: 'auto' as 'light' | 'dark' | 'auto',
  language: 'fr' as 'fr' | 'en',
  timezone: 'Europe/Paris',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h' as '12h' | '24h',
  notifications: {
    email: true,
    push: true,
    sms: false,
    maintenance: true,
    alerts: true,
    updates: false
  },
  dashboard: {
    defaultView: 'overview',
    widgets: ['recent_activities', 'maintenance_schedule', 'alerts'],
    refreshInterval: 30
  },
  preferences: {
    autoSave: true,
    confirmActions: true,
    showTooltips: true,
    compactMode: false
  }
};

export type UserSettings = typeof DEFAULT_USER_SETTINGS;

// localStorage key for user settings
const USER_SETTINGS_KEY = 'dose-user-settings';

// Get user settings from localStorage or return defaults
export const getUserSettings = (): UserSettings => {
  if (typeof window === 'undefined') {
    return DEFAULT_USER_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(USER_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all properties exist
      const settings = { ...DEFAULT_USER_SETTINGS, ...parsed };
      
      // Clean the timezone value to prevent corruption
      if (settings.timezone) {
        settings.timezone = cleanTimezone(settings.timezone);
      }
      
      return settings;
    }
  } catch (error) {
    console.error('Error parsing user settings from localStorage:', error);
  }

  return DEFAULT_USER_SETTINGS;
};

// Save user settings to localStorage
export const saveUserSettings = (settings: Partial<UserSettings>): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const currentSettings = getUserSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    
    // Clean the timezone value if it's being updated
    if (updatedSettings.timezone) {
      updatedSettings.timezone = cleanTimezone(updatedSettings.timezone);
    }
    
    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(updatedSettings));
  } catch (error) {
    console.error('Error saving user settings to localStorage:', error);
  }
};

// Reset user settings to defaults
export const resetUserSettings = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(DEFAULT_USER_SETTINGS));
  } catch (error) {
    console.error('Error resetting user settings:', error);
  }
};

// Get specific setting value
export const getUserSetting = <K extends keyof UserSettings>(key: K): UserSettings[K] => {
  const settings = getUserSettings();
  return settings[key];
};

// Update specific setting value
export const updateUserSetting = <K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
): void => {
  saveUserSettings({ [key]: value } as Partial<UserSettings>);
};
