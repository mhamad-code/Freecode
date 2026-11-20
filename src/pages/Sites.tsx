import { useState } from 'react';
import { Plus, LayoutGrid } from 'lucide-react';
import { useStore } from '../store';
import { useI18n } from '../lib/i18n';
import { Btn, Chip, Dialog, PageTitle } from '../components/ui';

export default function Sites() {
  const { t } = useI18n();
  const toast = useStore((s) => s.toast);
  const newSession = useStore((s) => s.newSession);
  const [create, setCreate] = useState(false);
  const [describe, setDescribe] = useState('');

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="px-4 pb-10 max-w-[760px]">
        <PageTitle
          actions={
            <Btn variant="primary" onClick={() => setCreate(true)}>
              <Plus size={17} />
              {t('sites.create')}
            </Btn>
          }
        >
          {t('sites.title')}
        </PageTitle>

        <button
          type="button"
          onClick={() => {
            newSession();
            toast(t('sites.createdBlank'));
          }}
          className="w-full mt-2 flex flex-col items-center gap-3 px-6 py-7 group transition-colors"
          style={{ border: '1.5px dashed var(--line-strong)', borderRadius: 16 }}
        >
          <span className="w-[70px] h-[70px] rounded-full grid place-items-center" style={{ background: 'var(--elevated)' }}>
            <Plus size={26} className="transition-transform group-hover:rotate-90" />
          </span>
          <span className="text-[20px] font-semibold">{t('sites.startScratch')}</span>
          <span className="text-[15px] text-[var(--muted)]">{t('sites.startScratchSub')}</span>
        </button>

        <div className="card mt-4 p-8 text-center">
          <LayoutGrid size={24} className="mx-auto text-[var(--faint)]" />
          <div className="text-[16px] font-semibold mt-2">{t('sites.emptyTitle')}</div>
          <p className="text-[13.5px] text-[var(--muted)] mt-1 max-w-[380px] mx-auto">{t('sites.emptyBody')}</p>
        </div>
      </div>

      <Dialog open={create} onClose={() => setCreate(false)} title={t('sites.createTitle')} width={480} sheet>
        <label className="text-[13.5px] text-[var(--muted)]">{t('sites.describe')}</label>
        <textarea
          className="area mt-1"
          rows={4}
          value={describe}
          onChange={(e) => setDescribe(e.target.value)}
          placeholder={t('sites.describePlaceholder')}
        />
        <div className="flex flex-wrap gap-2 mt-3">
          {[t('sites.landing'), t('sites.stores'), t('sites.dashboards'), t('sites.portfolios'), t('sites.docs')].map((k) => (
            <Chip key={k} className="h-7 text-[12.5px]">
              {k}
            </Chip>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <Btn
            variant="primary"
            disabled={!describe.trim()}
            onClick={() => {
              setCreate(false);
              newSession();
              toast(t('sites.creating'));
            }}
          >
            {t('sites.createWithAgent')}
          </Btn>
        </div>
      </Dialog>
    </div>
  );
}
