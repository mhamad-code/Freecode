import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowDown,
  Check,
  CheckCheck,
  ChevronDown,
  History,
  Copy,
  File,
  FilePen,
  MessageSquare,
  Pencil,
  Plug,
  Shield,
  Sparkles,
  Square,
  SquareTerminal,
  ThumbsDown,
  ThumbsUp,
  Undo2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { AssistantTurn, Group, Message, Permission, ToolKind } from '../lib/types';
import { useI18n } from '../lib/i18n';
import { diffContents, getCheckpoint } from '../lib/checkpoints';
import { Badge, Btn, Dialog, Logo, Progress, Tip, fmtDur, useNow } from './ui';

/* ------------------------------ markdown ------------------------------ */
const inline = (text: string): ReactNode[] => {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith('`') && p.endsWith('`')) return <code className="code-chip" key={i}>{p.slice(1, -1)}</code>;
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    const m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (m) return <a key={i} href={m[2]} target="_blank" rel="noreferrer">{m[1]}</a>;
    return <span key={i}>{p}</span>;
  });
};

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const out: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      out.push(<p key={`p${out.length}`}>{inline(para.join(' '))}</p>);
      para = [];
    }
  };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    out.push(
      <Tag key={`l${out.length}`}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      flushPara();
      flushList();
      const lang = line.trim().slice(3);
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      out.push(
        <div key={`c${out.length}`} className="relative group/code">
          {lang ? <div className="text-[11.5px] uppercase tracking-wide text-[var(--faint)] mb-1">{lang}</div> : null}
          <pre>
            <code dir="ltr">{code.join('\n')}</code>
          </pre>
          <button
            type="button"
            aria-label="Copy code"
            onClick={() => void navigator.clipboard?.writeText(code.join('\n'))}
            className="absolute top-2 end-2 opacity-0 group-hover/code:opacity-100 transition-opacity grid place-items-center w-7 h-7 rounded-md"
            style={{ background: 'var(--elevated)', border: '1px solid var(--line)' }}
          >
            <Copy size={14} />
          </button>
        </div>,
      );
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (bullet || ordered) {
      flushPara();
      const isOrdered = Boolean(ordered);
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list.items.push((bullet ? bullet[1] : ordered![1]) as string);
      continue;
    }
    if (line.startsWith('### ')) {
      flushPara();
      flushList();
      out.push(<h3 key={`h${out.length}`}>{inline(line.slice(4))}</h3>);
      continue;
    }
    if (line.startsWith('> ')) {
      flushPara();
      flushList();
      out.push(<blockquote key={`q${out.length}`}>{inline(line.slice(2))}</blockquote>);
      continue;
    }
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    para.push(line);
  }
  flushPara();
  flushList();
  return <div className="prose-fc" dir="auto" style={{ unicodeBidi: 'plaintext' }}>{out}</div>;
}

/* ------------------------------ activity ------------------------------ */
const CATS: Record<string, { one: string; many: string }> = {
  cmd: { one: 'ran a command', many: 'ran commands' },
  browser: { one: 'used the browser', many: 'used the browser' },
  read: { one: 'read a file', many: 'read files' },
  edit: { one: 'edited a file', many: 'edited files' },
  mcp: { one: 'used an MCP tool', many: 'used MCP tools' },
  skill: { one: 'used a skill', many: 'used skills' },
  git: { one: 'ran a git command', many: 'ran git commands' },
};
const RUNNING: Record<string, string> = {
  think: 'Thinking…',
  cmd: 'Running a command…',
  browser: 'Using the browser…',
  read: 'Reading files…',
  edit: 'Editing files…',
  mcp: 'Calling an MCP tool…',
  skill: 'Using a skill…',
  git: 'Running git…',
};

const summarize = (actions: ToolKind[]) => {
  const order: string[] = [];
  const counts: Record<string, number> = {};
  for (const a of actions) {
    if (a === 'think') continue;
    if (!(a in counts)) {
      counts[a] = 0;
      order.push(a);
    }
    counts[a]++;
  }
  const s = order.map((a) => (counts[a] === 1 ? CATS[a].one : CATS[a].many)).join(', ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const iconFor = (actions: ToolKind[]) => {
  if (actions.includes('think')) return { node: <Sparkles size={19} />, color: 'var(--info)' };
  switch (actions.find((a) => a !== 'think')) {
    case 'browser':
    case 'mcp':
      return { node: <Plug size={19} />, color: 'var(--info)' };
    case 'read':
      return { node: <File size={19} />, color: 'var(--success)' };
    case 'edit':
      return { node: <FilePen size={19} />, color: 'var(--success)' };
    default:
      return { node: <SquareTerminal size={19} />, color: 'var(--cmd)' };
  }
};

function ActivityGroup({ group }: { group: Group }) {
  const [open, setOpen] = useState(false);
  const running = !group.done;
  const kinds = group.actions.map((a) => a.kind);
  const icon = iconFor(kinds);
  const current = group.actions[group.actions.length - 1];
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="grp-row w-full text-start"
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '5px 0', minHeight: 29, color: 'var(--muted)', fontSize: 15.5, lineHeight: 1.3, borderRadius: 6 }}
      >
        <span className="w-[19px] h-[19px] grid place-items-center flex-none" style={{ color: running ? 'var(--info)' : icon.color }}>
          {running ? <span className="spinner" /> : icon.node}
        </span>
        <span className={clsx('flex-1 min-w-0 truncate', running && 'shimmer')}>
          {running ? RUNNING[current?.kind ?? 'cmd'] : summarize(kinds)}
        </span>
      </button>
      <div className={clsx('detail', open && 'open')}>
        <div className="inner" style={{ paddingInlineStart: 31, paddingBottom: open ? 6 : 0 }}>
          {group.actions.map((a) => (
            <div key={a.id} className="flex gap-2 items-baseline py-0.5 text-[13.5px] leading-relaxed min-w-0">
              <span className="flex-none text-[var(--faint)]">{a.label}</span>
              <span className="font-mono truncate" style={{ color: 'var(--muted)' }} dir="ltr">
                {a.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ blocks ------------------------------ */
function CheckpointMarker({ turn }: { turn: AssistantTurn }) {
  const { t } = useI18n();
  const files = useStore((s) => s.fileContents);
  const restore = useStore((s) => s.restoreCheckpoint);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<'both' | 'code' | 'chat'>('both');
  const checkpoint = turn.checkpoint;
  if (!checkpoint) return null;
  const record = getCheckpoint(checkpoint.id);
  const changed = record ? diffContents(record.files, files).total : 0;
  const count = checkpoint.files;
  const filesLabel = t(count === 1 ? 'checkpoint.fileOne' : 'checkpoint.files', { count });
  const scopes = [
    { value: 'both' as const, label: t('checkpoint.scopeBoth') },
    { value: 'code' as const, label: t('checkpoint.scopeCode') },
    { value: 'chat' as const, label: t('checkpoint.scopeChat') },
  ];
  return (
    <>
      <div className="group flex items-center gap-2 my-2 text-[13px] text-[var(--faint)]">
        <span className="h-px flex-1 border-t border-dashed" style={{ borderColor: 'var(--line-strong)' }} />
        <span className="flex items-center gap-1.5">
          <History size={14} />
          {t('chat.checkpoint')} · {filesLabel}
        </span>
        {record ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-[var(--muted)] hover:text-[var(--text)] px-1"
          >
            {t('chat.restore')}
          </button>
        ) : null}
        <span className="h-px flex-1 border-t border-dashed" style={{ borderColor: 'var(--line-strong)' }} />
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('checkpoint.title')}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Btn>
            <Btn
              variant="primary"
              disabled={!record}
              onClick={() => {
                restore(turn.id, scope);
                setOpen(false);
              }}
            >
              {t('chat.restore')}
            </Btn>
          </>
        }
      >
        <p className="text-[14.5px] text-[var(--muted)] leading-relaxed">
          {t('checkpoint.body', { files: filesLabel, changed })}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {scopes.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer"
              style={{ border: '1px solid var(--line)' }}
            >
              <input
                type="radio"
                name={`scope-${checkpoint.id}`}
                checked={scope === option.value}
                onChange={() => setScope(option.value)}
                className="accent-[var(--accent)]"
              />
              <span className="text-[15px]">{option.label}</span>
            </label>
          ))}
        </div>
      </Dialog>
    </>
  );
}

function RecoveryCard({ turn }: { turn: AssistantTurn }) {
  const { t } = useI18n();
  const restore = useStore((s) => s.restoreCheckpoint);
  const dismiss = useStore((s) => s.dismissRecovery);
  if (!turn.recovery) return null;
  const count = turn.recovery.changed;
  const filesLabel = t(count === 1 ? 'recovery.fileOne' : 'recovery.files', { count });
  return (
    <div
      className="my-2 p-3"
      style={{
        border: '1px solid color-mix(in srgb, var(--warning) 55%, transparent)',
        background: 'color-mix(in srgb, var(--warning) 9%, transparent)',
        borderRadius: 14,
      }}
      role="alert"
    >
      <div className="flex items-center gap-2 font-semibold text-[14.5px]">
        <Undo2 size={17} style={{ color: 'var(--warning)' }} />
        {t('recovery.title')}
      </div>
      <p className="text-[13.5px] text-[var(--muted)] mt-1.5">
        {t('recovery.body', { files: filesLabel })}
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        <Btn size="sm" variant="primary" onClick={() => restore(turn.id, 'code')}>
          {t('recovery.restore')}
        </Btn>
        <Btn size="sm" variant="ghost" onClick={() => dismiss(turn.id)}>
          {t('recovery.keep')}
        </Btn>
      </div>
    </div>
  );
}

const riskTone = (risk: Permission['risk']) =>
  risk === 'high' ? 'danger' : risk === 'medium' ? 'warning' : 'neutral';

function PermissionCard({ perm }: { perm: Permission }) {
  const { t } = useI18n();
  const respond = useStore((s) => s.respondPermission);
  const [showDetails] = useState(true);
  if (perm.decision) {
    return (
      <div className="flex items-center gap-2 my-2 text-[13.5px] text-[var(--muted)]">
        <Shield size={15} />
        <span>
          {perm.decision === 'deny' ? 'Denied' : perm.decision === 'allow-always' ? 'Always allowed' : 'Allowed once'}: {perm.command}
        </span>
      </div>
    );
  }
  return (
    <div
      className="my-3 p-3.5"
      style={{
        border: '1px solid color-mix(in srgb, var(--warning) 55%, transparent)',
        background: 'color-mix(in srgb, var(--warning) 8%, transparent)',
        borderRadius: 16,
      }}
    >
      <div className="flex items-center gap-2 font-semibold text-[15.5px]">
        <Shield size={18} style={{ color: 'var(--warning)' }} />
        {t('chat.permissionNeeded')}
      </div>
      <p className="text-[14.5px] text-[var(--muted)] mt-2 leading-relaxed">{perm.action}</p>
      {showDetails && perm.command ? (
        <div className="mt-2.5 flex items-center gap-2 px-2.5 py-2 rounded-[10px] overflow-x-auto" style={{ background: 'var(--code-bg)', border: '1px solid var(--code-border)' }}>
          <code className="font-mono text-[13.5px] whitespace-nowrap" dir="ltr">{perm.command}</code>
          <button
            type="button"
            aria-label={t('common.copy')}
            className="ms-auto text-[var(--faint)] hover:text-[var(--text)] flex-none"
            onClick={() => void navigator.clipboard?.writeText(perm.command ?? '')}
          >
            <Copy size={14} />
          </button>
        </div>
      ) : null}
      <div className="flex items-center gap-2 mt-2.5">
        <Badge tone={riskTone(perm.risk)}>
          {perm.risk === 'high' ? t('chat.riskHigh') : perm.risk === 'medium' ? t('chat.riskMedium') : t('chat.riskLow')}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <Btn variant="primary" size="sm" onClick={() => respond('allow-once')}>{t('chat.allowOnce')}</Btn>
        <Btn variant="outline" size="sm" onClick={() => respond('allow-always')}>{t('chat.allowAlways')}</Btn>
        <Btn variant="ghost" size="sm" onClick={() => respond('deny')} style={{ color: 'var(--danger)' }}>{t('chat.deny')}</Btn>
      </div>
    </div>
  );
}

function ErrorBlock({ turn }: { turn: AssistantTurn }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const send = useStore((s) => s.send);
  if (!turn.error) return null;
  const noModel = turn.error.code === 'no-model';
  const retry = () => {
    const state = useStore.getState();
    const session = state.sessions.find((s) => s.id === state.activeSessionId);
    const lastUser = session ? [...session.messages].reverse().find((m) => m.kind === 'user') : undefined;
    if (lastUser && lastUser.kind === 'user') send(lastUser.text);
  };
  return (
    <div
      className="my-3 p-3.5"
      style={{
        border: '1px solid color-mix(in srgb, var(--danger) 50%, transparent)',
        background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
        borderRadius: 14,
      }}
    >
      <div className="flex items-center gap-2 font-semibold text-[15.5px]">
        <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
        {turn.error.title}
      </div>
      <p className="text-[14.5px] text-[var(--muted)] mt-1.5">{turn.error.message}</p>
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-[13px] text-[var(--muted)] mt-2 flex items-center gap-1">
        <ChevronDown size={14} style={{ transform: open ? undefined : 'rotate(-90deg)', transition: 'transform .18s' }} />
        {t('chat.details')}
      </button>
      {open ? (
        <pre className="mt-2 p-2.5 rounded-lg overflow-x-auto text-[12.5px]" style={{ background: 'var(--code-bg)', border: '1px solid var(--code-border)' }} dir="ltr">
          {turn.error.details}
        </pre>
      ) : null}
      <div className="flex flex-wrap gap-2 mt-3">
        {noModel ? (
          <>
            <Btn size="sm" variant="primary" onClick={() => navigate('/settings/providers')}>
              {t('model.addKey')}
            </Btn>
            <Btn size="sm" variant="outline" onClick={retry}>
              {t('common.retry')}
            </Btn>
          </>
        ) : (
          <>
            <Btn size="sm" variant="outline" onClick={retry}>{t('common.retry')}</Btn>
            <Btn size="sm" variant="primary" onClick={() => send('Fix the build error')}>{t('chat.askFix')}</Btn>
          </>
        )}
      </div>
    </div>
  );
}

function ReactionRow({ text, onComment }: { text: string; onComment: () => void }) {
  const { t } = useI18n();
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const [badOpen, setBadOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-1 mt-3 text-[var(--muted)]">
      <Tip label={t('chat.edit')} side="top">
        <button type="button" onClick={onComment} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-[var(--hover)]">
          <MessageSquare size={19} />
        </button>
      </Tip>
      <Tip label="Good response" side="top">
        <button
          type="button"
          onClick={() => setVote(vote === 'up' ? null : 'up')}
          className="w-8 h-8 grid place-items-center rounded-lg hover:bg-[var(--hover)]"
          style={vote === 'up' ? { color: 'var(--accent)' } : undefined}
        >
          <ThumbsUp size={19} fill={vote === 'up' ? 'currentColor' : 'none'} />
        </button>
      </Tip>
      <Tip label="Bad response" side="top">
        <button
          type="button"
          onClick={() => { setVote('down'); setBadOpen(true); }}
          className="w-8 h-8 grid place-items-center rounded-lg hover:bg-[var(--hover)]"
          style={vote === 'down' ? { color: 'var(--danger)' } : undefined}
        >
          <ThumbsDown size={19} fill={vote === 'down' ? 'currentColor' : 'none'} />
        </button>
      </Tip>
      <Tip label={copied ? t('chat.copied') : t('chat.copy')} side="top">
        <button
          type="button"
          onClick={() => { void navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
          className="w-8 h-8 grid place-items-center rounded-lg hover:bg-[var(--hover)]"
        >
          {copied ? <Check size={19} /> : <Copy size={19} />}
        </button>
      </Tip>
      <Dialog open={badOpen} onClose={() => setBadOpen(false)} title="What went wrong?" width={400}>
        <div className="flex flex-wrap gap-2">
          {['Incorrect', 'Incomplete', 'Too slow', 'Other'].map((r) => (
            <button key={r} type="button" className="chip" onClick={() => setBadOpen(false)}>{r}</button>
          ))}
        </div>
        <textarea className="area mt-3" rows={3} placeholder="Tell us more (optional)" />
        <div className="flex justify-end mt-3">
          <Btn variant="primary" size="sm" onClick={() => setBadOpen(false)}>{t('common.save')}</Btn>
        </div>
      </Dialog>
    </div>
  );
}

function AssistantMessage({ turn, onComment }: { turn: AssistantTurn; onComment: () => void }) {
  const { t } = useI18n();
  const toggle = useStore((s) => s.toggleTurn);
  const send = useStore((s) => s.send);
  const now = useNow(500, turn.running);
  const dur = turn.durationMs ?? now - turn.startedAt;
  const header = turn.running
    ? t('chat.workingFor', { time: fmtDur(dur) })
    : turn.stopped
      ? t('chat.stopped', { time: fmtDur(dur) })
      : t('chat.workedFor', { time: fmtDur(dur) });

  return (
    <div className="animate-fadeUp">
      {turn.checkpoint ? <CheckpointMarker turn={turn} /> : null}
      <button
        type="button"
        onClick={() => toggle(turn.id, !turn.collapsed)}
        aria-expanded={!turn.collapsed}
        className="flex items-center gap-1.5 py-1 text-[17px] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
      >
        <span>{header}</span>
        <ChevronDown size={16} style={{ transform: turn.collapsed ? 'rotate(-90deg)' : undefined, transition: 'transform .2s var(--ease-out)' }} />
      </button>
      <div className={clsx('runbody', turn.collapsed && 'collapsed')}>
        <div className="inner">
          <div className="pt-1">
            {turn.blocks.map((b) =>
              b.type === 'text' ? (
                <div key={b.id} className="my-3.5">
                  <Markdown text={b.text} />
                  {turn.running && b === turn.blocks[turn.blocks.length - 1] ? (
                    <span className="inline-block w-[2px] h-[1.1em] align-text-bottom ms-0.5" style={{ background: 'var(--accent)', animation: 'caret 1s steps(1) infinite' }} />
                  ) : null}
                </div>
              ) : (
                <ActivityGroup key={b.id} group={b.group} />
              ),
            )}
          </div>
          {turn.permission ? <PermissionCard perm={turn.permission} /> : null}
          {turn.banner ? (
            <div
              className="my-2 flex items-start gap-2 px-3 py-2 rounded-xl text-[13.5px]"
              style={{
                border: '1px solid color-mix(in srgb, var(--warning) 55%, transparent)',
                background: 'color-mix(in srgb, var(--warning) 10%, transparent)',
              }}
              role="status"
            >
              <AlertTriangle size={16} style={{ color: 'var(--warning)', flex: 'none', marginTop: 1 }} />
              <span>{turn.banner}</span>
            </div>
          ) : null}
          <ErrorBlock turn={turn} />
          <RecoveryCard turn={turn} />
        </div>
      </div>
      {turn.final ? (
        <div className="mt-2">
          <Markdown text={turn.final} />
        </div>
      ) : null}
      {!turn.running && !turn.error && turn.final ? (
        <>
          {turn.followUps.length ? (
            <div className="flex flex-wrap gap-2 mt-4">
              {turn.followUps.map((f, i) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => send(f)}
                  className="btn btn-outline btn-sm animate-fadeUp"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {f}
                </button>
              ))}
            </div>
          ) : null}
          <ReactionRow text={turn.final} onComment={onComment} />
        </>
      ) : null}
      {turn.running && !(turn.permission && !turn.permission.decision) ? (
        <div className="flex items-center gap-2 mt-3 text-[13.5px] text-[var(--muted)]">
          <span className="spinner accent" />
          <span className="shimmer">{t('chat.thinking')}</span>
        </div>
      ) : null}
      <style>{`@keyframes caret{50%{opacity:0}}`}</style>
    </div>
  );
}

function UserMessage({ msg }: { msg: Message & { kind: 'user' } }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(msg.text);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const setDraft = useStore((s) => s.setDraft);
  const toast = useStore((s) => s.toast);
  const long = msg.text.split('\n').length > 8;

  return (
    <div className="group flex flex-col items-end mb-1.5">
      <div
        className="max-w-[88%] px-3.5 py-2.5 text-[16px] leading-[1.5] whitespace-pre-wrap break-words"
        dir="auto"
        style={{
          background: 'var(--elevated)',
          border: '1px solid var(--line-strong)',
          borderRadius: 16,
          unicodeBidi: 'plaintext',
          display: '-webkit-box',
          WebkitLineClamp: long && !expanded ? 8 : 'unset',
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {editing ? (
          <div className="w-[min(72vw,520px)]">
            <textarea className="area" rows={3} value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
            <div className="flex justify-end gap-2 mt-2">
              <Btn size="sm" variant="ghost" onClick={() => { setEditing(false); setValue(msg.text); }}>{t('common.cancel')}</Btn>
              <Btn size="sm" variant="primary" onClick={() => { setEditing(false); toast('Conversation forked from this point', 'Undo'); }}>{t('common.save')}</Btn>
            </div>
          </div>
        ) : (
          msg.text
        )}
      </div>
      {long ? (
        <button type="button" className="text-[12.5px] text-[var(--muted)] mt-1" onClick={() => setExpanded((v) => !v)}>
          {expanded ? t('chat.showLess') : t('chat.showMore')}
        </button>
      ) : null}
      <div className="flex items-center gap-2 mt-1 text-[var(--faint)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        <Tip label={t('chat.edit')} side="top">
          <button type="button" aria-label={t('chat.edit')} onClick={() => setEditing(true)} className="hover:text-[var(--text)]">
            <Pencil size={16} />
          </button>
        </Tip>
        <Tip label={t('chat.restoreHere')} side="top">
          <button type="button" aria-label={t('chat.restoreHere')} onClick={() => toast('Restore point selected')} className="hover:text-[var(--text)]">
            <Undo2 size={16} />
          </button>
        </Tip>
        <Tip label={copied ? t('chat.copied') : t('chat.copy')} side="top">
          <button
            type="button"
            aria-label={t('chat.copy')}
            onClick={() => { void navigator.clipboard?.writeText(msg.text); setCopied(true); setTimeout(() => setCopied(false), 1200); setDraft(''); }}
            className="hover:text-[var(--text)]"
          >
            {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
          </button>
        </Tip>
      </div>
    </div>
  );
}

/* ------------------------------ list ------------------------------ */
export function ChatEmpty() {
  const { t } = useI18n();
  const setDraft = useStore((s) => s.setDraft);
  const cards = [t('chat.suggest1'), t('chat.suggest2'), t('chat.suggest3'), t('chat.suggest4')];
  return (
    <div className="h-full flex flex-col items-center justify-center px-5 py-10 text-center">
      <div className="opacity-70 mb-4">
        <Logo size={48} />
      </div>
      <h2 className="text-[22px] font-bold tracking-[-.01em]">{t('chat.whatBuild')}</h2>
      <p className="text-[14.5px] text-[var(--muted)] mt-1.5 max-w-[300px]">{t('chat.emptySub')}</p>
      <div className="grid grid-cols-2 gap-2 mt-6 w-full max-w-[420px]">
        {cards.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setDraft(c)}
            className="card p-3 text-[14px] text-start hover:-translate-y-px transition-transform min-h-[64px]"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MissionBanner() {
  const session = useStore((s) => s.sessions.find((x) => x.id === s.activeSessionId));
  const stop = useStore((s) => s.stop);
  if (!session || session.mode !== 'mission' || session.status !== 'running') return null;
  return (
    <div className="mx-3 mb-1 flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'var(--elevated)', border: '1px solid var(--line-strong)' }}>
      <Sparkles size={16} style={{ color: 'var(--accent)' }} />
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] truncate">Mission: ship the multi-page build</div>
        <div className="mt-1"><Progress value={34} /></div>
      </div>
      <span className="text-[12.5px] text-[var(--muted)] whitespace-nowrap">step 3/9 · 4m</span>
      <Btn size="sm" variant="outline" onClick={stop}>Pause</Btn>
    </div>
  );
}

export function MessageList() {
  const { t } = useI18n();
  const messages = useStore((s) => s.sessions.find((x) => x.id === s.activeSessionId)?.messages ?? []);
  const running = useStore((s) => s.sessions.find((x) => x.id === s.activeSessionId)?.status === 'running');
  const ref = useRef<HTMLDivElement>(null);
  const [showScroll, setShowScroll] = useState(false);
  const near = useRef(true);
  const toast = useStore((s) => s.toast);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      near.current = dist < 80;
      setShowScroll(dist > 120);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (el && near.current) el.scrollTo({ top: el.scrollHeight });
  }, [messages]);

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={ref}
        role="log"
        aria-live="polite"
        className="h-full overflow-y-auto overflow-x-hidden px-[18px] pt-1.5 pb-8"
        style={{ overscrollBehavior: 'contain' }}
      >
        {messages.length === 0 ? (
          <ChatEmpty />
        ) : (
          <div className="max-w-[760px] mx-auto">
            {messages.map((m) =>
              m.kind === 'user' ? (
                <UserMessage key={m.id} msg={m} />
              ) : (
                <AssistantMessage key={m.id} turn={m.turn} onComment={() => toast('Comment added to this answer')} />
              ),
            )}
            {running ? (
              <div className="flex items-center gap-2 py-2 text-[13.5px] text-[var(--muted)]">
                <Square size={13} style={{ color: 'var(--accent)' }} />
                <span>{t('chat.stop')}: Esc</span>
              </div>
            ) : null}
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="Scroll to bottom"
        onClick={() => {
          const el = ref.current;
          if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }}
        className="absolute left-1/2 -translate-x-1/2 bottom-3 w-10 h-10 rounded-full grid place-items-center transition-all"
        style={{
          background: 'var(--elevated)',
          border: '1.5px solid var(--line-strong)',
          boxShadow: '0 3px 0 var(--edge)',
          opacity: showScroll ? 1 : 0,
          pointerEvents: showScroll ? 'auto' : 'none',
          transform: `translate(-50%, ${showScroll ? '0' : '6px'})`,
        }}
      >
        <ArrowDown size={18} />
      </button>
    </div>
  );
}

export function PermissionToastWatcher() {
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.activeSessionId);
  const toast = useStore((s) => s.toast);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    sessions.forEach((s) => {
      if (s.id === active) return;
      const last = [...s.messages].reverse().find((m) => m.kind === 'assistant');
      if (last && last.kind === 'assistant' && last.turn.permission && !last.turn.permission.decision) {
        const id = last.turn.permission.id;
        if (!seen.current.has(id)) {
          seen.current.add(id);
          toast('Permission needed in another session');
        }
      }
    });
  }, [sessions, active, toast]);
  return null;
}
