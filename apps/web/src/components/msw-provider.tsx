"use client";
import { useEffect } from 'react';

export function MSWProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mswEnabled = process.env.NEXT_PUBLIC_ENABLE_MSW !== 'false';

    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && mswEnabled) {
      (window as any).__MSW_ENABLED__ = true;
      import('@kit/mocks/browser')
        .then(({ worker }) => {
          const startPromise = worker.start({
            onUnhandledRequest: 'bypass',
            quiet: true,
          });
          (window as any).__MSW_READY__ = startPromise;
          return startPromise.then(() => {
            (window as any).__MSW_ACTIVE__ = true;
            // Notify listeners that MSW is ready so data hooks can refetch
            try {
              window.dispatchEvent(new Event('msw:ready'));
            } catch (_) {
              // no-op
            }
          });
        })
        .catch((error) => {
          console.error('[MSW Provider] Failed to start MSW:', error);
          (window as any).__MSW_READY__ = Promise.resolve();
          (window as any).__MSW_ACTIVE__ = false;
        });
    }
  }, []);

  return <>{children}</>;
}
