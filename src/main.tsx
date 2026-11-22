import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { applyLayerTokens } from './lib/layers';
import { hydrateStore, startPersistence } from './lib/persist';
import './styles/index.css';

applyLayerTokens();

/** Keeps the browser UI colour in step with the active theme token. */
function syncThemeColor(): void {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (value) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value);
}

async function boot(): Promise<void> {
  // The saved profile is applied before the first render so a reload shows the
  // same chats and files instead of an empty workspace.
  await hydrateStore();
  startPersistence();
  syncThemeColor();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }
}

void boot();
