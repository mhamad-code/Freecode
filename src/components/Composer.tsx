import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  ArrowUp,
  AudioLines,
  Check,
  ChevronDown,
  FilePlus,
  ImagePlus,
  Paperclip,
  Plus,
  Shield,
  Sparkles,
  Square,
  Wand2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useI18n } from '../lib/i18n';
import {
  buildCatalog,
  flattenCatalog,
  isMockMode,
  pickDefaultModel,
  type CatalogModel,
} from '../lib/modelCatalog';
import { probeModel, recordHealth, resolveWorkingModel } from '../lib/modelProbe';
import { loadProviders, saveProviders } from '../lib/providersStore';
import { useCatalog } from '../lib/useCatalog';
import type { Effort, Mode } from '../lib/types';
import { Badge, Btn, IBtn, Kbd, Menu, MenuItem, SearchInput, Segmented, Tip, useMedia } from './ui';
import { Popover } from './Popover';

/** Demo models: only reachable with ?mock=1, never mixed into a real catalog. */
const DEMO_MODELS = [
  { id: 'DeepSeek V4.1 Flash', desc: 'Fast, cheap, great for edits' },
  { id: 'Claude Sonnet 4.5', desc: 'Best balance for long tasks' },
  { id: 'GPT-5 Codex', desc: 'Strongest reasoning, slower' },
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
  const navigate = useNavigate();
  const session = useStore((s) => s.sessions.find((x) => x.id === s.activeSessionId))!;
  const send = useStore((s) => s.send);
  const stop = useStore((s) => s.stop);
  const enqueue = useStore((s) => s.enqueue);
  const removeQueued = useStore((s) => s.removeQueued);
  const setDraft = useStore((s) => s.setDraft);
  const setMode = useStore((s) => s.setSessionMode);
  const setModel = useStore((s) => s.setModel);
  const setEffort = useStore((s) => s.setEffort);
  const toast = useStore((s) => s.toast);
  const usage = useStore((s) => s.sessionUsage);
  const skills = useStore((s) => s.skills);
  const files = useStore((s) => s.files);
  const [text, setText] = useState(session.draft);
  const [menu, setMenu] = useState<'slash' | 'mention' | null>(null);
  const [dictating, setDictating] = useState(false);
  const [drag, setDrag] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [error, setError] = useState(false);
  const [modelQuery, setModelQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [probing, setProbing] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const providers = useCatalog();
  const mock = isMockMode();
  const groups = mock ? [] : buildCatalog(providers, showAll);
  const catalog = flattenCatalog(groups);
  const defaultModel = pickDefaultModel(catalog);
  const hiddenCount = groups.reduce((n, g) => n + g.hidden, 0);
  const query = modelQuery.trim().toLowerCase();
  const visibleGroups = groups
    .map((g) => ({ ...g, models: g.models.filter((m) => `${m.label} ${m.id} ${g.label}`.toLowerCase().includes(query)) }))
    .filter((g) => g.models.length > 0);
  const demoModels = DEMO_MODELS.filter((m) => `${m.id} ${m.desc}`.toLowerCase().includes(query));
  const activeModel = catalog.find((m) => m.id === session.model);
  const triggerLabel = mock
    ? session.model
    : activeModel?.label ?? defaultModel?.label ?? t('model.noWorkingShort');
  const isWide = useMedia('(min-width: 640px)');
  const running = session.status === 'running';

  useEffect(() => {
    if (mock || !catalog.length) return;
    if (!catalog.some((m) => m.id === session.model) && defaultModel) setModel(defaultModel.id);
  }, [mock, catalog, defaultModel, session.model, setModel]);

  useEffect(() => {
    setText(session.draft);
  }, [session.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(170, Math.max(66, el.scrollHeight))}px`;
  }, [text]);

  const speech = useRef<{ stop: () => void } | null>(null);
  const canDictate =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition,
    );

  useEffect(() => () => speech.current?.stop(), []);

  const startDictation = () => {
    const Ctor = ((window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition) as
      | (new () => {
          lang: string;
          continuous: boolean;
          interimResults: boolean;
          onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null;
          onend: (() => void) | null;
          onerror: (() => void) | null;
          start: () => void;
          stop: () => void;
        })
      | undefined;
    if (!Ctor) {
      toast(t('composer.voiceUnavailable'));
      return;
    }
    const recognition = new Ctor();
    recognition.lang = useStore.getState().lang === 'ar' ? 'ar-SA' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let said = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        said += event.results[i][0]?.transcript ?? '';
      }
      if (said.trim()) setText((v) => (v ? `${v} ${said.trim()}` : said.trim()));
    };
    recognition.onend = () => setDictating(false);
    recognition.onerror = () => {
      setDictating(false);
      toast(t('composer.voiceUnavailable'));
    };
    speech.current = recognition;
    setDictating(true);
    recognition.start();
  };

  const selectModel = async (model: CatalogModel) => {
    setModel(model.id);
    setModelQuery('');
    if (model.health === 'ok') return;
    setProbing(model.id);
    try {
      const outcome = await probeModel(model.providerId, model.id);
      saveProviders(recordHealth(loadProviders(), model.providerId, model.id, outcome));
      if (outcome.status === 'needs-key') toast(t('model.needsKey', { model: model.id }));
      if (outcome.status === 'failed') toast(t('model.probeFailed', { model: model.id }));
    } finally {
      setProbing(null);
    }
  };

  const retryModels = async () => {
    setRetrying(true);
    try {
      const result = await resolveWorkingModel(session.model);
      if (result.choice) {
        setModel(result.choice.modelId);
        toast(t('providers.okModel', { model: result.choice.modelId }));
      } else {
        toast(t('model.noWorking'));
      }
    } finally {
      setRetrying(false);
    }
  };

  const submit = (value?: string) => {
    const v = (value ?? text).trim();
    if (!v) return;
    if (running) {
      enqueue(v);
      setText('');
      setDraft('');
      setMenu(null);
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
          {session.queued.length ? (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {session.queued.map((q, i) => (
                <span key={`${i}-${q}`} className="badge badge-info gap-1.5">
                  {t('chat.queued')}: {q.slice(0, 24)}
                  <button
                    type="button"
                    aria-label={t('chat.removeQueued')}
                    onClick={() => removeQueued(i)}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="relative" ref={boxRef}>
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

            <Popover
              open={menu !== null}
              onOpenChange={(o) => { if (!o) setMenu(null); }}
              anchorRef={boxRef}
              side="top"
              align="start"
              width={420}
              maxWidth={420}
              mobileSheet
              closeOnSelect
              panelClassName="p-1.5"
              label={menu === 'slash' ? 'Skills' : 'Files'}
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
            </Popover>
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
              <MenuItem disabled reason={t('composer.attachmentsUnavailable')} icon={<Paperclip size={16} />}>{t('composer.attach')}</MenuItem>
              <MenuItem disabled reason={t('composer.attachmentsUnavailable')} icon={<FilePlus size={16} />}>Add from project</MenuItem>
              <MenuItem disabled reason={t('composer.attachmentsUnavailable')} icon={<ImagePlus size={16} />}>Attach screenshot</MenuItem>
              <MenuItem disabled reason={t('composer.attachmentsUnavailable')} icon={<Sparkles size={16} />}>Add MCP resource</MenuItem>
              <MenuItem disabled reason={t('composer.attachmentsUnavailable')} icon={<Wand2 size={16} />}>Take a snapshot</MenuItem>
            </Menu>

            <Popover
              side="top"
              align="start"
              width={360}
              maxWidth={360}
              className="flex-1 min-w-0"
              mobileSheet
              label={t('composer.model')}
              trigger={
                <button type="button" className="flex items-center gap-1 px-1.5 h-8 w-full rounded-lg hover:bg-[var(--hover)] text-[13px] whitespace-nowrap min-w-0">
                  <span className="truncate flex-1 min-w-0">{triggerLabel}</span>
                  <span className="text-[var(--muted)] capitalize">{session.effort}</span>
                  <ChevronDown size={14} className="text-[var(--muted)]" />
                </button>
              }
              header={
                <div className="p-2 border-b border-[var(--line)]">
                  <SearchInput value={modelQuery} onValueChange={setModelQuery} placeholder={t('composer.model')} />
                </div>
              }
            >
              <div className="p-1">
                {mock
                  ? demoModels.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setModel(m.id)}
                        className="w-full px-2 py-2 rounded-[9px] text-start hover:bg-[var(--hover)]"
                      >
                        <div className="flex items-center gap-2 text-[14.5px]">
                          <span className="flex-1 truncate">{m.id}</span>
                          <Badge>{t('model.demo')}</Badge>
                          {session.model === m.id ? <Check size={15} className="text-[var(--accent)]" /> : null}
                        </div>
                        <div className="text-[12.5px] text-[var(--muted)]">{m.desc}</div>
                      </button>
                    ))
                  : visibleGroups.map((group) => (
                      <div key={group.providerId}>
                        <div className="px-2 pt-2 pb-1 text-[11.5px] uppercase tracking-wide text-[var(--faint)] flex items-center gap-1.5">
                          <span className="truncate">{group.label}</span>
                          {group.keyless ? <Badge tone="accent">{t('model.free')}</Badge> : null}
                          <span className="ms-auto">{group.models.length}</span>
                        </div>
                        {group.models.map((m) => (
                          <button
                            key={`${group.providerId}:${m.id}`}
                            type="button"
                            onClick={() => void selectModel(m)}
                            className="w-full px-2 py-1.5 rounded-[9px] text-start hover:bg-[var(--hover)]"
                          >
                            <div className="flex items-center gap-1.5 text-[14px] flex-wrap">
                              <span className="flex-1 truncate" dir="ltr">{m.label}</span>
                              {probing === m.id ? <span className="spinner" /> : null}
                              {m.free ? <Badge tone="accent">{t('model.free')}</Badge> : null}
                              {m.price === 'unverified' ? <Badge tone="warning">{t('model.unverified')}</Badge> : null}
                              {m.kind !== 'chat' ? <Badge tone="neutral">{t('model.notChat')}</Badge> : null}
                              {m.tools ? <Badge>{t('model.tools')}</Badge> : null}
                              {m.reasoning ? <Badge tone="info">{t('model.reasoning')}</Badge> : null}
                              {m.health === 'ok' ? <Badge tone="accent">{t('model.testedOk')}</Badge> : null}
                              {session.model === m.id ? <Check size={15} className="text-[var(--accent)]" /> : null}
                            </div>
                            <div className="text-[12px] text-[var(--muted)] truncate" dir="ltr">
                              {m.id}
                              {m.contextWindow ? ` · ${Math.round(m.contextWindow / 1000)}k` : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    ))}
                {!mock && visibleGroups.length === 0 ? (
                  <div className="px-2 py-6 text-center text-[13.5px] text-[var(--muted)]">
                    <div>{query ? t('palette.noResults', { q: modelQuery }) : t('model.noWorking')}</div>
                    {!query ? (
                      <div className="flex flex-wrap justify-center gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => void retryModels()}
                          disabled={retrying}
                          className="btn btn-outline btn-sm"
                        >
                          {retrying ? <span className="spinner" /> : null}
                          {t('common.retry')}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/settings/providers')}
                          className="btn btn-primary btn-sm"
                        >
                          {t('model.addKey')}
                        </button>
                      </div>
                    ) : null}
                    {!query && hiddenCount > 0 ? null : null}
                  </div>
                ) : null}
                {hiddenCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="w-full mt-1 px-2 h-9 rounded-[9px] text-[13px] text-start hover:bg-[var(--hover)] text-[var(--muted)]"
                  >
                    {showAll ? t('model.showLess') : t('model.showAll', { n: String(hiddenCount) })}
                  </button>
                ) : null}
              </div>
              <div className="px-2 pt-2 pb-1 text-[11.5px] uppercase tracking-wide text-[var(--faint)]">Reasoning effort</div>
              <div className="px-1.5 pb-1.5">
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
            </Popover>

            <ContextRing pct={usage.context} onOpen={() => setContextOpen((v) => !v)} />

            {contextOpen ? (
              <div
                className="popover-surface z-popover absolute bottom-[52px] end-0 w-[268px] p-3 animate-popIn"
                style={{ borderRadius: 14 }}
              >
                <div className="text-[14px] font-semibold">
                  Context {usage.context}% used · {usage.tokens}k tokens
                </div>
                <div className="text-[13px] text-[var(--muted)] mt-1">Cost this session ${usage.cost.toFixed(2)}</div>
                <Btn
                  size="sm"
                  variant="outline"
                  className="mt-2.5 w-full"
                  disabled
                  title={t('composer.compactUnavailable')}
                >
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
                </>
              ) : null}

              <button
                type="button"
                aria-label={running ? t('chat.stop') : hasText ? t('chat.send') : t('chat.voice')}
                disabled={!running && !hasText && !canDictate}
                title={!running && !hasText && !canDictate ? t('composer.voiceUnavailable') : undefined}
                onClick={() => {
                  if (running) stop();
                  else if (hasText) submit();
                  else if (dictating) {
                    speech.current?.stop();
                    setDictating(false);
                  } else startDictation();
                }}
                className={clsx('grid place-items-center flex-none relative disabled:opacity-40 disabled:cursor-not-allowed')}
                style={{
                  width: 44,
                  height: 38,
                  borderRadius: 11,
                  background: running ? 'var(--elevated)' : 'var(--accent)',
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
