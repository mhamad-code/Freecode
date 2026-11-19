import { useState } from 'react';
import { KeyRound, Plus, RefreshCw, Trash2, Zap } from 'lucide-react';
import { useStore } from '../store';
import { useI18n } from '../lib/i18n';
import { Badge, Btn, Dialog, Input, PageTitle, SectionTitle, SettingCard, Switch } from '../components/ui';
import { PRESETS, type Preset } from '../engine/providers/builtin/presets';
import type { ProviderConfig } from '../engine/providers/types';
import {
  addPreset,
  loadProviders,
  providerStatus,
  putProviderKey,
  registryFor,
  removeProviderKey,
  saveProviders,
} from '../lib/providersStore';

export default function ProvidersTab() {
  const { t } = useI18n();
  const toast = useStore((s) => s.toast);
  const [configs, setConfigs] = useState<ProviderConfig[]>(() => loadProviders());
  const [busy, setBusy] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [keyValue, setKeyValue] = useState('');

  const persist = (next: ProviderConfig[]) => {
    setConfigs(next);
    saveProviders(next);
  };

  const test = async (id: string) => {
    setBusy(id);
    try {
      const result = await registryFor(configs).testConnection(id);
      toast(
        result.ok
          ? t('providers.ok', { n: String(result.models) })
          : t('providers.failed', { code: result.error ?? 'error' }),
      );
      saveProviders([...configs]);
      setConfigs([...configs]);
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!preset) return;
    const next = addPreset(configs, preset);
    const added = next[next.length - 1];
    persist(next);
    if (keyValue.trim()) {
      try {
        await putProviderKey(added.id, keyValue.trim());
      } catch {
        toast(t('providers.keyFailed'));
      }
    }
    setAddOpen(false);
    setPreset(null);
    setKeyValue('');
    await test(added.id);
  };

  const remove = async (id: string) => {
    await removeProviderKey(id).catch(() => undefined);
    persist(configs.filter((c) => c.id !== id));
  };

  const builtin = configs.filter((c) => c.kind === 'builtin-free');
  const custom = configs.filter((c) => c.kind !== 'builtin-free');

  const card = (config: ProviderConfig) => {
    const status = providerStatus(config);
    return (
      <div key={config.id} className="card p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] grid place-items-center flex-none" style={{ background: 'var(--elevated)', border: '1px solid var(--line)' }}>
            <Zap size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[15.5px] font-semibold truncate">{config.label}</span>
              {config.kind === 'builtin-free' ? <Badge tone="info">{t('providers.free')}</Badge> : null}
              <Badge tone={status === 'ready' ? 'accent' : status === 'disabled' ? 'neutral' : 'danger'}>
                {t(`providers.${status}`)}
              </Badge>
            </div>
            <div className="text-[12.5px] text-[var(--muted)] mt-0.5">
              {t('providers.models', { n: String(config.models.length) })}
              {config.keys.length ? ` · ${config.keys.length} ${t('providers.keys')}` : ''}
            </div>
          </div>
          <Btn size="sm" variant="outline" onClick={() => void test(config.id)} disabled={busy === config.id}>
            <RefreshCw size={14} className={busy === config.id ? 'animate-spin' : undefined} />
            {t('providers.test')}
          </Btn>
          <Switch
            checked={config.enabled}
            onChange={() => persist(configs.map((c) => (c.id === config.id ? { ...c, enabled: !c.enabled } : c)))}
            label={config.label}
          />
        </div>
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

      <SectionTitle icon={<Zap size={18} />} title={t('providers.builtin')} />
      <div className="flex flex-col gap-2 mt-2">{builtin.map(card)}</div>

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
