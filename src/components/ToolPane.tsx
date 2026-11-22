import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  History,
  Columns2,
  Copy,
  ExternalLink,
  File as FileIcon,
  FilePlus,
  Folder,
  FolderPlus,
  GitBranch,
  GitCommitHorizontal,
  Globe,
  LayoutList,
  ListTree,
  Loader2,
  Lock,
  MoreHorizontal,
  PanelRightClose,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  SquareTerminal,
  Upload,
  X,
} from 'lucide-react';
import { useStore } from '../store';
import { useI18n } from '../lib/i18n';
import { runtimeSupport, startPreviewWithRuntime, useRuntime } from '../runtime';
import type { ChangedFile, FileNode, ToolTab } from '../lib/types';
import {
  Badge,
  Btn,
  Chip,
  IBtn,
  Input,
  Menu,
  MenuItem,
  SearchInput,
  SectionTitle,
  Segmented,
} from './ui';

/* ================================ shell ================================ */

/** Heavy editor and terminal renderers load on first use, not with the app. */
const CodeEditor = lazy(() => import('./CodeEditor'));
const CompareView = lazy(() => import('./CodeEditor').then((m) => ({ default: m.DiffView })));
const XTerm = lazy(() => import('./XTerm'));
export function ToolPane() {
  const { t } = useI18n();
  const tabs = useStore((s) => s.toolTabs);
  const activeId = useStore((s) => s.activeToolId);
  const setActive = useStore((s) => s.setActiveTool);
  const close = useStore((s) => s.closeTool);
  const openTool = useStore((s) => s.openTool);
  const setOpen = useStore((s) => s.setToolOpen);
  const active = tabs.find((x) => x.id === activeId) ?? tabs[0];

  return (
    <div className="h-full flex flex-col min-h-0" style={{ background: 'var(--panel)' }}>
      <div className="flex items-end border-b border-[var(--line)] pe-1.5">
        <div className="ftabs" style={{ height: 38 }}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              role="tab"
              aria-selected={tab.id === active?.id}
              data-active={tab.id === active?.id}
              className="ftab"
              onClick={() => setActive(tab.id)}
              onAuxClick={(e) => e.button === 1 && close(tab.id)}
            >
              <TabIcon tab={tab} />
              <span className="flex-1 truncate">{tab.title}</span>
              <button
                type="button"
                aria-label={t('tab.close')}
                className="close"
                onClick={(e) => {
                  e.stopPropagation();
                  close(tab.id);
                }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
          <button
            type="button"
            aria-label="New tab"
            onClick={() => openTool('launcher')}
            className="mb-1 ms-1 grid place-items-center w-8 h-8 rounded-[9px] text-[var(--muted)] hover:bg-[var(--hover)] flex-none"
          >
            <Plus size={19} />
          </button>
        </div>
        <IBtn label="Collapse pane" className="mb-0.5" onClick={() => setOpen(false)}>
          <PanelRightClose size={19} />
        </IBtn>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {active ? <TabContent tab={active} /> : <Launcher />}
      </div>
    </div>
  );
}

function TabIcon({ tab }: { tab: ToolTab }) {
  const cls = 'flex-none text-[var(--muted)]';
  if (tab.kind === 'files' || tab.kind === 'editor') return <Folder size={17} className={cls} />;
  if (tab.kind === 'browser' || tab.kind === 'preview') return <Globe size={17} className={cls} />;
  if (tab.kind === 'terminal') return <SquareTerminal size={17} className={cls} />;
  if (tab.kind === 'changes') return <GitBranch size={17} className={cls} />;
  if (tab.kind === 'overview') return <ListTree size={17} className={cls} />;
  if (tab.kind === 'plan') return <LayoutList size={17} className={cls} />;
  return <FileIcon size={17} className={cls} />;
}

function TabContent({ tab }: { tab: ToolTab }) {
  switch (tab.kind) {
    case 'launcher':
      return <Launcher />;
    case 'files':
      return <FilesPanel />;
    case 'editor':
      return <EditorPanel path={tab.path ?? ''} />;
    case 'browser':
      return <BrowserPanel />;
    case 'terminal':
      return <TerminalPanel />;
    case 'overview':
      return <OverviewPanel />;
    case 'changes':
      return <ChangesPanel />;
    case 'plan':
      return <PlanPanel />;
    case 'preview':
      return <PreviewPanel />;
    default:
      return <Launcher />;
  }
}

/* ================================ launcher ================================ */
function Launcher() {
  const { t } = useI18n();
  const openTool = useStore((s) => s.openTool);
  const close = useStore((s) => s.closeTool);
  const activeId = useStore((s) => s.activeToolId);
  const tabs = useStore((s) => s.toolTabs);
  const launcher = tabs.find((x) => x.kind === 'launcher');
  const rows = [
    { kind: 'overview' as const, label: t('launcher.overview'), icon: <ListTree size={20} /> },
    { kind: 'browser' as const, label: t('launcher.browser'), icon: <Globe size={20} /> },
    { kind: 'files' as const, label: t('launcher.files'), icon: <Folder size={20} /> },
    { kind: 'terminal' as const, label: t('launcher.terminal'), icon: <SquareTerminal size={20} /> },
    { kind: 'changes' as const, label: t('launcher.changes'), icon: <GitBranch size={20} /> },
  ];
  const extra = [
    { kind: 'plan' as const, label: t('launcher.plan'), icon: <LayoutList size={20} /> },
    { kind: 'preview' as const, label: t('launcher.preview'), icon: <BarChart3 size={20} /> },
  ];
  return (
    <div className="h-full overflow-y-auto grid place-items-center">
      <div className="w-[min(100%,320px)] py-8">
        {[...rows, ...extra].map((r, i) => (
          <div key={r.kind}>
            {i === rows.length ? <div className="divider my-2" /> : null}
            <button
              type="button"
              onClick={() => {
                if (launcher && launcher.id === activeId) close(launcher.id);
                openTool(r.kind);
                if (launcher) close(launcher.id);
              }}
              className="w-full flex items-center gap-3 h-12 px-3 rounded-xl text-[17px] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] group"
            >
              <span className="transition-transform group-hover:translate-x-0.5">{r.icon}</span>
              {r.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================ files ================================ */
function FilesPanel() {
  const { t } = useI18n();
  const files = useStore((s) => s.files);
  const openFile = useStore((s) => s.openFile);
  const [query, setQuery] = useState('');

  /** One honest empty file, so the editor has something to open. */
  const newFile = () => {
    const contents = useStore.getState().fileContents;
    let i = 1;
    let path = 'notes.md';
    while (contents[path] !== undefined) path = `notes-${++i}.md`;
    useStore.getState().createFile(path);
    openFile(path);
  };
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ src: true, 'src/routes': true });
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return files;
    const q = query.toLowerCase();
    const walk = (nodes: FileNode[]): FileNode[] =>
      nodes
        .map((n) => {
          if (n.type === 'file') return n.name.toLowerCase().includes(q) ? n : null;
          const kids = walk(n.children ?? []);
          return kids.length ? { ...n, children: kids } : null;
        })
        .filter(Boolean) as FileNode[];
    return walk(files);
  }, [files, query]);

  useEffect(() => {
    if (!query) return;
    const all: Record<string, boolean> = {};
    const walk = (nodes: FileNode[]) => {
      nodes.forEach((n) => {
        if (n.type === 'dir') {
          all[n.path] = true;
          walk(n.children ?? []);
        }
      });
    };
    walk(filtered);
    setExpanded(all);
  }, [query, filtered]);

  const renderNode = (node: FileNode, depth: number) => {
    const isOpen = expanded[node.path];
    return (
      <div key={node.path}>
        <button
          type="button"
          onClick={() => {
            if (node.type === 'dir') setExpanded((e) => ({ ...e, [node.path]: !e[node.path] }));
            else {
              setSelected(node.path);
              openFile(node.path);
            }
          }}
          className={clsx('w-full flex items-center gap-1.5 h-9 pe-2 rounded-md text-[15px] text-start hover:bg-[var(--hover)]')}
          style={{ paddingInlineStart: 8 + depth * 16, background: selected === node.path ? 'var(--elevated)' : undefined }}
          title={node.path}
        >
          {node.type === 'dir' ? (
            <>
              <ChevronRight size={14} className="text-[var(--faint)] flex-none" style={{ transform: isOpen ? 'rotate(90deg)' : undefined, transition: 'transform .14s' }} />
              <Folder size={17} className="text-[var(--muted)] flex-none" />
            </>
          ) : (
            <>
              <span className="w-[14px] flex-none" />
              <FileIcon size={17} className="text-[var(--muted)] flex-none" />
            </>
          )}
          <span className={clsx('truncate flex-1', node.status === 'U' && 'text-[var(--faint)]')}>{node.name}</span>
          {node.active ? <span className="w-1.5 h-1.5 rounded-full animate-pulseDot" style={{ background: 'var(--accent)' }} /> : null}
          {node.status ? (
            <span
              className="text-[11.5px] font-semibold w-3 text-center flex-none"
              style={{ color: node.status === 'M' ? 'var(--warning)' : node.status === 'A' ? 'var(--success)' : node.status === 'D' ? 'var(--danger)' : 'var(--faint)' }}
            >
              {node.status}
            </span>
          ) : null}
        </button>
        {node.type === 'dir' && isOpen ? <div>{node.children?.map((c) => renderNode(c, depth + 1))}</div> : null}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-3">
        <SearchInput value={query} onValueChange={setQuery} placeholder={t('file.filter')} className="flex-1" />
        <IBtn label={t('file.newFile')} className="w-10 h-10 rounded-[10px]" onClick={() => newFile()}>
          <FilePlus size={19} />
        </IBtn>
        <IBtn label={t('file.newFolder')} className="w-10 h-10 rounded-[10px]" onClick={() => useStore.getState().toast('New folder')}>
          <FolderPlus size={19} />
        </IBtn>
        <IBtn label={t('file.upload')} className="w-10 h-10 rounded-[10px]" onClick={() => useStore.getState().toast('Upload')}>
          <Upload size={19} />
        </IBtn>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {!files.length ? (
          <div className="text-center px-4 py-10">
            <Folder size={22} className="mx-auto text-[var(--faint)]" />
            <div className="text-[14.5px] font-semibold mt-2">{t('file.empty')}</div>
            <p className="text-[13px] text-[var(--muted)] mt-1">{t('file.emptyBody')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-[14.5px] text-[var(--muted)] py-8">{t('file.noMatch')}</div>
        ) : (
          filtered.map((n) => renderNode(n, 0))
        )}
      </div>
    </div>
  );
}

function EditorPanel({ path }: { path: string }) {
  const { t } = useI18n();
  const contents = useStore((s) => s.fileContents);
  const save = useStore((s) => s.saveFile);
  const saved = contents[path] ?? '';
  const [value, setValue] = useState(saved);
  const [diff, setDiff] = useState(false);
  useEffect(() => {
    setValue(contents[path] ?? '');
    setDiff(false);
  }, [path, contents]);
  const dirty = value !== saved;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 h-10 text-[13px] text-[var(--muted)] border-b border-[var(--line)]">
        <span dir="ltr" className="truncate">{path || 'untitled'}</span>
        {dirty ? <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--warning)' }} /> : null}
        <div className="ms-auto flex items-center gap-1.5">
          <Badge tone="info">{t('editor.agentEdited')}</Badge>
          <Btn size="sm" variant={diff ? 'primary' : 'outline'} onClick={() => setDiff((v) => !v)}>
            {t('editor.compare')}
          </Btn>
          <Btn size="sm" variant="outline" onClick={() => save(path, value)}>{t('common.save')}</Btn>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <Suspense fallback={<div className="p-4 text-[13.5px] text-[var(--muted)]">{t('editor.loading')}</div>}>
          {diff ? (
            <CompareView original={saved} current={value} />
          ) : (
            <CodeEditor path={path} value={value} onChange={setValue} />
          )}
        </Suspense>
      </div>
    </div>
  );
}

/* ================================ browser ================================ */
function BrowserPanel() {
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [loaded, setLoaded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [idx, setIdx] = useState(-1);

  const go = (u: string) => {
    if (!u.trim()) return;
    const full = /^https?:|^localhost/.test(u) ? u : `https://${u}`;
    setLoading(true);
    window.setTimeout(() => {
      const next = [...history.slice(0, idx + 1), full];
      setHistory(next);
      setIdx(next.length - 1);
      setLoaded(full);
      setLoading(false);
    }, 700);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1 px-2 h-12 border-b border-[var(--line)] shrink-0">
        <IBtn label="Back" disabled={idx <= 0} onClick={() => { setIdx(idx - 1); setLoaded(history[idx - 1]); }}>
          <ArrowLeft size={18} />
        </IBtn>
        <IBtn label="Forward" disabled={idx >= history.length - 1} onClick={() => { setIdx(idx + 1); setLoaded(history[idx + 1]); }}>
          <ArrowRight size={18} />
        </IBtn>
        <IBtn label="Reload" onClick={() => loaded && go(loaded)}>
          {loading ? <X size={17} /> : <RotateCw size={17} />}
        </IBtn>
        <div className="flex-1 min-w-0 relative">
          <Input
            value={url}
            onValueChange={setUrl}
            placeholder={t('browser.search')}
            aria-label={t('browser.search')}
            onKeyDown={(e) => e.key === 'Enter' && go(url)}
            icon={loaded ? <Lock size={14} /> : <Search size={15} />}
          />
          {loading ? <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden"><div className="h-full w-1/2 animate-[slide_1s_linear_infinite]" style={{ background: 'var(--accent)' }} /></div> : null}
        </div>
        <IBtn label="New browser tab" onClick={() => { setLoaded(null); setUrl(''); }}>
          <Plus size={18} />
        </IBtn>
        <IBtn label="Open externally">
          <ExternalLink size={17} />
        </IBtn>
        <Menu
          trigger={<IBtn label="More"><MoreHorizontal size={18} /></IBtn>}
          width={220}
        >
          <MenuItem>Zoom 100%</MenuItem>
          <MenuItem>Desktop site</MenuItem>
          <MenuItem>Device frame</MenuItem>
          <MenuItem onClick={() => useStore.getState().toast('Screenshot sent to agent')}>Send screenshot to agent</MenuItem>
          <MenuItem>DevTools console</MenuItem>
          <MenuItem danger>Clear cookies</MenuItem>
        </Menu>
      </div>
      <div className="flex-1 min-h-0 overflow-auto relative">
        <style>{`@keyframes slide{from{transform:translateX(-100%)}to{transform:translateX(200%)}}`}</style>
        {!loaded ? (
          <div className="h-full grid place-items-center px-6">
            <div className="text-center max-w-[300px]">
              <div className="mx-auto mb-4 text-[var(--muted)] w-12 h-12"><Globe size={48} strokeWidth={1.5} /></div>
              <h3 className="text-[22px] font-bold text-[var(--muted)]">{t('browser.start')}</h3>
              <p className="text-[15px] text-[var(--muted)] mt-2">{t('browser.startSub')}</p>
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                {[
                  { label: t('browser.localhost'), url: 'localhost:5173' },
                  { label: t('browser.docs'), url: 'vite.dev' },
                  { label: t('browser.github'), url: 'github.com' },
                  { label: t('browser.preview'), url: 'preview.local' },
                ].map((q) => (
                  <Chip key={q.label} onClick={() => { setUrl(q.url); go(q.url); }}>{q.label}</Chip>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div dir="ltr" className="min-h-full text-[#1d1d1f]" style={{ background: '#f7f7f5' }}>
            <div className="h-9 flex items-center px-4 text-[12px] text-[#6b6b66]" style={{ background: '#ececea', borderBottom: '1px solid #ddd' }}>
              {loaded}
            </div>
            <div className="p-8">
              <div className="max-w-[560px] mx-auto">
                <div className="text-[12px] tracking-[.14em] uppercase text-[#8a8a84]">Freecode cloud browser</div>
                <h1 className="text-[34px] font-bold leading-tight mt-2">A rendered page, right inside your workspace.</h1>
                <p className="mt-3 text-[15px] text-[#55554f] leading-relaxed">
                  The agent can open pages, click, type and screenshot them here. When the agent takes control the viewport gets a thin accent border.
                </p>
                <div className="mt-6 h-40 rounded-xl" style={{ background: 'linear-gradient(135deg,#dbe7d6,#c7d8c0)' }} />
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-lg" style={{ background: '#e9e9e4' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================ preview ================================ */
function PreviewPanel() {
  const { t } = useI18n();
  const runtime = useRuntime();
  const files = useStore((s) => s.fileContents);
  const [device, setDevice] = useState<'phone' | 'tablet' | 'desktop'>('phone');
  const [reloadKey, setReloadKey] = useState(0);
  const supported = runtimeSupport() === 'full';
  const busy = runtime.phase === 'booting' || runtime.previewPhase === 'starting';
  const running = runtime.previewPhase === 'running' && Boolean(runtime.previewUrl);

  const start = () => {
    void startPreviewWithRuntime(files).catch(() => {
      // the runtime state carries the failure message
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 h-11 border-b border-[var(--line)]">
        <Segmented
          value={device}
          onChange={setDevice}
          options={[
            { value: 'phone', label: 'Phone' },
            { value: 'tablet', label: 'Tablet' },
            { value: 'desktop', label: 'Desktop' },
          ]}
        />
        <Badge tone={running ? 'accent' : 'info'} dot={running}>localhost:5173</Badge>
        <div className="ms-auto flex items-center gap-1.5">
          {running ? (
            <IBtn label={t('preview.reload')} onClick={() => setReloadKey((k) => k + 1)}>
              <RotateCw size={16} />
            </IBtn>
          ) : null}
          {supported ? (
            <Btn size="sm" variant="outline" disabled={busy} onClick={start}>
              {busy ? t('runtime.previewStarting') : t('runtime.startPreview')}
            </Btn>
          ) : null}
        </div>
      </div>
      <div className="flex-1 grid place-items-center p-4 overflow-auto" style={{ background: 'var(--bg)' }}>
        {running ? (
          <div
            className="overflow-hidden"
            style={{
              width: device === 'phone' ? 320 : device === 'tablet' ? 520 : '100%',
              maxWidth: '100%',
              height: device === 'phone' ? 620 : 560,
              border: '8px solid var(--line-strong)',
              borderRadius: device === 'phone' ? 28 : 14,
              background: 'var(--panel)',
            }}
          >
            <iframe
              key={reloadKey}
              title={t('launcher.preview')}
              src={runtime.previewUrl ?? 'about:blank'}
              className="w-full h-full"
              style={{ border: 0, background: 'var(--panel)' }}
            />
          </div>
        ) : (
          <div className="text-center max-w-[360px]">
            <Globe size={34} strokeWidth={1.5} className="mx-auto text-[var(--faint)]" />
            <div className="text-[18px] font-semibold mt-3">
              {supported ? t('runtime.previewTitle') : t('runtime.previewUnsupportedTitle')}
            </div>
            <p className="text-[13.5px] text-[var(--muted)] mt-1.5">
              {supported ? t('runtime.previewNothing') : t('runtime.previewUnsupported')}
            </p>
            {runtime.previewError ? (
              <p className="text-[12.5px] mt-2 break-words" style={{ color: 'var(--danger)' }} dir="ltr">
                {runtime.previewError}
              </p>
            ) : null}
            {runtime.phase === 'error' && runtime.error ? (
              <p className="text-[12.5px] mt-2 break-words" style={{ color: 'var(--danger)' }} dir="ltr">
                {runtime.error}
              </p>
            ) : null}
            {supported ? (
              <Btn variant="primary" className="mt-4" disabled={busy} onClick={start}>
                {busy ? t('runtime.previewStarting') : t('runtime.startPreview')}
              </Btn>
            ) : null}
            <p className="text-[12px] text-[var(--faint)] mt-3">{t('runtime.previewNote')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================ terminal ================================ */
export function TerminalPanel({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  const [tabs, setTabs] = useState(['Terminal']);
  const [active, setActive] = useState(0);

  return (
    <div className="h-full flex flex-col min-h-0" style={{ background: 'var(--panel)' }}>
      {!compact ? (
        <div className="flex items-center gap-1 px-2 h-10 border-b border-[var(--line)]">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(i)}
              className="flex items-center gap-2 h-7 px-2.5 rounded-md text-[13.5px]"
              style={{ background: i === active ? 'var(--elevated)' : undefined, color: i === active ? 'var(--text)' : 'var(--muted)' }}
            >
              <SquareTerminal size={15} />
              {tab}
            </button>
          ))}
          <button type="button" onClick={() => { setTabs([...tabs, 'Agent']); setActive(tabs.length); }} aria-label="New terminal" className="ibtn w-7 h-7">
            <Plus size={16} />
          </button>
          <div className="ms-auto flex items-center gap-1">
            <Badge tone="accent">Agent</Badge>
            <IBtn label="Split" className="w-7 h-7"><Columns2 size={16} /></IBtn>
          </div>
        </div>
      ) : null}
      <div className="flex-1 min-h-0">
        <Suspense
          fallback={
            <div className="flex items-center gap-2 px-3 py-3 text-[14px] text-[var(--muted)]">
              <Loader2 size={15} className="animate-spin" />
              {t('terminal.connecting')}
            </div>
          }
        >
          <XTerm
            prompt="~/project $"
            banner={t('terminal.banner')}
            noRuntime={t('terminal.noRuntime')}
            shell={runtimeSupport() === 'full'}
            starting={t('runtime.shellStarting')}
            failed={t('runtime.shellFailed')}
          />
        </Suspense>
      </div>
    </div>
  );
}

/* ================================ overview ================================ */
function OverviewPanel() {
  const { t } = useI18n();
  const session = useStore((s) => s.sessions.find((x) => x.id === s.activeSessionId));
  const git = useStore((s) => s.git);
  const usage = useStore((s) => s.sessionUsage);
  const openTool = useStore((s) => s.openTool);
  const additions = git.files.reduce((a, f) => a + f.additions, 0);
  const deletions = git.files.reduce((a, f) => a + f.deletions, 0);
  const messages = session?.messages ?? [];
  const actions = messages
    .filter((m) => m.kind === 'assistant')
    .flatMap((m) => (m.kind === 'assistant' ? m.turn.blocks : []))
    .flatMap((b) => (b.type === 'group' ? b.group.actions : []));
  const checkpoints = messages
    .filter((m) => m.kind === 'assistant' && m.turn.checkpoint)
    .map((m) => (m.kind === 'assistant' ? m.turn : null))
    .filter((turn): turn is NonNullable<typeof turn> => Boolean(turn));

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-4">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-[20px] font-semibold truncate" dir="auto">{session?.title ?? t('overview.noSession')}</h2>
          <div className="mt-1.5 flex items-center gap-2">
            {session?.status === 'running' ? (
              <Badge tone="accent" dot>{t('overview.running')}</Badge>
            ) : session?.status === 'waiting' ? (
              <Badge tone="warning" dot>{t('overview.waiting')}</Badge>
            ) : session?.status === 'error' ? (
              <Badge tone="danger" dot>{t('overview.error')}</Badge>
            ) : (
              <Badge tone="accent"><Check size={12} /> {t('overview.idle')}</Badge>
            )}
            {session?.project ? <span className="text-[12.5px] text-[var(--faint)]" dir="auto">{session.project}</span> : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        {[
          { label: t('overview.filesChanged'), value: `${git.files.length}`, sub: `+${additions} −${deletions}`, onClick: () => openTool('changes') },
          { label: t('overview.commandsRun'), value: `${actions.filter((a) => a.kind === 'cmd').length}`, sub: t('overview.fromThisChat'), onClick: () => openTool('terminal') },
          { label: t('overview.context'), value: `${usage.context}%`, sub: t('overview.tokens', { n: String(usage.tokens) }), onClick: () => {} },
          { label: t('overview.cost'), value: `$${usage.cost.toFixed(2)}`, sub: t('overview.thisSession'), onClick: () => {} },
        ].map((c) => (
          <button key={c.label} type="button" onClick={c.onClick} className="card p-3 text-start">
            <div className="text-[13px] text-[var(--muted)]">{c.label}</div>
            <div className="text-[24px] font-bold mt-1">{c.value}</div>
            <div className="text-[12px] text-[var(--faint)]">{c.sub}</div>
          </button>
        ))}
      </div>

      {!messages.length ? (
        <div className="card mt-4 p-5 text-center">
          <ListTree size={22} className="mx-auto text-[var(--faint)]" />
          <div className="text-[15.5px] font-semibold mt-2">{t('overview.emptyTitle')}</div>
          <p className="text-[13.5px] text-[var(--muted)] mt-1">{t('overview.emptyBody')}</p>
        </div>
      ) : (
        <div className="mt-5">
          <SectionTitle icon={<History size={18} />} title={t('overview.activityLog')} />
          <div className="card mt-2 divide-y divide-[var(--line)]">
            {actions.length ? (
              actions.map((a) => (
                <div key={a.id} className="flex items-center gap-2.5 px-3 py-2.5 text-[13.5px]">
                  <SquareTerminal size={15} style={{ color: 'var(--cmd)' }} />
                  <span className="text-[var(--muted)]">{a.label}</span>
                  <span className="flex-1 truncate font-mono text-[12px]" dir="ltr">{a.value}</span>
                  <span className="text-[11px] text-[var(--faint)]">{a.status}</span>
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-[13.5px] text-[var(--muted)]">{t('overview.noActivity')}</div>
            )}
          </div>
        </div>
      )}

      <div className="mt-5">
        <SectionTitle icon={<History size={18} />} title={t('overview.checkpoints')} />
        {checkpoints.length ? (
          <div className="mt-3 relative ps-4">
            <div className="absolute start-[5px] top-2 bottom-2 w-px" style={{ background: 'var(--line-strong)' }} />
            {checkpoints.map((c) => (
              <div key={c.id} className="relative pb-4">
                <span
                  className="absolute -start-4 top-1 w-[11px] h-[11px] rounded-full"
                  style={{ background: 'var(--accent)', border: '2px solid var(--accent)' }}
                />
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[var(--faint)]">{new Date(c.startedAt).toLocaleTimeString()}</span>
                  <span className="text-[14px] flex-1 truncate" dir="auto">{c.checkpoint?.label}</span>
                  <span className="text-[12px] font-mono text-[var(--muted)]">{c.checkpoint?.files} files</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card mt-2 px-3 py-4 text-[13.5px] text-[var(--muted)]">{t('overview.noCheckpoints')}</div>
        )}
      </div>
    </div>
  );
}

/* ================================ changes ================================ */
function DiffView({ file, onClose }: { file: ChangedFile; onClose: () => void }) {
  const { t } = useI18n();
  const resolve = useStore((s) => s.resolveHunk);
  const openFile = useStore((s) => s.openFile);
  const [mode, setMode] = useState<'unified' | 'split'>('unified');
  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-3 h-11 border-b border-[var(--line)]">
        <IBtn label="Back" onClick={onClose}><ArrowLeft size={18} /></IBtn>
        <span className="font-mono text-[13px] truncate" dir="ltr">{file.path}</span>
        <span className="text-[12px] font-mono" style={{ color: 'var(--success)' }}>+{file.additions}</span>
        <span className="text-[12px] font-mono" style={{ color: 'var(--danger)' }}>−{file.deletions}</span>
        <div className="ms-auto hidden sm:block">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'unified', label: t('changes.unified') },
              { value: 'split', label: t('changes.split') },
            ]}
          />
        </div>
        <IBtn label={t('changes.openFile')} onClick={() => openFile(file.path)}><ExternalLink size={16} /></IBtn>
        <IBtn label={t('common.copy')} onClick={() => void navigator.clipboard?.writeText(file.path)}><Copy size={16} /></IBtn>
      </div>
      <div className="flex-1 min-h-0 overflow-auto font-mono text-[12.5px] leading-[1.55]" dir="ltr">
        {file.hunks.map((h, hi) => (
          <div key={h.id} className="relative group/hunk" style={{ opacity: h.state === 'rejected' ? 0.35 : 1, transition: 'opacity .16s' }}>
            <div className="flex items-center justify-between px-3 py-1.5 sticky top-0 z-10" style={{ background: 'var(--panel-2)', borderBottom: '1px solid var(--line)' }}>
              <span className="text-[var(--muted)]">{h.header}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover/hunk:opacity-100 focus-within:opacity-100">
                {h.state === 'accepted' ? <Badge tone="accent"><Check size={11} /> Accepted</Badge> : null}
                <IBtn label="Accept hunk" className="w-6 h-6" onClick={() => resolve(file.path, h.id, 'accepted')}><Check size={14} className="text-[var(--success)]" /></IBtn>
                <IBtn label="Reject hunk" className="w-6 h-6" onClick={() => resolve(file.path, h.id, 'rejected')}><X size={14} className="text-[var(--danger)]" /></IBtn>
              </div>
            </div>
            {h.lines.map((l, i) => (
              <div
                key={i}
                className="flex"
                style={{
                  background: l.type === 'add' ? 'var(--diff-add-bg)' : l.type === 'del' ? 'var(--diff-del-bg)' : undefined,
                  borderInlineStart: l.type === 'add' ? '3px solid var(--diff-add-line)' : l.type === 'del' ? '3px solid var(--diff-del-line)' : '3px solid transparent',
                }}
              >
                <span className="w-9 text-end pe-2 text-[var(--faint)] select-none shrink-0">{l.oldNo ?? ''}</span>
                <span className="w-9 text-end pe-2 text-[var(--faint)] select-none shrink-0">{l.newNo ?? ''}</span>
                <span className="w-3 shrink-0 text-[var(--muted)]">{l.type === 'add' ? '+' : l.type === 'del' ? '−' : ''}</span>
                <span className="whitespace-pre pe-3 flex-1">
                  {l.strong
                    ? (() => {
                        const [a, b] = l.strong[0];
                        return (
                          <>
                            {l.text.slice(0, a)}
                            <span style={{ background: 'color-mix(in srgb, var(--accent) 38%, transparent)' }}>{l.text.slice(a, b)}</span>
                            {l.text.slice(b)}
                          </>
                        );
                      })()
                    : l.text}
                </span>
              </div>
            ))}
            {hi === 0 ? (
              <button type="button" className="w-full text-start px-6 py-1.5 text-[12px] text-[var(--muted)]" style={{ background: 'var(--panel-2)' }} onClick={() => useStore.getState().toast('Unchanged lines expanded')}>
                Show 24 unchanged lines
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--line)]">
        <Btn size="sm" variant="ghost" disabled>← {t('changes.previous')}</Btn>
        <span className="text-[12.5px] text-[var(--muted)] mx-auto">{t('changes.fileOf', { n: 2, total: 7 })}</span>
        <Btn size="sm" variant="ghost" disabled>{t('changes.next')} →</Btn>
      </div>
    </div>
  );
}

function ChangesPanel() {
  const { t } = useI18n();
  const git = useStore((s) => s.git);
  const toggleStage = useStore((s) => s.toggleStage);
  const stageAll = useStore((s) => s.stageAll);
  const acceptAll = useStore((s) => s.acceptAll);
  const commit = useStore((s) => s.commit);
  const push = useStore((s) => s.push);
  const pull = useStore((s) => s.pull);
  const checkout = useStore((s) => s.checkout);
  const [tab, setTab] = useState<'changes' | 'history' | 'branches'>('changes');
  const [msg, setMsg] = useState('');
  const [selected, setSelected] = useState<ChangedFile | null>(null);
  const [stagedOpen, setStagedOpen] = useState(true);
  const [changesOpen, setChangesOpen] = useState(true);
  const staged = git.files.filter((f) => f.staged);
  const unstaged = git.files.filter((f) => !f.staged);
  const additions = git.files.reduce((a, f) => a + f.additions, 0);
  const deletions = git.files.reduce((a, f) => a + f.deletions, 0);
  const total = Math.max(1, additions + deletions);

  if (selected) return <DiffView file={selected} onClose={() => setSelected(null)} />;

  const FileRow = ({ f }: { f: ChangedFile }) => (
    <div className="group flex items-center gap-2 px-2.5 py-2 text-[13.5px] hover:bg-[var(--hover)] rounded-md">
      <button
        type="button"
        aria-label={f.staged ? 'Unstage' : 'Stage'}
        onClick={() => toggleStage(f.path)}
        className="w-[17px] h-[17px] rounded-[5px] grid place-items-center flex-none"
        style={{ border: `1.5px solid ${f.staged ? 'var(--accent)' : 'var(--line-strong)'}`, background: f.staged ? 'var(--accent)' : 'transparent', color: 'var(--accent-ink)' }}
      >
        {f.staged ? <Check size={11} strokeWidth={3} /> : null}
      </button>
      <span
        className="w-[17px] text-center text-[11px] font-semibold flex-none"
        style={{ color: f.status === 'M' ? 'var(--warning)' : f.status === 'A' ? 'var(--success)' : f.status === 'D' ? 'var(--danger)' : 'var(--info)' }}
      >
        {f.status}
      </span>
      <button type="button" onClick={() => setSelected(f)} className="flex-1 min-w-0 text-start truncate font-mono text-[12.5px]" dir="ltr">
        <span className="text-[var(--faint)]">{f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/') + 1) : ''}</span>
        <span>{f.path.split('/').pop()}</span>
      </button>
      {f.agent ? <Sparkles size={12} className="text-[var(--accent)] flex-none" /> : null}
      {f.active ? <span className="w-1.5 h-1.5 rounded-full animate-pulseDot flex-none" style={{ background: 'var(--accent)' }} /> : null}
      <span className="text-[11px] font-mono flex-none" style={{ color: 'var(--success)' }}>+{f.additions}</span>
      <span className="text-[11px] font-mono flex-none" style={{ color: 'var(--danger)' }}>−{f.deletions}</span>
    </div>
  );

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="px-3 pt-3 pb-2 border-b border-[var(--line)]">
        <div className="flex items-center gap-1.5">
          <Menu
            width={230}
            trigger={
              <button type="button" className="chip h-8 text-[13.5px] gap-1.5">
                <GitBranch size={15} />
                {git.branch}
                <ChevronDown size={13} />
              </button>
            }
          >
            <div className="px-2 py-1.5 text-[11.5px] uppercase tracking-wide text-[var(--faint)]">Branches</div>
            {git.branches.map((b) => (
              <MenuItem key={b.name} onClick={() => checkout(b.name)} icon={b.current ? <Check size={14} /> : undefined}>
                {b.name}
              </MenuItem>
            ))}
          </Menu>
          <span className="text-[12.5px] text-[var(--muted)]">↑{git.ahead} ↓{git.behind}</span>
          <div className="ms-auto flex gap-1.5">
            <Btn size="sm" variant="outline" onClick={pull}>{t('changes.pull')}</Btn>
            <Btn size="sm" variant="outline" disabled={git.ahead === 0} onClick={push}>{t('changes.push')}</Btn>
          </div>
        </div>
        <div className="mt-2.5">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'changes', label: t('changes.changes') },
              { value: 'history', label: t('changes.history') },
              { value: 'branches', label: t('changes.branches') },
            ]}
          />
        </div>
      </div>

      {tab === 'changes' ? (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-2 text-[12.5px] text-[var(--muted)]">
                <span>{git.files.length} files</span>
                <span className="font-mono" style={{ color: 'var(--success)' }}>+{additions}</span>
                <span className="font-mono" style={{ color: 'var(--danger)' }}>−{deletions}</span>
                <div className="ms-auto flex gap-1">
                  <button type="button" className="text-[12px] text-[var(--muted)] hover:text-[var(--text)]" onClick={acceptAll}>{t('changes.acceptAll')}</button>
                </div>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden mt-2" style={{ background: 'var(--elevated)' }}>
                <div style={{ width: `${(additions / total) * 100}%`, background: 'var(--success)' }} />
                <div style={{ width: `${(deletions / total) * 100}%`, background: 'var(--danger)' }} />
              </div>
            </div>

            <div className="px-1.5">
              <div className="flex items-center gap-1 px-1.5 py-1">
                <button type="button" onClick={() => setStagedOpen((v) => !v)} className="flex items-center gap-1 text-[13px] text-[var(--muted)]">
                  <ChevronDown size={13} style={{ transform: stagedOpen ? undefined : 'rotate(-90deg)', transition: 'transform .15s' }} />
                  {t('changes.staged')} ({staged.length})
                </button>
                <button type="button" className="ms-auto text-[12px] text-[var(--muted)] hover:text-[var(--text)]" onClick={() => stageAll(false)}>{t('changes.unstageAll')}</button>
              </div>
              {stagedOpen ? staged.map((f) => <FileRow key={f.path} f={f} />) : null}

              <div className="flex items-center gap-1 px-1.5 py-1 mt-2">
                <button type="button" onClick={() => setChangesOpen((v) => !v)} className="flex items-center gap-1 text-[13px] text-[var(--muted)]">
                  <ChevronDown size={13} style={{ transform: changesOpen ? undefined : 'rotate(-90deg)', transition: 'transform .15s' }} />
                  {t('changes.unstaged')} ({unstaged.length})
                </button>
                <button type="button" className="ms-auto text-[12px] text-[var(--muted)] hover:text-[var(--text)]" onClick={() => stageAll(true)}>{t('changes.stageAll')}</button>
              </div>
              {changesOpen ? unstaged.map((f) => <FileRow key={f.path} f={f} />) : null}
              {!git.files.length ? (
                <div className="text-center py-8 text-[14px] text-[var(--muted)]">{t('changes.noChanges')}</div>
              ) : null}
            </div>
          </div>

          <div className="p-3 border-t border-[var(--line)]" style={{ background: 'var(--panel-2)' }}>
            <div className="relative">
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder={t('changes.commitMessage')}
                rows={2}
                className="area"
                style={{ paddingInlineEnd: 38 }}
              />
              <button
                type="button"
                aria-label="Generate commit message"
                onClick={() => useStore.getState().toast(t('changes.generateUnavailable'))}
                className="absolute top-2 end-2 text-[var(--muted)] hover:text-[var(--accent)]"
              >
                <Sparkles size={17} />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11.5px] text-[var(--faint)]">{msg.length}/72</span>
              <div className="ms-auto flex items-center">
                <Btn
                  size="sm"
                  variant="primary"
                  disabled={!staged.length || !msg.trim()}
                  onClick={() => { commit(msg); setMsg(''); }}
                  className="rounded-e-none"
                >
                  {t('changes.commit')} {staged.length ? `${staged.length} files` : ''}
                </Btn>
                <Menu
                  trigger={<Btn size="sm" variant="primary" className="rounded-s-none border-s border-[color-mix(in_srgb,var(--accent)_60%,#000)] px-1.5"><ChevronDown size={14} /></Btn>}
                  width={210}
                >
                  <MenuItem onClick={() => { commit(msg); setMsg(''); push(); }}>Commit &amp; push</MenuItem>
                  <MenuItem onClick={() => { commit(msg); setMsg(''); }}>Commit &amp; create PR</MenuItem>
                  <MenuItem onClick={() => setMsg(`${msg} (amend)`)}>{t('changes.amend')}</MenuItem>
                </Menu>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {tab === 'history' ? (
        <div className="flex-1 overflow-y-auto p-2">
          {git.commits.map((c) => (
            <button key={c.hash} type="button" className="w-full flex items-start gap-2.5 px-2 py-2.5 rounded-lg hover:bg-[var(--hover)] text-start" onClick={() => useStore.getState().toast(`Opened ${c.hash}`)}>
              <GitCommitHorizontal size={16} className="text-[var(--muted)] mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] truncate">{c.message}</div>
                <div className="text-[12px] text-[var(--faint)] mt-0.5">
                  {c.author} · {new Date(c.at).toLocaleDateString()}
                </div>
              </div>
              <span className="badge font-mono">{c.hash}</span>
            </button>
          ))}
        </div>
      ) : null}

      {tab === 'branches' ? (
        <div className="flex-1 overflow-y-auto p-2">
          {git.branches.map((b) => (
            <div key={b.name} className="flex items-center gap-2 px-2 py-2.5 rounded-lg hover:bg-[var(--hover)]">
              <GitBranch size={16} className="text-[var(--muted)]" />
              <span className="text-[14px] flex-1 truncate font-mono" dir="ltr">{b.name}</span>
              {b.current ? <Badge tone="accent">current</Badge> : null}
              {!b.current ? (
                <Btn size="sm" variant="ghost" onClick={() => checkout(b.name)}>Checkout</Btn>
              ) : null}
              <span className="text-[12px] text-[var(--faint)]">↑{b.ahead ?? 0} ↓{b.behind ?? 0}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ================================ plan ================================ */

function PlanPanel() {
  const { t } = useI18n();
  const setMode = useStore((s) => s.setSessionMode);
  return (
    <div className="h-full overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
      <ListTree size={24} className="text-[var(--faint)]" />
      <div className="text-[16px] font-semibold mt-2">{t('plan.emptyTitle')}</div>
      <p className="text-[13.5px] text-[var(--muted)] mt-1 max-w-[320px]">{t('plan.emptyBody')}</p>
      <Btn className="mt-4" variant="outline" onClick={() => setMode('plan')}>{t('plan.switchToPlan')}</Btn>
    </div>
  );
}

/* ================================ dock ================================ */
export function TerminalDock() {
  const { t } = useI18n();
  const open = useStore((s) => s.dockOpen);
  const setOpen = useStore((s) => s.setDockOpen);
  const height = useStore((s) => s.dockHeight);
  const setHeight = useStore((s) => s.setDockHeight);
  if (!open) return null;
  return (
    <div className="shrink-0 border-t border-[var(--line)] relative" style={{ height: `${height}%`, minHeight: 160 }}>
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize terminal"
        className="absolute -top-2 left-0 right-0 h-4 cursor-row-resize z-20 flex justify-center"
        onDoubleClick={() => setHeight(height >= 70 ? 35 : 70)}
        onPointerDown={(e) => {
          const startY = e.clientY;
          const startH = height;
          const move = (ev: PointerEvent) => {
            const delta = ((startY - ev.clientY) / window.innerHeight) * 100;
            setHeight(Math.max(18, Math.min(80, startH + delta)));
          };
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        }}
      >
        <span className="mt-1 h-1 w-9 rounded-full" style={{ background: 'var(--line-strong)' }} />
      </div>
      <div className="flex items-center gap-2 px-2 h-9 border-b border-[var(--line)]">
        <span className="flex items-center gap-1.5 h-7 px-2 rounded-md text-[13.5px]" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <SquareTerminal size={15} />
          {t('terminal.terminal')}
        </span>
        <button type="button" className="ibtn w-7 h-7" aria-label="New terminal"><Plus size={15} /></button>
        <div className="ms-auto flex items-center gap-1">
          <button type="button" className="ibtn w-7 h-7" aria-label="Split"><Columns2 size={15} /></button>
          <button type="button" className="ibtn w-7 h-7" aria-label="Close terminal" onClick={() => setOpen(false)}><X size={15} /></button>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 top-9 min-h-0">
        <TerminalPanel compact />
      </div>
    </div>
  );
}
