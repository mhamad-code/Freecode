import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { Badge, Btn } from './ui';

export type RuntimeState = 'full' | 'limited' | 'unsupported';

function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  const match = (pattern: RegExp) => pattern.exec(ua)?.[1];
  if (/Edg\//.test(ua)) return `Edge ${match(/Edg\/(\d+)/) ?? ''}`.trim();
  if (/OPR\//.test(ua)) return `Opera ${match(/OPR\/(\d+)/) ?? ''}`.trim();
  if (/Firefox\//.test(ua)) return `Firefox ${match(/Firefox\/(\d+)/) ?? ''}`.trim();
  if (/Chrome\//.test(ua)) return `Chrome ${match(/Chrome\/(\d+)/) ?? ''}`.trim();
  if (/Safari\//.test(ua)) return `Safari ${match(/Version\/([\d.]+)/) ?? ''}`.trim();
  return 'unknown';
}

export interface RuntimeInfo {
  isolated: boolean;
  sab: boolean;
  browser: string;
  state: RuntimeState;
  reason: string;
}

export function runtimeStatus(): RuntimeInfo {
  const isolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
  const sab = typeof SharedArrayBuffer !== 'undefined';
  const state: RuntimeState = isolated && sab ? 'full' : sab ? 'limited' : 'unsupported';
  const reason =
    state === 'full'
      ? 'Cross-origin isolation is active; full runtime features are available.'
      : !sab
        ? 'This browser does not expose SharedArrayBuffer, so the sandboxed runtime cannot start.'
        : 'The page is not cross-origin isolated. COOP/COEP headers are missing or a cross-origin resource blocked them.';
  return { isolated, sab, browser: detectBrowser(), state, reason };
}

export function runtimeIsLimited(): boolean {
  return runtimeStatus().state !== 'full';
}

export function RuntimeStatus() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const info = runtimeStatus();
  const tone = info.state === 'full' ? 'accent' : info.state === 'limited' ? 'warning' : 'danger';
  return (
    <div className="py-3.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[16px]">{t('runtime.status')}</div>
          <p className="text-[13.5px] text-[var(--muted)] mt-0.5 leading-snug">{info.reason}</p>
        </div>
        <Badge tone={tone}>{t(`runtime.state.${info.state}`)}</Badge>
        <Btn size="sm" variant="outline" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? t('runtime.hide') : t('runtime.show')}
        </Btn>
      </div>
      {open ? (
        <dl className="mt-3 grid grid-cols-[minmax(0,1fr),auto] gap-x-3 gap-y-1.5 text-[13px]">
          <dt className="text-[var(--muted)]">crossOriginIsolated</dt>
          <dd className="font-mono" dir="ltr">{String(info.isolated)}</dd>
          <dt className="text-[var(--muted)]">SharedArrayBuffer</dt>
          <dd className="font-mono" dir="ltr">{String(info.sab)}</dd>
          <dt className="text-[var(--muted)]">{t('runtime.browser')}</dt>
          <dd dir="ltr">{info.browser}</dd>
        </dl>
      ) : null}
    </div>
  );
}

export function RuntimeBanner() {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem('fc.runtimeDismissed') === '1';
    } catch {
      return false;
    }
  });

  if (!runtimeIsLimited() || hidden) return null;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 text-[13px]"
      style={{
        background: 'color-mix(in srgb, var(--warning) 14%, var(--panel))',
        borderBottom: '1px solid color-mix(in srgb, var(--warning) 32%, var(--line))',
      }}
      role="status"
    >
      <Info size={15} style={{ color: 'var(--warning)' }} className="flex-none" />
      <span className="flex-1 min-w-0">{t('runtime.limited')}</span>
      <button
        type="button"
        className="text-[12.5px] underline flex-none"
        onClick={() => window.alert(t('runtime.why'))}
      >
        {t('runtime.whyTitle')}
      </button>
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={() => {
          setHidden(true);
          try {
            sessionStorage.setItem('fc.runtimeDismissed', '1');
          } catch {
            // ignore
          }
        }}
        className="flex-none text-[var(--muted)]"
      >
        <X size={15} />
      </button>
    </div>
  );
}
