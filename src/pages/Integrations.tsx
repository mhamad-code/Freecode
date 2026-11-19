import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useStore } from '../store';
import { useI18n } from '../lib/i18n';
import type { Integration } from '../lib/types';
import { Badge, Btn, Dialog, Input, PageTitle, SearchInput } from '../components/ui';

export function ServiceTile({ integration, size = 52 }: { integration: Integration; size?: number }) {
  return (
    <span
      className="grid place-items-center flex-none select-none"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.24),
        background: '#ffffff',
        color: integration.color,
        fontWeight: 700,
        fontSize: size * 0.42,
        letterSpacing: '-0.02em',
        boxShadow: '0 1px 2px rgba(0,0,0,.18)',
        border: '1px solid rgba(0,0,0,.06)',
      }}
      aria-hidden
    >
      {integration.monogram}
    </span>
  );
}

export default function Integrations() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const integrations = useStore((s) => s.integrations);
  const disconnect = useStore((s) => s.disconnectAccount);
  const toast = useStore((s) => s.toast);
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState(false);
  const [confirm, setConfirm] = useState<{ service: string; account: string; name: string } | null>(null);

  const connected = integrations.filter((i) => i.accounts.length > 0);
  const popular = integrations
    .filter((i) => !i.accounts.length)
    .filter((i) => i.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="px-4 pb-10 max-w-[760px]">
        <PageTitle>{t('integrations.title')}</PageTitle>

        <div className="flex items-center gap-2">
          <SearchInput value={query} onValueChange={setQuery} placeholder={t('integrations.explore')} className="flex-1" />
          <Btn variant="inverse" onClick={() => setCustom(true)}>{t('integrations.custom')}</Btn>
        </div>

        <div className="mt-5 text-[15px] text-[var(--muted)]">{t('integrations.connected')}</div>
        <div className="mt-2 flex flex-col gap-3">
          {connected.length === 0 ? (
            <div className="card p-4 text-[14px] text-[var(--muted)]">No connected accounts yet.</div>
          ) : null}
          {connected.map((service) => (
            <div key={service.id} className="card p-4">
              <div className="flex items-center gap-3">
                <ServiceTile integration={service} />
                <span className="text-[19px] sm:text-[20px] font-semibold flex-1 min-w-0 truncate">{service.name}</span>
                <Btn variant="inverse" size="sm" className="text-[13px] px-2.5 gap-1.5" onClick={() => navigate(`/connect/${service.id}`)}>
                  <Plus size={14} />
                  {t('integrations.addAccount')}
                </Btn>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {service.accounts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 px-3 py-3"
                    style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14 }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[15.5px] truncate" dir="auto">{a.name}</span>
                        {a.status === 'reauth' ? <Badge tone="warning">{t('integrations.needsReconnect')}</Badge> : null}
                        {a.status === 'error' ? <Badge tone="danger">Error</Badge> : null}
                      </div>
                      <div className="text-[13px] text-[var(--muted)] mt-0.5 whitespace-nowrap">
                        {t('integrations.connectedOn', { date: new Date(a.connectedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) })}
                      </div>
                    </div>
                    <Btn
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirm({ service: service.id, account: a.id, name: service.name })}
                    >
                      {t('common.disconnect')}
                    </Btn>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-[15px] text-[var(--muted)]">{t('integrations.popular')}</div>
        <div className="mt-2 flex flex-col gap-2">
          {popular.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => navigate(`/connect/${service.id}`)}
              className="card flex items-center gap-3 p-3 text-start hover:-translate-y-px transition-transform"
              style={{ minHeight: 64 }}
            >
              <ServiceTile integration={service} />
              <span className="text-[17px] font-medium flex-1 min-w-0 truncate">{service.name}</span>
              <span className="text-[var(--muted)] pe-1"><Plus size={20} /></span>
            </button>
          ))}
          {!popular.length ? (
            <button type="button" className="card flex items-center gap-3 p-3 text-start" onClick={() => toast('Integration request sent')}>
              <span className="w-[52px] h-[52px] rounded-xl grid place-items-center" style={{ border: '1.5px dashed var(--line-strong)' }}>
                <Search size={20} className="text-[var(--faint)]" />
              </span>
              <span className="flex-1">
                <span className="block text-[15.5px] font-medium">{t('integrations.request')}</span>
                <span className="block text-[13px] text-[var(--muted)]">{t('integrations.noResults')}</span>
              </span>
            </button>
          ) : null}
        </div>
      </div>

      <Dialog open={custom} onClose={() => setCustom(false)} title={`Add custom integration`} width={480}>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[13.5px] text-[var(--muted)]">Name</label>
            <Input value="" onValueChange={() => {}} placeholder="My internal tool" className="mt-1" />
          </div>
          <div>
            <label className="text-[13.5px] text-[var(--muted)]">MCP or HTTP URL</label>
            <Input value="" onValueChange={() => {}} placeholder="https://mcp.example.com/sse" className="mt-1" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[14px]">Auth type</span>
            <Btn size="sm" variant="outline">Bearer token</Btn>
          </div>
          <div>
            <label className="text-[13.5px] text-[var(--muted)]">Headers</label>
            <textarea className="area mt-1 font-mono text-[13px]" rows={3} placeholder={'Authorization: Bearer …'} dir="ltr" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="ghost" onClick={() => setCustom(false)}>{t('common.cancel')}</Btn>
          <Btn variant="primary" onClick={() => { setCustom(false); toast('Custom integration added'); }}>{t('common.add')}</Btn>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={`Disconnect ${confirm?.name ?? ''}?`}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirm(null)}>{t('common.cancel')}</Btn>
            <Btn
              variant="danger"
              onClick={() => {
                if (confirm) {
                  disconnect(confirm.service, confirm.account);
                  toast(`Disconnected ${confirm.name}`);
                }
                setConfirm(null);
              }}
            >
              {t('common.disconnect')}
            </Btn>
          </>
        }
      >
        <p className="text-[14.5px] text-[var(--muted)] leading-relaxed">
          The agent will lose access to this account. You can reconnect at any time.
        </p>
      </Dialog>
    </div>
  );
}
