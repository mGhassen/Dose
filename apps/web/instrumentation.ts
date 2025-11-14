export async function register() {
  const isNode = process.env.NEXT_RUNTIME === 'nodejs';
  const isDev = process.env.NODE_ENV === 'development';
  const mswEnabled = process.env.NEXT_PUBLIC_ENABLE_MSW !== 'false';

  if (!isNode || !isDev || !mswEnabled) return;

  try {
    const { server } = await import('@kit/mocks/server');
    server.listen({ onUnhandledRequest: 'bypass' });
    // eslint-disable-next-line no-console
    console.log('[MSW Node] Started via instrumentation.ts');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[MSW Node] Failed to start:', err);
  }
}


