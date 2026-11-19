import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

async function prepareRuntimeEnvironment() {
  if (typeof window === 'undefined') return;

  // Clear any cached mock service worker state so all API calls hit the real Express server
  try {
    localStorage.removeItem('atelier_msw_dynamic_db_v1');
    localStorage.removeItem('atelier_tools_v10_strict');
  } catch {
    // ignore storage errors
  }

  // Only start MSW if explicitly requested via localStorage flag for offline UI testing
  const forceMock =
    localStorage.getItem('atelier_force_msw_mock') === 'true';

  if (!forceMock && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.active?.scriptURL?.includes('mockServiceWorker.js')) {
          await reg.unregister();
        }
      }
    } catch {
      // ignore service worker unregister errors
    }
    return;
  }

  if (forceMock && import.meta.env.DEV) {
    try {
      const { worker } = await import('./mocks/browser');
      await (worker.start as any)({
        onUnhandledRequest: 'bypass',
        quiet: true,
      });
    } catch {
      // ignore
    }
  }
}

prepareRuntimeEnvironment().finally(() => {
  createRoot(document.getElementById('root')!).render(<App />);
});
