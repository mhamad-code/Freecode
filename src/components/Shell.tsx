import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  ChevronDown,
  Copy,
  CircleHelp,
  Command as CommandIcon,
  Folder,
  FolderPlus,
  Gift,
  Grid2x2,
  Home,
  Hourglass,
  LayoutPanelLeft,
  LayoutPanelTop,
  PanelLeftClose,
  PanelRightOpen,
  Plus,
  Rocket,
  Search,
  Settings,
  Settings2,
  Sparkles,
  SquarePen,
  SquareTerminal,
  FolderOpen,
  Flame,
  X,
  BookOpen,
  Keyboard,
  Bug,
  MessageCircle,
  LogOut,
  Palette,
  Languages,
  UserCircle,
  Files,
  ListTree,
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store';
import { useI18n } from '../lib/i18n';
import { THEMES } from '../themes/registry';
import { Btn, IBtn, Kbd, Logo, Menu, MenuItem, Segmented, Tip } from './ui';

/* ------------------------------- top bar ------------------------------- */
export function TopBar() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const sessions = useStore((s) => s.sessions);
  const activeId = useStore((s) => s.activeSessionId);
  const setActive = useStore((s) => s.setActiveSession);
  const close = useStore((s) => s.closeSession);
  const newSession = useStore((s) => s.newSession);
  const rename = useStore((s) => s.renameSession);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const navigateHome = () => navigate('/');

  return (
    <div className="flex items-stretch gap-1.5 ps-2 pe-2 shrink-0" style={{ height: 56, paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center">
        <Segmented
          ariaLabel="Mode"
          value={mode}
          onChange={(v) => {
            setMode(v);
            navigate('/');
          }}
          options={[
            { value: 'code', label: t('mode.code') },
            { value: 'chat', label: t('mode.chat') },
          ]}
        />
      </div>
      <div className="ftabs">
        {sessions.map((s) => {
          const active = s.id === activeId;
          return (
            <div
              key={s.id}
              role="tab"
              aria-selected={active}
              data-active={active}
              className="ftab group"
              onClick={() => {
                setActive(s.id);
                navigateHome();
              }}
              onDoubleClick={() => {
                setRenaming(s.id);
                setDraft(s.title);
              }}
              onAuxClick={(e) => e.button === 1 && close(s.id)}
            >
              {renaming === s.id ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => {
                    rename(s.id, draft);
                    setRenaming(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      rename(s.id, draft);
                      setRenaming(null);
                    }
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  className="flex-1 min-w-0 bg-transparent outline-none text-[14px]"
                  dir="auto"
                />
              ) : (
                <span className="flex-1 truncate" dir="auto">
                  {s.title}
                </span>
              )}
              <span
                className={clsx('w-2 h-2 rounded-full flex-none', s.status === 'running' && 'animate-pulseDot')}
                style={{
                  background:
                    s.status === 'running'
                      ? 'var(--accent)'
                      : s.status === 'waiting'
                        ? 'var(--warning)'
                        : s.status === 'error'
                          ? 'var(--danger)'
                          : 'color-mix(in srgb, var(--accent) 65%, transparent)',
                }}
                aria-label={s.status}
              />
              <button
                type="button"
                aria-label={t('tab.close')}
                className="close"
                onClick={(e) => {
                  e.stopPropagation();
                  close(s.id);
                }}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          aria-label={t('tab.newChat')}
          onClick={() => {
            newSession();
            navigateHome();
          }}
          className="mb-1 ms-1 grid place-items-center w-8 h-8 rounded-[9px] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] flex-none"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------- rail ------------------------------- */
export function Rail() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const setDrawer = useStore((s) => s.setDrawer);
  const setTheme = useStore((s) => s.setTheme);
  const themeId = useStore((s) => s.themeId);
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const path = location.pathname;
  const active = (p: string) => path === p || (p !== '/' && path.startsWith(p));

  return (
    <nav className="w-[52px] shrink-0 flex flex-col items-center justify-between py-2" aria-label="Main">
      <div className="flex flex-col items-center gap-1.5">
        <Tip label={t('nav.home')}>
          <IBtn label={t('nav.home')} active={path === '/'} onClick={() => navigate('/')}>
            <Home size={22} strokeWidth={path === '/' ? 2.2 : 1.7} />
          </IBtn>
        </Tip>
        <Tip label={t('nav.sites')}>
          <IBtn label={t('nav.sites')} active={active('/sites')} onClick={() => navigate('/sites')}>
            <LayoutPanelTop size={22} strokeWidth={active('/sites') ? 2.2 : 1.7} />
          </IBtn>
        </Tip>
        <Tip label={t('nav.integrations')}>
          <span className="relative">
            <IBtn label={t('nav.integrations')} active={active('/integrations')} onClick={() => navigate('/integrations')}>
              <Grid2x2 size={22} strokeWidth={active('/integrations') ? 2.2 : 1.7} />
            </IBtn>
            <span className="absolute -top-0.5 -end-0.5 w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
          </span>
        </Tip>
        <Tip label={t('nav.settings')}>
          <IBtn label={t('nav.settings')} active={active('/settings')} onClick={() => navigate('/settings/general')}>
            <Settings size={22} strokeWidth={active('/settings') ? 2.4 : 1.7} />
          </IBtn>
        </Tip>
        <Menu
          width={250}
          align="start"
          trigger={
            <Tip label={t('nav.rewards')}>
              <IBtn label={t('nav.rewards')} onClick={() => setDrawer(true)}>
                <Gift size={22} />
              </IBtn>
            </Tip>
          }
        >
          <div className="px-2 py-1">
            <div className="text-[15px] font-semibold px-1 py-1">{t('share.title')}</div>
            <MenuItem icon={<Copy size={16} />} onClick={() => { void navigator.clipboard?.writeText(window.location.origin); useStore.getState().toast('Link copied'); }}>
              {t('share.copyLink')}
            </MenuItem>
            <MenuItem icon={<Bug size={16} />} onClick={() => useStore.getState().toast('Report issue')}>
              {t('share.report')}
            </MenuItem>
            <MenuItem icon={<Sparkles size={16} />} onClick={() => useStore.getState().toast('What is new')}>
              {t('share.whatsNew')}
            </MenuItem>
            <div className="flex items-center gap-2 mt-2 px-1 text-[13.5px] text-[var(--muted)]">
              <Flame size={15} /> <span>{t('drawer.streak', { n: 7 })}</span>
            </div>
          </div>
        </Menu>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <Menu
          width={240}
          align="start"
          trigger={
            <IBtn label={t('nav.help')} className="w-9 h-9 text-[var(--faint)]">
              <CircleHelp size={20} />
            </IBtn>
          }
        >
          <MenuItem icon={<BookOpen size={16} />}>Docs</MenuItem>
          <MenuItem icon={<Keyboard size={16} />} shortcut="?">
            Shortcuts
          </MenuItem>
          <MenuItem icon={<Bug size={16} />}>Report issue</MenuItem>
          <MenuItem icon={<Sparkles size={16} />}>What&apos;s new</MenuItem>
          <MenuItem icon={<MessageCircle size={16} />}>Discord</MenuItem>
        </Menu>
        <Menu
          width={250}
          align="start"
          trigger={
            <button
              type="button"
              aria-label="Account"
              className="w-9 h-9 rounded-[10px] grid place-items-center text-[15px] font-semibold"
              style={{
                background: 'var(--elevated)',
                border: '1.5px solid var(--line-strong)',
                boxShadow: '0 2px 0 var(--edge)',
              }}
            >
              M
            </button>
          }
        >
          <MenuItem icon={<UserCircle size={16} />} onClick={() => navigate('/settings/account')}>
            Account
          </MenuItem>
          <MenuItem icon={<Hourglass size={16} />} onClick={() => navigate('/settings/usage')}>
            Usage
          </MenuItem>
          <MenuItem icon={<Palette size={16} />} onClick={() => navigate('/settings/appearance')}>
            Theme
          </MenuItem>
          <div className="px-2 py-1.5 flex items-center justify-between text-[13.5px] text-[var(--muted)]">
            <span className="flex items-center gap-2">
              <Languages size={15} /> Language
            </span>
            <Segmented
              value={lang}
              onChange={(v) => setLang(v)}
              options={[
                { value: 'en', label: 'EN' },
                { value: 'ar', label: 'ع' },
              ]}
            />
          </div>
          <div className="px-2 pt-1 pb-2">
            <div className="text-[12.5px] text-[var(--muted)] mb-1.5">Theme</div>
            <div className="grid grid-cols-6 gap-1.5">
              {THEMES.filter((x) => ['dark', 'light', 'ember', 'violet', 'lagoon', 'graphite'].includes(x.id)).map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setTheme(th.id)}
                  aria-label={th.label}
                  className="w-6 h-6 rounded-md"
                  style={{
                    background: th.tokens.bg,
                    border: `1.5px solid ${themeId === th.id ? 'var(--accent)' : 'var(--line-strong)'}`,
                  }}
                />
              ))}
            </div>
          </div>
          <MenuItem icon={<LogOut size={16} />} danger>
            Sign out
          </MenuItem>
        </Menu>
      </div>
    </nav>
  );
}

/* ------------------------------- drawer ------------------------------- */
export function Drawer() {
  const { t } = useI18n();
  const drawerOpen = useStore((s) => s.drawerOpen);
  const setDrawer = useStore((s) => s.setDrawer);
  const sessions = useStore((s) => s.sessions);
  const activeId = useStore((s) => s.activeSessionId);
  const setActive = useStore((s) => s.setActiveSession);
  const newSession = useStore((s) => s.newSession);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, setDrawer]);

  if (!drawerOpen) return null;
  const shown = sessions;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 animate-[fadeUp_.18s_ease]" style={{ background: 'var(--scrim)' }} onClick={() => setDrawer(false)} aria-hidden />
      <aside
        aria-label="Sidebar"
        className="absolute inset-y-0 left-0 w-[min(86vw,340px)] flex flex-col animate-[drawerIn_.26s_cubic-bezier(.2,.8,.2,1)]"
        style={{ background: 'var(--panel-2)', borderRight: '1px solid var(--line)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <style>{`@keyframes drawerIn{from{transform:translateX(-100%)}to{transform:none}}`}</style>
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <Logo size={28} />
          <span className="text-[21px] font-bold tracking-[-0.01em]">Freecode</span>
          <div className="ms-auto flex items-center gap-1">
            <IBtn label={t('drawer.search')} className="w-8 h-8" onClick={() => useStore.getState().setPalette(true)}>
              <Search size={19} />
            </IBtn>
            <IBtn label={t('drawer.collapse')} className="w-8 h-8" onClick={() => setDrawer(false)}>
              <PanelLeftClose size={19} />
            </IBtn>
          </div>
        </div>

        <div className="flex flex-col px-2">
          <DrawerRow icon={<SquarePen size={20} />} label={t('drawer.newChat')} onClick={() => { newSession(); navigate('/'); }} />
          <DrawerRow icon={<FolderPlus size={20} />} label={t('drawer.newProject')} onClick={() => useStore.getState().toast('New project')} />
        </div>

        <div className="px-3 pt-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex items-center gap-1.5 text-[16px] text-[var(--muted)]"
              onClick={() => setProjectsOpen((v) => !v)}
              aria-expanded={projectsOpen}
            >
              {t('drawer.projects')}
              <ChevronDown size={15} style={{ transform: projectsOpen ? undefined : 'rotate(-90deg)', transition: 'transform .18s' }} />
            </button>
            <div className="ms-auto flex items-center gap-1">
              <IBtn label={t('drawer.newProject')} className="w-7 h-7" onClick={() => useStore.getState().toast('New project')}>
                <FolderPlus size={16} />
              </IBtn>
            </div>
          </div>
          {projectsOpen ? (
            <div className="mt-1.5">
              <div className="group flex items-center gap-2 h-10 px-2 rounded-[9px] hover:bg-[var(--hover)]">
                <Folder size={19} className="text-[var(--muted)]" />
                <span className="text-[15.5px] flex-1 truncate" dir="auto">VEXORA Complete</span>
                <button type="button" aria-label="Project menu" className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-[var(--muted)]">
                  <span className="text-[16px] leading-none">…</span>
                </button>
                <button type="button" aria-label="Rename project" className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-[var(--muted)]">
                  <SquarePen size={15} />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-4">
          <div className="text-[16px] text-[var(--muted)] mb-1.5">{t('drawer.recent')}</div>
          <div className="text-[11.5px] uppercase tracking-wide text-[var(--faint)] mt-2 mb-1">{t('drawer.today')}</div>
          <div className="flex flex-col">
            {shown.map((s) => (
              <button
                key={s.id}
                type="button"
                dir="auto"
                onClick={() => { setActive(s.id); navigate('/'); }}
                className="text-start flex items-center gap-2 h-9 px-2 rounded-[9px] text-[14.5px] truncate"
                style={{ background: s.id === activeId ? 'var(--elevated)' : undefined }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: s.status === 'running' ? 'var(--accent)' : 'transparent' }} />
                <span className="truncate flex-1">{s.title}</span>
                <span className="text-[12px] text-[var(--faint)] flex-none">2m</span>
              </button>
            ))}
          </div>
          <div className="text-[11.5px] uppercase tracking-wide text-[var(--faint)] mt-3 mb-1">{t('drawer.yesterday')}</div>
          <div className="text-[14.5px] text-[var(--muted)] px-2 py-1.5" dir="auto">Design System Extractor</div>
        </div>

        <div className="border-t border-[var(--line)] px-4 py-3 flex flex-col gap-2.5">
          <button
            type="button"
            className="flex items-center gap-2 text-[15px]"
            onClick={() => { void navigator.clipboard?.writeText(window.location.origin); useStore.getState().toast('Link copied'); }}
          >
            <Gift size={18} />
            <span>{t('drawer.share')}</span>
          </button>
          <div className="flex items-center gap-2 text-[15px]">
            <Flame size={18} style={{ color: 'var(--cmd)' }} />
            <span>{t('drawer.streak', { n: 7 })}</span>
            <span className="ms-auto flex gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <span
                  key={i}
                  className="w-[14px] h-[14px] rounded-[3px]"
                  style={{ background: i < 6 ? 'var(--accent)' : 'color-mix(in srgb, var(--elevated) 80%, transparent)' }}
                />
              ))}
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function DrawerRow({ icon, label, trailing, onClick }: { icon: ReactNode; label: string; trailing?: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 h-11 px-2 rounded-[10px] text-[16px] text-start hover:bg-[var(--hover)]"
    >
      <span className="text-[var(--muted)] flex none">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}

/* ------------------------------- panel toolbar ------------------------------- */
export function PanelToolbar({ showPublish = true }: { showPublish?: boolean }) {
  const { t } = useI18n();
  const setDrawer = useStore((s) => s.setDrawer);
  const openTool = useStore((s) => s.openTool);
  const toolOpen = useStore((s) => s.toolOpen);
  const setToolOpen = useStore((s) => s.setToolOpen);
  const dockOpen = useStore((s) => s.dockOpen);
  const setDockOpen = useStore((s) => s.setDockOpen);
  const activeTool = useStore((s) => s.toolTabs.find((x) => x.id === s.activeToolId));
  const session = useStore((s) => s.sessions.find((x) => x.id === s.activeSessionId));
  const running = session?.status === 'running';
  const toast = useStore((s) => s.toast);

  return (
    <div
      className="flex items-center gap-1 px-3 h-11 shrink-0"
      style={{ background: 'color-mix(in srgb, var(--panel) 82%, transparent)', backdropFilter: 'blur(10px)' }}
    >
      <IBtn label={t('toolbar.drawer')} onClick={() => setDrawer(true)}>
        <PanelRightOpen size={19} className="flip" />
      </IBtn>
      <div className="ms-auto flex items-center gap-0.5">
        <IBtn label={t('toolbar.activity')} active={toolOpen && activeTool?.kind === 'overview'} onClick={() => openTool('overview')}>
          <ListTree size={19} />
        </IBtn>
        <IBtn label={t('toolbar.terminal')} active={dockOpen} onClick={() => setDockOpen(!dockOpen)}>
          <SquareTerminal size={19} />
        </IBtn>
        <IBtn label={t('toolbar.files')} active={toolOpen && activeTool?.kind === 'files'} onClick={() => openTool('files')}>
          <FolderOpen size={19} />
        </IBtn>
        <IBtn label={t('toolbar.layout')} active={toolOpen} onClick={() => setToolOpen(!toolOpen)}>
          <LayoutPanelLeft size={19} />
        </IBtn>
        {showPublish ? (
          <Menu
            width={250}
            trigger={
              <Btn
                variant="primary"
                size="sm"
                disabled={running}
                title={running ? t('toolbar.wait') : undefined}
                className="ms-1.5 h-8 px-2.5 gap-1.5 text-[14.5px]"
              >
                <Rocket size={16} />
                <span>{t('toolbar.publish')}</span>
                <ChevronDown size={14} />
              </Btn>
            }
          >
            <MenuItem icon={<Files size={16} />} onClick={() => toast('Downloading project…')}>
              {t('toolbar.downloadProject')}
            </MenuItem>
            <MenuItem icon={<Files size={16} />} onClick={() => toast('Building…')}>
              {t('toolbar.downloadBuild')}
            </MenuItem>
            <MenuItem icon={<ArrowUpRight size={16} />} onClick={() => toast('Push to GitHub needs a connection')}>
              {t('toolbar.push')}
            </MenuItem>
            <MenuItem icon={<Settings2 size={16} />} onClick={() => toast('Deploy is coming soon')}>
              {t('toolbar.deploySoon')}
            </MenuItem>
          </Menu>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------- command palette ------------------------------- */
type PaletteItem = { id: string; group: string; label: string; icon: ReactNode; shortcut?: string; run: () => void };

export function CommandPalette() {
  const { t } = useI18n();
  const open = useStore((s) => s.paletteOpen);
  const setPalette = useStore((s) => s.setPalette);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();
  const openTool = useStore((s) => s.openTool);
  const setDockOpen = useStore((s) => s.setDockOpen);
  const dockOpen = useStore((s) => s.dockOpen);
  const sessions = useStore((s) => s.sessions);
  const setActive = useStore((s) => s.setActiveSession);
  const newSession = useStore((s) => s.newSession);
  const setTheme = useStore((s) => s.setTheme);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setIdx(0);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const items: PaletteItem[] = useMemo(() => {
    const actions: PaletteItem[] = [
      { id: 'a1', group: t('palette.actions'), label: t('drawer.newChat'), icon: <SquarePen size={17} />, shortcut: '⌘⇧O', run: () => newSession() },
      { id: 'a2', group: t('palette.actions'), label: t('toolbar.terminal'), icon: <SquareTerminal size={17} />, shortcut: '⌃`', run: () => setDockOpen(!dockOpen) },
      { id: 'a3', group: t('palette.actions'), label: t('toolbar.files'), icon: <Folder size={17} />, shortcut: '⌘⇧E', run: () => openTool('files') },
      { id: 'a4', group: t('palette.actions'), label: t('toolbar.activity'), icon: <ListTree size={17} />, run: () => openTool('overview') },
      { id: 'a5', group: t('palette.actions'), label: t('nav.settings'), icon: <Settings size={17} />, shortcut: '⌘,', run: () => navigate('/settings/general') },
      { id: 'a6', group: t('palette.actions'), label: 'Ember theme', icon: <Palette size={17} />, run: () => setTheme('ember') },
    ];
    const sess: PaletteItem[] = sessions.map((s) => ({
      id: `s-${s.id}`,
      group: t('palette.sessions'),
      label: s.title,
      icon: <MessageCircle size={17} />,
      run: () => { setActive(s.id); navigate('/'); },
    }));
    const files: PaletteItem[] = ['src/routes/chat.tsx', 'src/routes/cli.tsx', 'vite.config.ts', 'src/styles.css', 'package.json'].map((f) => ({
      id: `f-${f}`,
      group: t('palette.files'),
      label: f,
      icon: <Files size={17} />,
      run: () => { openTool('editor', f); navigate('/'); },
    }));
    const settings: PaletteItem[] = ['general', 'appearance', 'usage', 'skills', 'project', 'keyboard'].map((s) => ({
      id: `st-${s}`,
      group: t('palette.settings'),
      label: t(`settings.${s}`),
      icon: <Settings size={17} />,
      run: () => navigate(`/settings/${s}`),
    }));
    return [...actions, ...sess, ...files, ...settings];
  }, [dockOpen, navigate, newSession, openTool, sessions, setActive, setDockOpen, setTheme, t]);

  const filtered = items.filter((i) => i.label.toLowerCase().includes(q.replace(/^[>@#/]/, '').toLowerCase()));
  useEffect(() => setIdx(0), [q]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0" style={{ background: 'var(--scrim)', backdropFilter: 'blur(2px)' }} onClick={() => setPalette(false)} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('palette.placeholder')}
        className="relative w-full animate-popIn overflow-hidden"
        style={{ maxWidth: 560, background: 'var(--panel)', border: '1px solid var(--line-strong)', borderRadius: 18, boxShadow: '0 24px 70px rgba(0,0,0,.5)' }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--line)]">
          <CommandIcon size={18} className="text-[var(--faint)]" />
          <input
            ref={inputRef}
            value={q}
            placeholder={t('palette.placeholder')}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(filtered.length - 1, i + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              if (e.key === 'Enter') { filtered[idx]?.run(); setPalette(false); }
              if (e.key === 'Escape') setPalette(false);
            }}
            className="flex-1 bg-transparent outline-none text-[16.5px]"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-[15.5px]">{t('palette.noResults', { q })}</div>
              <div className="text-[13.5px] text-[var(--muted)] mt-1">{t('palette.tip')}</div>
            </div>
          ) : (
            filtered.map((item, i) => {
              const showGroup = i === 0 || filtered[i - 1].group !== item.group;
              return (
                <div key={item.id}>
                  {showGroup ? <div className="px-2.5 pt-2 pb-1 text-[11.5px] uppercase tracking-wide text-[var(--faint)]">{item.group}</div> : null}
                  <button
                    type="button"
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => { item.run(); setPalette(false); }}
                    className="w-full flex items-center gap-2.5 h-10 px-2.5 rounded-[9px] text-[15px] text-start"
                    style={{
                      background: i === idx ? 'var(--elevated)' : undefined,
                      borderInlineStart: i === idx ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                  >
                    <span className="text-[var(--muted)] flex none">{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.shortcut ? <Kbd>{item.shortcut}</Kbd> : null}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
