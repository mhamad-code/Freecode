import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useI18n } from '../lib/i18n';
import { applyTheme } from '../themes/registry';
import { Drawer, CommandPalette, Rail, TopBar } from '../components/Shell';
import { ToastHost, useMedia } from '../components/ui';
import Workspace from '../pages/Workspace';
import Settings from '../pages/Settings';
import Integrations from '../pages/Integrations';
import Connect from '../pages/Connect';
import Sites from '../pages/Sites';

// Empty on a root deployment; "/Freecode" on a GitHub Pages project site.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

function useApplyTheme() {
  const themeId = useStore((s) => s.themeId);
  const reduce = useStore((s) => s.settings.reduceMotion);
  const accent = useStore((s) => s.settings.accent);
  useEffect(() => {
    const resolve = () => {
      if (themeId === 'auto') return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      return themeId;
    };
    applyTheme(resolve(), reduce);
    const root = document.documentElement;
    if (accent) {
      root.style.setProperty('--accent', accent);
      root.style.removeProperty('--accent-ink');
      root.style.setProperty('--accent-ink', '#0b0b0c');
    }
    if (themeId !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => applyTheme(mq.matches ? 'light' : 'dark', reduce);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themeId, reduce, accent]);
}

function useLanguage() {
  const lang = useStore((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
}

function useShortcuts() {
  const store = useStore.getState;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const typing = /input|textarea|select/i.test(target.tagName) || target.isContentEditable;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        store().setPalette(!store().paletteOpen);
      } else if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        store().setDrawer(!store().drawerOpen);
      } else if (mod && e.key.toLowerCase() === 'e' && e.shiftKey) {
        e.preventDefault();
        store().openTool('files');
      } else if (mod && e.key === ',') {
        e.preventDefault();
        window.location.hash = '';
        window.history.pushState({}, '', `${BASE}/settings/general`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else if (mod && e.key === '`') {
        e.preventDefault();
        store().setDockOpen(!store().dockOpen);
      } else if (mod && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        store().closeSession(store().activeSessionId);
      } else if (mod && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        (document.querySelector('textarea[aria-label]') as HTMLTextAreaElement | null)?.focus();
      } else if (e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const modes = ['build', 'plan', 'mission', 'skills'] as const;
        store().setSessionMode(modes[Number(e.key) - 1]);
      } else if (e.key === '?' && !typing) {
        window.location.assign(`${BASE}/settings/keyboard`);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [store]);
}

function Chrome({ children }: { children: React.ReactNode }) {
  const isGlass = useStore((s) => {
    const id = s.themeId;
    return ['alpine', 'dune', 'tide', 'blossom', 'ember'].includes(id);
  });
  const isWide = useMedia('(min-width: 1024px)');
  return (
    <div
      className="h-[100dvh] flex flex-col overflow-hidden"
      style={{ background: 'var(--bg)', backgroundImage: 'var(--bg-image)', backgroundAttachment: 'fixed' }}
    >
      <TopBar />
      <div className="flex-1 min-h-0 flex">
        <Rail />
        <main
          className="flex-1 min-w-0 overflow-hidden flex flex-col"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 18,
            marginInlineEnd: isWide ? 8 : 6,
            marginBottom: 8,
            backdropFilter: isGlass ? 'blur(var(--glass-blur))' : undefined,
            WebkitBackdropFilter: isGlass ? 'blur(var(--glass-blur))' : undefined,
          }}
        >
          {children}
        </main>
      </div>
      <Drawer />
      <CommandPalette />
      <ToastHost />
    </div>
  );
}

function SettingsRoute() {
  const location = useLocation();
  const tab = location.pathname.replace('/settings/', '') || 'general';
  return <Settings tab={tab} />;
}

function Inner() {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = 'Freecode';
  }, []);
  return (
    <Routes>
      <Route path="/" element={<Workspace />} />
      <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
      <Route path="/settings/*" element={<SettingsRoute />} />
      <Route path="/integrations" element={<Integrations />} />
      <Route path="/sites" element={<Sites />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route
        path="/connect/:service"
        element={
          <Connect
            onDone={(id) => {
              navigate('/integrations');
              void id;
            }}
          />
        }
      />
    </Routes>
  );
}

export default function App() {
  useApplyTheme();
  useLanguage();
  useShortcuts();
  const lang = useI18n().lang;
  return (
    <BrowserRouter basename={BASE || '/'}>
      <Routes>
        <Route
          path="/connect/:service"
          element={
            <Connect
              onDone={() => {
                window.location.assign(`${BASE}/integrations`);
              }}
            />
          }
        />
        <Route
          path="*"
          element={
            <Chrome>
              <Inner />
            </Chrome>
          }
        />
      </Routes>
      <span className="hidden" lang={lang} />
    </BrowserRouter>
  );
}
