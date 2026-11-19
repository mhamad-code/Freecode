import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Check, ChevronDown, CircleHelp, Search, X } from 'lucide-react';
import logoUrl from '../assets/brand/logo.png';
import markLight from '../assets/brand/logo-mark-light.png';
import markDark from '../assets/brand/logo-mark-dark.png';
import { useStore } from '../store';
import { useI18n } from '../lib/i18n';
import { Popover } from './Popover';

/* ------------------------------- buttons ------------------------------- */
type BtnVariant = 'default' | 'primary' | 'inverse' | 'outline' | 'danger' | 'ghost';

export function Btn({
  variant = 'default',
  size,
  block,
  loading,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: 'sm' | 'lg';
  block?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={clsx(
        'btn',
        variant !== 'default' && `btn-${variant}`,
        size === 'sm' && 'btn-sm',
        size === 'lg' && 'btn-lg',
        block && 'btn-block',
        className,
      )}
    >
      {loading ? <span className="spinner accent" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function IBtn({
  active,
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={clsx('ibtn', active && 'active', className)}
    >
      {children}
    </button>
  );
}

/* ------------------------------- fields ------------------------------- */
export function Input({
  icon,
  value,
  onValueChange,
  clearable,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  value: string;
  onValueChange?: (v: string) => void;
  clearable?: boolean;
}) {
  return (
    <div className={clsx('input', className)}>
      {icon ? <span className="text-[var(--faint)] flex none">{icon}</span> : null}
      <input {...rest} value={value} onChange={(e) => onValueChange?.(e.target.value)} />
      {clearable && value ? (
        <button
          type="button"
          aria-label="Clear"
          onClick={() => onValueChange?.('')}
          className="text-[var(--faint)] hover:text-[var(--text)] grid place-items-center"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}

export function SearchInput(props: { value: string; onValueChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <Input
      icon={<Search size={18} />}
      value={props.value}
      onValueChange={props.onValueChange}
      placeholder={props.placeholder}
      clearable
      aria-label={props.placeholder}
      className={props.className}
    />
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="sw"
      onClick={() => onChange(!checked)}
    />
  );
}

export function Badge({
  tone = 'neutral',
  dot,
  children,
}: {
  tone?: 'neutral' | 'accent' | 'warning' | 'danger' | 'info';
  dot?: boolean;
  children?: ReactNode;
}) {
  return (
    <span className={clsx('badge', tone !== 'neutral' && `badge-${tone}`)}>
      {dot ? <span className="w-2 h-2 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export function Chip({
  active,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button type="button" aria-pressed={active} className={clsx('chip', active && 'on', className)} {...rest}>
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size,
  className,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'lg';
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={clsx('seg', size === 'lg' && 'seg-lg', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------- overlay ------------------------------- */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = 460,
  sheet,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
  sheet?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div
      className={clsx('fixed inset-0 flex justify-center p-4', sheet ? 'items-end sm:items-center' : 'items-center')}
      style={{ zIndex: 'var(--z-dialog)' }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'var(--scrim)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className="popover-surface relative w-full animate-popIn flex flex-col overflow-hidden"
        style={{
          maxWidth: width,
          maxHeight: 'calc(100dvh - 32px)',
          borderRadius: sheet ? '18px 18px 12px 12px' : 18,
        }}
      >
        {sheet ? <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-[var(--line-strong)]" /> : null}
        {title ? (
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
            <h2 className="text-[18px] font-semibold">{title}</h2>
            <IBtn label="Close" onClick={onClose} className="w-8 h-8">
              <X size={18} />
            </IBtn>
          </div>
        ) : null}
        <div className="px-5 pb-4 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer ? <div className="px-5 py-4 border-t border-[var(--line)] flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function Menu({
  trigger,
  children,
  align = 'end',
  width = 230,
  className,
  side = 'auto',
  header,
  panelClassName,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
  width?: number;
  className?: string;
  side?: 'top' | 'bottom' | 'auto';
  header?: ReactNode;
  panelClassName?: string;
}) {
  return (
    <Popover
      trigger={trigger}
      align={align}
      side={side}
      width={width}
      maxWidth={Math.min(360, Math.max(width, 240))}
      header={header}
      className={className}
      panelClassName={clsx('p-1', panelClassName)}
      closeOnSelect
    >
      {children}
    </Popover>
  );
}

export function MenuItem({
  icon,
  shortcut,
  danger,
  children,
  onClick,
}: {
  icon?: ReactNode;
  shortcut?: string;
  danger?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2.5 h-10 rounded-[9px] text-[15px] text-start hover:bg-[var(--hover)]"
      style={danger ? { color: 'var(--danger)' } : undefined}
    >
      {icon ? <span className="text-[var(--muted)] flex none">{icon}</span> : null}
      <span className="flex-1 truncate">{children}</span>
      {shortcut ? <Kbd>{shortcut}</Kbd> : null}
    </button>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <span className="kbd">{children}</span>;
}

export function Tip({ label, children, side = 'right' }: { label: string; children: ReactNode; side?: 'right' | 'top' | 'bottom' }) {
  return (
    <span className="relative inline-flex group/tip">
      {children}
      <span
        role="tooltip"
        className={clsx(
          'popover-surface z-popover pointer-events-none absolute hidden whitespace-nowrap rounded-lg px-2 py-1 text-[12.5px] group-hover/tip:block group-focus-within/tip:block',
          side === 'right' && 'left-full top-1/2 -translate-y-1/2 ms-2',
          side === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
          side === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-2',
        )}
        style={{ transitionDelay: '400ms' }}
      >
        {label}
      </span>
    </span>
  );
}

export function Progress({ value, tone, height = 6 }: { value: number; tone?: 'accent' | 'muted' | 'danger' | 'warning'; height?: number }) {
  const bg = tone === 'muted' ? 'var(--faint)' : tone === 'danger' ? 'var(--danger)' : tone === 'warning' ? 'var(--warning)' : 'var(--accent)';
  return (
    <div
      className="w-full overflow-hidden"
      style={{ height, borderRadius: height / 2, background: 'var(--elevated)', boxShadow: 'inset 0 1px 0 var(--edge)' }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: bg, borderRadius: height / 2, transition: 'width .4s var(--ease-out)' }} />
    </div>
  );
}

export function SectionTitle({
  icon,
  title,
  help,
  className,
}: {
  icon: ReactNode;
  title: string;
  help?: string;
  className?: string;
}) {
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <span className="text-[var(--muted)] grid place-items-center">{icon}</span>
      <h3 className="text-[17px] font-semibold leading-tight whitespace-nowrap">{title}</h3>
      {help ? (
        <Tip label={help} side="top">
          <button type="button" aria-label={help} className="text-[var(--faint)] hover:text-[var(--muted)]">
            <CircleHelp size={16} />
          </button>
        </Tip>
      ) : null}
    </div>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <img
      src={logoUrl}
      width={size}
      height={size}
      alt="Freecode"
      style={{ borderRadius: Math.max(6, size * 0.28), imageRendering: 'auto', flex: 'none' }}
    />
  );
}

export function LogoMark({ size = 22 }: { size?: number }) {
  const mode = useStore((s) => s.themeId);
  const light = mode !== 'light' && mode !== 'dune' && mode !== 'blossom';
  return <img src={light ? markLight : markDark} width={size} height={size} alt="" style={{ flex: 'none' }} />;
}

export function Spinner({ accent }: { accent?: boolean }) {
  return <span className={clsx('spinner', accent && 'accent')} aria-hidden />;
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-10 px-6">
      {icon ? <div className="text-[var(--faint)]">{icon}</div> : null}
      <div className="text-[17px] font-semibold">{title}</div>
      {text ? <p className="text-[14.5px] text-[var(--muted)] max-w-[300px] leading-relaxed">{text}</p> : null}
      {action}
    </div>
  );
}

export function ToastHost() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  const { dir } = useI18n();
  return createPortal(
    <div
      className="z-toast fixed flex flex-col items-center gap-2 pointer-events-none"
      style={{ bottom: 'calc(24px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', direction: dir }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="popover-surface pointer-events-auto animate-fadeUp flex items-center gap-3 px-3.5 py-2.5 text-[14.5px]"
          style={{ borderRadius: 14, maxWidth: 'min(92vw, 420px)' }}
        >
          <span className="flex-1">{t.text}</span>
          {t.action ? (
            <button
              type="button"
              className="font-semibold text-[var(--accent)] hover:underline"
              onClick={() => {
                t.onAction?.();
                dismiss(t.id);
              }}
            >
              {t.action}
            </button>
          ) : null}
          <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-[var(--faint)] hover:text-[var(--text)]">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}

/* ------------------------------- helpers ------------------------------- */
export function useNow(interval = 500, active = true) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [interval, active]);
  return now;
}

export const fmtDur = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return m ? `${m}m ${r}s` : `${r}s`;
};

export function CheckMark({ checked }: { checked?: boolean }) {
  return checked ? <Check size={16} className="text-[var(--accent)]" /> : null;
}

export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <div className="flex-1 min-w-0">
        <div className="text-[16px]">{label}</div>
        {hint ? <p className="text-[13.5px] text-[var(--muted)] mt-0.5 leading-snug">{hint}</p> : null}
      </div>
      <div className="flex-none flex items-center gap-2">{children}</div>
    </div>
  );
}

export function SettingCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('card px-4', className)}>
      <div className="divide-y divide-[var(--line)]">{children}</div>
    </div>
  );
}

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h1 className="text-[28px] font-bold leading-tight tracking-[-.01em]">{children}</h1>
      {actions}
    </div>
  );
}

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const fn = () => setMatch(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [query]);
  return match;
}

export const NavContext = createContext<{ navigate: (path: string) => void }>({ navigate: () => {} });
export const useNav = () => useContext(NavContext);

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return { copied, copy };
}

export function SegmentChevron() {
  return <ChevronDown size={16} className="text-[var(--muted)]" />;
}

export function useAutoScroll<T extends HTMLElement>(deps: unknown[]) {
  const ref = useRef<T>(null);
  const near = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      near.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (el && near.current) el.scrollTop = el.scrollHeight;
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

export function useCountUp(target: number, active = true, duration = 600) {
  const [v, setV] = useState(0);
  const reduced = useStore((s) => s.settings.reduceMotion);
  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setV(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration, reduced]);
  return v;
}
