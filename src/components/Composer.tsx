import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  ArrowUp,
  AudioLines,
  Check,
  ChevronDown,
  FilePlus,
  GitBranch,
  ImagePlus,
  Paperclip,
  Plus,
  Shield,
  Sparkles,
  Square,
  Wand2,
  X,
} from 'lucide-react';
import { useStore } from '../store';
import { useI18n } from '../lib/i18n';
import type { Effort, Mode } from '../lib/types';
import { Badge, Btn, IBtn, Kbd, Menu, MenuItem, Segmented, Tip, useMedia } from './ui';

const MODELS = [
  { id: 'DeepSeek V4.1 Flash', desc: 'Fast, cheap, great for edits', speed: 3, cost: 1 },
  { id: 'Claude Sonnet 4.5', desc: 'Best balance for long tasks', speed: 2, cost: 3 },
  { id: 'GPT-5 Codex', desc: 'Strongest reasoning, slower', speed: 1, cost: 4 },
];

function ContextRing({ pct, onOpen }: { pct: number; onOpen: () => void }) {
  const color = pct >= 95 ? 'var(--danger)' : pct >= 80 ? 'var(--warning)' : 'var(--accent)';
  return (
    <Tip label="Context usage" side="top">
      <button type="button" onClick={onOpen} aria-label="Context usage" className="grid place-items-center w-7 h-7 rounded-lg hover:bg-[var(--hover)]">
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
          <circle cx="10" cy="10" r="8" fill="none" stroke="var(--line-strong)" strokeWidth="2" />
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 50.26} 50.26`}
            transform="rotate(-90 10 10)"
          />
        </svg>
      </button>
    </Tip>
  );
}

export function Composer() {
  const { t } = useI18n();
  const session = useStore((s) => s.sessions.find((x) => x.id === s.activeSessionId))!;
  const send = useStore((s) => s.send);
  const stop = useStore((s) => s.stop);
  const setDraft = useStore((s) => s.setDraft);
  const setMode = useStore((s) => s.setSessionMode);
  const setModel = useStore((s) => s.setModel);
  const setEffort = useStore((s) => s.setEffort);
  const usage = useStore((s) => s.sessionUsage);
  const skills = useStore((s) => s.skills);
  const files = useStore((s) => s.files);
  const [text, setText] = useState(session.draft);
  const [menu, setMenu] = useState<'slash' | 'mention' | null>(null);
  const [queued, setQueued] = useState<string[]>([]);
  const [dictating, setDictating] = useState(false);
  const [drag, setDrag] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const isWide = useMedia('(min-width: 640px)');
  const running = session.status === 'running';

  useEffect(() => {
    setText(session.draft);
  }, [session.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(170, Math.max(66, el.scrollHeight))}px`;
  }, [text]);

  useEffect(() => {
    if (!running && queued.length) {
      const next = queued[0];
      setQueued((q) => q.slice(1));
      send(next);
    }
  }, [running, queued, send]);

  useEffect(() => {
    if (!dictating) return;
    const phrase = t('chat.placeholder').split(' ');
    let i = 0;
    const id = window.setInterval(() => {
      if (i >= phrase.length) {
        setDictating(false);
        window.clearInterval(id);
        return;
      }
      setText((v) => (v ? `${v} ${phrase[i]}` : phrase[i]));
      i++;
    }, 160);
    return () => window.clearInterval(id);
  }, [dictating, t]);

  const submit = (value?: string) => {
    const v = (value ?? text).trim();
    if (!v) return;
    if (running) {
      setQueued((q) => [...q, v]);
      setText('');
      setDraft('');
      return;
    }
    setError(false);
    send(v);
    setText('');
    setDraft('');
    setMenu(null);
  };

  const hasText = text.trim().length > 0;
  const placeholder = t('chat.placeholder');

  return (
    <div className="px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-1.5">
      <div
        className="mx-auto max-w-[820px] relative"
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); }}
      >
        {drag ? (
          <div
            className="absolute inset-0 z-10 grid place-items-center text-[14.5px] rounded-[22px]"
            style={{ border: '1.5px dashed var(--accent)', background: 'color-mix(in srgb, var(--panel) 90%, transparent)' }}
          >
            {t('composer.dropFiles')}
          </div>
        ) : null}

        {session.mode === 'skills' ? (
          <div className="flex gap-2 overflow-x-auto no-bar pb-2">
            {skills.filter((s) => s.enabled).map((s) => (
              <button
                key={s.id}
                type="button"
                className="chip"
                onClick={() => { setText((v) => `${v}${v ? ' ' : ''}/${s.id} `); ref.current?.focus(); }}
              >
                <Sparkles size={14} />
                {s.name}
              </button>
            ))}
          </div>
        ) : null}

        <div
          className="composer-shell"
          style={{
            background: 'var(--panel-2)',
            border: '1.5px solid var(--line-strong)',
            borderRadius: 22,
            padding: '12px 14px 10px',
            boxShadow: '0 3px 0 var(--edge)',
          }}
        >
          {queued.length ? (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {queued.map((q, i) => (
                <span key={i} className="badge badge-info gap-1.5">
                  {t('chat.queued')}: {q.slice(0, 24)}
                  <button type="button" aria-label="Remove" onClick={() => setQueued((x) => x.filter((_, j) => j !== i))}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="relative">
            <textarea
              ref={ref}
              value={text}
              dir="auto"
              onChange={(e) => {
                const v = e.target.value;
                setText(v);
                setDraft(v);
                if (v.startsWith('/')) setMenu('slash');
                else if (v.endsWith('@')) setMenu('mention');
                else setMenu(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && useStore.getState().settings.sendEnter) {
                  e.preventDefault();
                  submit();
                }
                if (e.key === 'Escape' && running && !text) stop();
                if (e.key === 'ArrowUp' && !text) {
                  const lastUser = [...session.messages].reverse().find((m) => m.kind === 'user');
                  if (lastUser && lastUser.kind === 'user') setText(lastUser.text);
                }
              }}
              placeholder={placeholder}
              aria-label={placeholder}
              className="w-full bg-transparent outline-none resize-none text-[16px] leading-[1.55]"
              style={{ minHeight: 66, maxHeight: 170, unicodeBidi: 'plaintext' }}
              rows={3}
            />
            {!text ? (
              <button
                type="button"
                onClick={() => { setText(placeholder); ref.current?.focus(); }}
                className="mt-1 text-[15px] text-[var(--text)] hover:underline"
              >
                {t('chat.useSuggestion')}
              </button>
            ) : null}

            {menu ? (
              <div
                className="absolute bottom-full mb-2 w-full max-w-[420px] p-1.5 z-30 animate-popIn"
                style={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', borderRadius: 14, boxShadow: '0 16px 44px rgba(0,0,0,.45)' }}
                role="listbox"
              >
                {(menu === 'slash' ? skills.map((s) => ({ key: s.id, name: s.name, desc: s.description, badge: 'Skill' })) : files.slice(0, 6).map((f) => ({ key: f.path, name: f.name, desc: f.path, badge: 'File' }))).map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    className="w-full flex items-center gap-2 px-2.5 h-10 rounded-[9px] hover:bg-[var(--hover)] text-start"
                    onClick={() => {
                      const token = menu === 'slash' ? `/${row.name} ` : `@${row.name} `;
                      setText((v) => v.replace(/[/@]\S*$/, '') + token);
                      setMenu(null);
                      ref.current?.focus();
                    }}
                  >
                    <Sparkles size={16} className="text-[var(--muted)]" />
                    <span className="text-[14.5px] truncate">{row.name}</span>
                    <span className="text-[12.5px] text-[var(--faint)] truncate flex-1">{row.desc}</span>
                    <Badge>{row.badge}</Badge>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="flex items-center gap-2 mt-1 text-[13.5px]" style={{ color: 'var(--danger)' }}>
              Network error. <button type="button" className="underline" onClick={() => setError(false)}>{t('common.retry')}</button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <Segmented<Mode>
              value={session.mode}
              onChange={setMode}
              options={[
                { value: 'build', label: t('modes.build') },
                { value: 'plan', label: t('modes.plan') },
                { value: 'mission', label: t('modes.mission') },
                { value: 'skills', label: t('modes.skills') },
              ]}
              ariaLabel="Mode"
            />
            {isWide ? <span className="text-[12.5px] text-[var(--faint)]">Alt 1–4</span> : null}
          </div>

          <div className="flex items-center gap-1 mt-2 min-w-0">
            <Menu
              align="start"
              width={250}
              trigger={
                <IBtn label={t('composer.attach')} className="w-8 h-8">
                  <Plus size={21} />
                </IBtn>
              }
            >
              <MenuItem icon={<Paperclip size={16} />}>{t('composer.attach')}</MenuItem>
              <MenuItem icon={<FilePlus size={16} />}>Add from project</MenuItem>
              <MenuItem icon={<ImagePlus size={16} />}>Attach screenshot of browser</MenuItem>
              <MenuItem icon={<Sparkles size={16} />}>Add MCP resource</MenuItem>
              <MenuItem icon={<Wand2 size={16} />}>Take a snapshot</MenuItem>
            </Menu>

            <Menu
              align="start"
              width={286}
              className="flex-1 min-w-0"
              trigger={
                <button type="button" className="flex items-center gap-1 px-1.5 h-8 w-full rounded-lg hover:bg-[var(--hover)] text-[13px] whitespace-nowrap min-w-0">
                  <span className="truncate flex-1 min-w-0">{session.model}</span>
                  <span className="text-[var(--muted)] capitalize">{session.effort}</span>
                  <ChevronDown size={14} className="text-[var(--muted)]" />
                </button>
              }
            >
              <div className="px-2 pt-1 pb-2 text-[11.5px] uppercase tracking-wide text-[var(--faint)]">{t('composer.model')}</div>
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModel(m.id)}
                  className="w-full px-2 py-2 rounded-[9px] text-start hover:bg-[var(--hover)]"
                >
                  <div className="flex items-center gap-2 text-[14.5px]">
                    <span className="flex-1 truncate">{m.id}</span>
                    {session.model === m.id ? <Check size={15} className="text-[var(--accent)]" /> : null}
                  </div>
                  <div className="text-[12.5px] text-[var(--muted)]">{m.desc}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <span key={i} className="w-3 h-1 rounded-full" style={{ background: i < m.speed ? 'var(--accent)' : 'var(--line-strong)' }} />
                    ))}
                    <span className="text-[11.5px] text-[var(--faint)] ms-1">speed</span>
                  </div>
                </button>
              ))}
              <div className="px-2 pt-2 pb-1 text-[11.5px] uppercase tracking-wide text-[var(--faint)]">Reasoning effort</div>
              <div className="px-1 pb-1">
                <Segmented<Effort>
                  value={session.effort}
                  onChange={setEffort}
                  options={[
                    { value: 'low', label: t('effort.low') },
                    { value: 'medium', label: t('effort.medium') },
                    { value: 'high', label: t('effort.high') },
                  ]}
                />
              </div>
            </Menu>

            <ContextRing pct={usage.context} onOpen={() => setContextOpen((v) => !v)} />

            {contextOpen ? (
              <div
                className="absolute bottom-[52px] end-0 z-30 w-[268px] p-3 animate-popIn"
                style={{ background: 'var(--panel)', border: '1px solid var(--line-strong)', borderRadius: 14, boxShadow: '0 16px 44px rgba(0,0,0,.45)' }}
              >
                <div className="text-[14px] font-semibold">
                  Context {usage.context}% used · {usage.tokens}k / 200k tokens
                </div>
                <div className="text-[13px] text-[var(--muted)] mt-1">Cost this session ${usage.cost.toFixed(2)}</div>
                <Btn size="sm" variant="outline" className="mt-2.5 w-full" onClick={() => setContextOpen(false)}>
                  {t('composer.compact')}
                </Btn>
              </div>
            ) : null}

            <div className="ms-auto flex items-center gap-1.5">
              {isWide ? (
                <>
                  <Menu
                    align="end"
                    width={240}
                    trigger={
                      <button type="button" className="chip h-8 gap-1.5 text-[13.5px]" aria-label={t('settings.agentPermissions')}>
                        <Shield size={15} />
                        {useStore.getState().settings.permissionMode === 'ask' ? t('composer.permissionAsk') : 'Risk only'}
                      </button>
                    }
                  >
                    {['Ask every time', 'Ask for risky actions only', 'Allow all in this project', 'Read-only'].map((p) => (
                      <MenuItem key={p} onClick={() => useStore.getState().setSetting('permissionMode', p)}>{p}</MenuItem>
                    ))}
                  </Menu>
                  <button type="button" className="chip h-8 gap-1.5 text-[13.5px]" aria-label="Branch">
                    <GitBranch size={15} />
                    main
                  </button>
                </>
              ) : null}

              <button
                type="button"
                aria-label={running ? t('chat.stop') : hasText ? t('chat.send') : t('chat.voice')}
                onClick={() => {
                  if (running) stop();
                  else if (hasText) submit();
                  else setDictating((d) => !d);
                }}
                className={clsx('grid place-items-center flex-none relative')}
                style={{
                  width: 44,
                  height: 38,
                  borderRadius: 11,
                  background: running ? 'var(--elevated)' : hasText ? 'var(--accent)' : 'var(--accent)',
                  color: running ? 'var(--text)' : 'var(--accent-ink)',
                  boxShadow: `0 2px 0 ${running ? 'var(--edge)' : 'var(--accent-edge)'}`,
                  border: running ? '1.5px solid var(--line-strong)' : 'none',
                  transition: 'background-color .16s var(--ease-out)',
                }}
              >
                {running ? <Square size={16} fill="currentColor" /> : hasText ? <ArrowUp size={19} strokeWidth={2.4} /> : <AudioLines size={20} />}
                {dictating ? <span className="absolute inset-0 rounded-[11px] border-2 animate-pulse" style={{ borderColor: 'var(--accent)' }} /> : null}
              </button>
            </div>
          </div>
        </div>
        <div className="text-[11.5px] text-[var(--faint)] text-center mt-1.5 flex items-center justify-center gap-1.5">
          <Kbd>Enter</Kbd> {t('chat.send')} · <Kbd>Shift+Enter</Kbd> newline
        </div>
      </div>
    </div>
  );
}
