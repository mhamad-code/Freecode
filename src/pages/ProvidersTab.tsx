import { useState } from 'react';
import { ChevronDown, ClipboardCheck, Copy, KeyRound, Plus, RefreshCw, Trash2, Zap } from 'lucide-react';
import { useStore } from '../store';
import { useI18n } from '../lib/i18n';
import { Badge, Btn, Dialog, Input, PageTitle, SectionTitle, SettingCard, Switch, useNow } from '../components/ui';
import { PRESETS, type Preset } from '../engine/providers/builtin/presets';
import type { ProviderConfig } from '../engine/providers/types';
import {
  addPreset,
  clearProviderFailure,
  loadProviders,
  providerStatus,
  putProviderKey,
  recordProviderFailure,
  removeProviderKey,
  saveProviders,
} from '../lib/providersStore';
import { testProviderConnection, type ProviderTestResult } from '../lib/modelProbe';
import { catalogUrl, diagnosticsReport, type Diagnostic } from '../lib/providerDiagnostics';
import { estimateRemaining } from '../lib/requestCounter';
import { VaultSaveError } from '../storage/vaultDiagnostics';
import type { LiteSetting } from '../engine/providers/lite';
import { getLiteSetting, setLiteSetting } from '../lib/liteMode';

export default function ProvidersTab() {
  const { t } = useI18n();
  const toast = useStore((s) => s.toast);
  const now = useNow(1000, true);
  const [configs, setConfigs] = useState<ProviderConfig[]>(() => loadProviders());
  const [busy, setBusy] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [keyValue, setKeyValue] = useState('');
  const [diagnostics, setDiagnostics] = useState<Record<string, Diagnostic | undefined>>({});
  const [lite, setLite] = useState<LiteSetting>(() => getLiteSetting());

  const persist = (next: ProviderConfig[]) => {
    setConfigs(next);
    saveProviders(next);
  };

  const diagText = (diag: Diagnostic): string => {
    switch (diag.kind) {
      case 'ok':
        return t('providers.diag.ok');
      case 'cors':
        return t('providers.diag.cors');
      case 'network':
        return t('providers.diag.network');
      case 'auth':
        return t('providers.diag.auth');
      case 'rate':
        return t('providers.diag.rate', { s: String(Math.ceil((diag.retryAfterMs ?? 60000) / 1000)) });
      case 'server':
        return t('providers.diag.server', { status: String(diag.status ?? 500) });
      case 'timeout':
        return t('providers.diag.timeout');
      case 'needs-key':
        return t('providers.needsKey');
      case 'failed':
        return diag.detail
          ? t('providers.diag.failed', { error: diag.detail.slice(0, 220) })
          : t('providers.diag.failed', { error: t('providers.test') });
      default:
        return t('providers.diag.http', { status: String(diag.status ?? '') });
    }
  };

  const test = async (id: string): Promise<ProviderTestResult> => {
    setBusy(id);
    try {
      const result = await testProviderConnection(id);
      if (result.state === 'ok' || result.state === 'connection-only') {
        persist(clearProviderFailure(loadProviders(), id));
        setDiagnostics((d) => ({ ...d, [id]: undefined }));
        toast(
          result.state === 'ok'
            ? t('providers.testedModel', { model: result.modelId ?? '' })
            : t('providers.testNoModel'),
        );
        return result;
      }
      const provider = loadProviders().find((p) => p.id === id);
      const diag: Diagnostic =
        result.diagnostic ?? {
          kind: result.state === 'needs-key' ? 'needs-key' : 'failed',
          at: Date.now(),
          url: provider ? catalogUrl(provider) : '',
          detail: result.error,
        };
      const next = recordProviderFailure(loadProviders(), id, diag);
      persist(next);
      setDiagnostics((d) => ({ ...d, [id]: diag }));
      toast(diagText(diag));
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast(t('providers.failed', { code: message }));
      return { state: 'failed', models: 0, error: message };
    } finally {
      setBusy(null);
    }
  };

  const copyDiagnostics = async (config: ProviderConfig) => {
    const report = diagnosticsReport(config, diagnostics[config.id]);
    try {
      await navigator.clipboard.writeText(report);
      toast(t('providers.diagnosticsCopied'));
    } catch {
      toast(report.split('\n').slice(0, 4).join(' · '));
    }
  };

  const save = async () => {
    if (!preset) return;
    const next = addPreset(configs, preset);
    const added = next[next.length - 1];
    persist(next);
    setAddOpen(false);
    setPreset(null);
    const value = keyValue.trim();
    setKeyValue('');
    if (!value) {
      await test(added.id);
      return;
    }
    // The key is stored first and independently of any connection test.
    try {
      await putProviderKey(added.id, value);
    } catch (err) {
      const code = err instanceof VaultSaveError ? err.code : 'write';
      toast(t('providers.keyFailedCode', { reason: t(`vault.${code}`) }));
      setConfigs(loadProviders());
      return;
    }
    setConfigs(loadProviders());
    const result = await test(added.id);
    if (result.state === 'ok' && result.modelId) {
      // A new provider starts with its own tested default model.
      useStore.getState().setModel(result.modelId);
    } else {
      toast(t('providers.keySavedUntested'));
    }
  };

  const remove = async (id: string) => {
    await removeProviderKey(id).catch(() => undefined);
    persist(configs.filter((c) => c.id !== id));
  };

  const changeLite = (value: LiteSetting) => {
    setLite(value);
    setLiteSetting(value);
  };

  const builtin = configs.filter((c) => c.kind === 'builtin-free' && c.id !== 'ovh-anon');
  const moreFree = configs.filter((c) => c.kind === 'builtin-free' && c.id === 'ovh-anon');
  const custom = configs.filter((c) => c.kind !== 'builtin-free');

  const card = (config: ProviderConfig) => {
    const status = providerStatus(config);
    const diag = diagnostics[config.id];
    const cooldownLeft = Math.max(
      0,
      Math.ceil(((config.cooldownUntil ?? 0) - now) / 1000),
    );
    const cooling = cooldownLeft > 0;
    const remaining = estimateRemaining(config.id, config.limits?.perHour, now);
    const badge =
      cooling
        ? { tone: 'warning' as const, label: t('providers.cooldown', { s: String(cooldownLeft) }) }
        : config.lastDiagnostic?.kind === 'auth'
          ? { tone: 'danger' as const, label: t('providers.needsKey') }
          : { tone: status === 'ready' ? ('accent' as const) : status === 'disabled' ? ('neutral' as const) : ('danger' as const), label: t(`providers.${status}`) };
    return (
      <div key={config.id} className="card p-3.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-9 h-9 rounded-[10px] grid place-items-center flex-none" style={{ background: 'var(--elevated)', border: '1px solid var(--line)' }}>
            <Zap size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[15.5px] font-semibold truncate">{config.label}</span>
              {config.kind === 'builtin-free' ? <Badge tone="info">{t('providers.free')}</Badge> : null}
              {config.id === 'ovh-anon' ? <Badge>{t('providers.chatOnly')}</Badge> : null}
              {config.lastDiagnostic && config.lastDiagnostic.kind !== 'ok' ? (
                <Badge tone="warning">{t('providers.unverified')}</Badge>
              ) : null}
              <Badge tone={badge.tone}>{badge.label}</Badge>
            </div>
            <div className="text-[12.5px] text-[var(--muted)] mt-0.5">
              {t('providers.models', { n: String(config.models.length) })}
              {config.keys.length ? ` · ${config.keys.length} ${t('providers.keys')}` : ''}
              {remaining !== undefined ? ` · ${t('providers.requestsLeft', { n: String(remaining) })}` : ''}
            </div>
          </div>
          <Btn size="sm" variant="outline" onClick={() => void test(config.id)} disabled={busy === config.id || cooling}>
            <RefreshCw size={14} className={busy === config.id ? 'animate-spin' : undefined} />
            {cooling ? t('providers.cooldown', { s: String(cooldownLeft) }) : t('providers.test')}
          </Btn>
          <button
            type="button"
            onClick={() => void copyDiagnostics(config)}
            className="chip h-8 gap-1.5 text-[12.5px]"
            aria-label={t('providers.copyDiagnostics')}
            title={t('providers.copyDiagnostics')}
          >
            {config.lastDiagnostic ? <ClipboardCheck size={14} /> : <Copy size={14} />}
            <span className="hidden sm:inline">{t('providers.copyDiagnostics')}</span>
          </button>
          <Switch
            checked={config.enabled}
            onChange={() => persist(configs.map((c) => (c.id === config.id ? { ...c, enabled: !c.enabled } : c)))}
            label={config.label}
          />
        </div>
        {diag ? (
          <div className="mt-2 text-[12.5px]" style={{ color: diag.kind === 'ok' ? 'var(--muted)' : 'var(--danger)' }}>
            {diagText(diag)}
            {diag.status ? ` · HTTP ${diag.status}` : ''}
            <button type="button" className="underline ms-2" onClick={() => void test(config.id)}>
              {t('providers.retryTest')}
            </button>
          </div>
        ) : null}
        {config.kind !== 'builtin-free' ? (
          <div className="flex justify-end mt-2">
            <Btn size="sm" variant="ghost" onClick={() => void remove(config.id)}>
              <Trash2 size={14} />
              {t('common.remove')}
            </Btn>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="max-w-[720px]">
      <PageTitle>{t('settings.providers')}</PageTitle>

      <div className="flex items-start gap-2 card p-3.5 mb-4">
        <KeyRound size={18} className="text-[var(--muted)] mt-0.5 flex-none" />
        <p className="text-[13.5px] text-[var(--muted)]">{t('providers.stored')}</p>
      </div>

      <div className="card p-3.5 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14.5px] font-semibold">{t('lite.title')}</span>
          <div className="ms-auto flex gap-1" role="group" aria-label={t('lite.title')}>
            {(['auto', 'on', 'off'] as LiteSetting[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => changeLite(value)}
                aria-pressed={lite === value}
                className="chip h-8 px-2.5 text-[12.5px]"
                style={lite === value ? { borderColor: 'var(--accent)', color: 'var(--text)' } : undefined}
              >
                {t(`lite.${value}`)}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[12.5px] text-[var(--muted)] mt-1.5">{t('lite.desc')}</p>
        <p className="text-[12.5px] text-[var(--muted)] mt-1">{t('lite.autoHint')}</p>
      </div>

      <p className="text-[12.5px] text-[var(--muted)] mb-3">{t('providers.freeConsent')}</p>

      <SectionTitle icon={<Zap size={18} />} title={t('providers.builtin')} />
      <div className="flex flex-col gap-2 mt-2">{builtin.map(card)}</div>

      {moreFree.length ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className="flex items-center gap-1.5 text-[13.5px] text-[var(--muted)] hover:text-[var(--text)]"
          >
            <ChevronDown size={15} style={{ transform: moreOpen ? undefined : 'rotate(-90deg)', transition: 'transform .18s' }} />
            {t('providers.moreFree')}
          </button>
          {moreOpen ? <div className="flex flex-col gap-2 mt-2">{moreFree.map(card)}</div> : null}
        </div>
      ) : null}

      <div className="mt-6 flex items-center gap-2">
        <SectionTitle icon={<KeyRound size={18} />} title={t('providers.yourProviders')} className="flex-1" />
        <Btn size="sm" variant="inverse" onClick={() => setAddOpen(true)}>
          <Plus size={15} />
          {t('providers.add')}
        </Btn>
      </div>
      <div className="flex flex-col gap-2 mt-2">
        {custom.length ? (
          custom.map(card)
        ) : (
          <SettingCard>
            <div className="py-3 text-[13.5px] text-[var(--muted)]">{t('providers.empty')}</div>
          </SettingCard>
        )}
      </div>

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('providers.add')}
        width={520}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setAddOpen(false)}>
              {t('common.cancel')}
            </Btn>
            <Btn variant="primary" disabled={!preset} onClick={() => void save()}>
              {t('common.save')}
            </Btn>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p)}
              className="card p-2.5 text-start"
              style={{ borderColor: preset?.id === p.id ? 'var(--accent)' : undefined }}
            >
              <div className="text-[14.5px] font-semibold">{p.label}</div>
              <div className="text-[12px] text-[var(--muted)] truncate" dir="ltr">
                {p.baseUrl}
              </div>
            </button>
          ))}
        </div>
        {preset ? (
          <div className="mt-3">
            <label className="text-[13.5px] text-[var(--muted)]">{preset.keyLabel}</label>
            <Input
              value={keyValue}
              onValueChange={setKeyValue}
              type="password"
              placeholder="sk-…"
              className="mt-1 font-mono"
            />
            {preset.note ? <p className="text-[12.5px] text-[var(--muted)] mt-1.5">{preset.note}</p> : null}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
