import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export function runtimeIsLimited(): boolean {
  const isolated = typeof crossOriginIsolated === 'boolean' && crossOriginIsolated;
  const sab = typeof SharedArrayBuffer !== 'undefined';
  return !(isolated && sab);
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
