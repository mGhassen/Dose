"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { getDateRangeForPreset } from "@kit/lib/date-periods";
import type { DateRange } from "@kit/lib/date-periods";
import { safeLocalStorage } from "@kit/lib/localStorage";

const DASHBOARD_PERIOD_KEY = "dashboard-period";

function getInitialDateRange(): DateRange {
  if (typeof window === "undefined") return getDateRangeForPreset("this_year");
  try {
    const saved = safeLocalStorage.getItem(DASHBOARD_PERIOD_KEY);
    if (saved) {
      const { startDate, endDate } = JSON.parse(saved);
      if (
        startDate &&
        endDate &&
        /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
        /^\d{4}-\d{2}-\d{2}$/.test(endDate)
      ) {
        return { startDate, endDate };
      }
    }
  } catch {
    /* ignore */
  }
  return getDateRangeForPreset("this_year");
}

type DashboardPeriodContextValue = {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
};

const DashboardPeriodContext =
  createContext<DashboardPeriodContextValue | null>(null);

export function DashboardPeriodProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dateRange, setDateRangeState] = useState<DateRange>(getInitialDateRange);

  const setDateRange = useCallback((range: DateRange) => {
    setDateRangeState(range);
    safeLocalStorage.setItem(DASHBOARD_PERIOD_KEY, JSON.stringify(range));
  }, []);

  const value = useMemo(
    () => ({ dateRange, setDateRange }),
    [dateRange, setDateRange]
  );

  return (
    <DashboardPeriodContext.Provider value={value}>
      {children}
    </DashboardPeriodContext.Provider>
  );
}

export function useDashboardPeriod(): DashboardPeriodContextValue {
  const ctx = useContext(DashboardPeriodContext);
  if (!ctx) {
    throw new Error(
      "useDashboardPeriod must be used within DashboardPeriodProvider"
    );
  }
  return ctx;
}
