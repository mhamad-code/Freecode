import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useStore } from '../store';
import { useI18n } from '../lib/i18n';
import { TEMPLATES } from '../lib/mock';
import type { SiteTemplate } from '../lib/types';
import { Badge, Btn, Chip, Dialog, PageTitle } from '../components/ui';

function Art({ template }: { template: SiteTemplate }) {
  const base = { background: template.gradient };
  if (template.art === 'game') {
    return (
      <div className="absolute inset-0 overflow-hidden" style={base}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(90,120,110,.6), rgba(210,190,160,.85))' }} />
        <div className="absolute left-[8%] top-[16%] text-white/85 text-[9px] tracking-[.2em]">CROSSCUT</div>
        <div className="absolute left-[8%] top-[38%] text-white text-[20px] font-semibold leading-tight" style={{ letterSpacing: '-.02em' }}>
          Make
          <br />
          your mark.
        </div>
        <div className="absolute left-[8%] bottom-[16%] w-[62px] h-[10px] rounded-sm" style={{ background: 'rgba(230,255,180,.85)' }} />
        <div className="absolute right-[14%] bottom-[10%] w-[130px] h-[82px]" style={{ background: 'rgba(70,90,90,.5)', transform: 'skewY(-8deg)' }} />
        <div className="absolute right-[6%] top-[12%] px-2 py-0.5 rounded text-[7px] text-white" style={{ background: 'rgba(0,0,0,.4)' }}>RUNNING</div>
      </div>
    );
  }
  if (template.art === 'terminal') {
    return (
      <div className="absolute inset-0 overflow-hidden" style={base}>
        <div className="absolute inset-0 p-3 font-mono text-[6px] leading-[1.7]" style={{ color: '#ffb86b' }}>
          <div className="text-center tracking-[.2em]">PHOSPHOR // IN COMMUNICATION</div>
          <div className="mt-2 opacity-90">YOU ARE THE AGENT. EVERY APP, ANY TASK.</div>
          <div className="opacity-90">THE PLANET HAS NO FALSE PIXELS. NO SLOPPY SPACING.</div>
          <div className="mt-2 opacity-60">1 [O] / SCALE / 2 [E] SCALE / 3 [C] SNAP TO GRID</div>
          <div className="mt-2 inline-block px-2 py-1" style={{ background: 'rgba(255,180,90,.18)', border: '1px solid rgba(255,180,90,.5)' }}>ALWAYS ON</div>
          <div className="mt-2 opacity-80">READY?<br />[Enter] START</div>
        </div>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 0%, transparent 40%, rgba(0,0,0,.6))' }} />
      </div>
    );
  }
  if (template.art === 'dashboard') {
    return (
      <div className="absolute inset-0 overflow-hidden" style={base}>
        <div className="absolute left-0 top-0 bottom-0 w-[18%]" style={{ background: 'rgba(255,255,255,.06)' }} />
        <div className="absolute left-[24%] top-[18%] right-[8%] h-[10px] rounded" style={{ background: 'rgba(255,255,255,.25)' }} />
        <div className="absolute left-[24%] top-[32%] right-[8%] h-[38px] rounded" style={{ background: 'rgba(255,255,255,.1)' }} />
        <div className="absolute left-[24%] top-[58%] right-[8%] bottom-[12%] flex items-end gap-1.5">
          {[30, 52, 40, 66, 48, 72].map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: 'rgba(140,220,230,.55)' }} />
          ))}
        </div>
      </div>
    );
  }
  if (template.art === 'store') {
    return (
      <div className="absolute inset-0 overflow-hidden" style={base}>
        <div className="absolute top-[12%] left-[8%] rounded-full w-[46px] h-[46px]" style={{ background: 'rgba(255,255,255,.6)' }} />
        <div className="absolute top-[28%] right-[10%] rounded-full w-[64px] h-[64px]" style={{ background: 'rgba(150,90,60,.35)' }} />
        <div className="absolute bottom-[10%] left-[8%] right-[8%] flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 h-[58px] rounded-md" style={{ background: 'rgba(255,255,255,.55)' }} />
          ))}
        </div>
        <div className="absolute top-[8%] left-[8%] text-[#4a2c1c] text-[16px] font-semibold">Bloom</div>
      </div>
    );
  }
  if (template.art === 'portfolio') {
    return (
      <div className="absolute inset-0 overflow-hidden" style={base}>
        <div className="absolute left-[8%] top-[12%] text-[42px] font-bold leading-none" style={{ color: '#2b2b28', letterSpacing: '-.04em' }}>Fo</div>
        <div className="absolute left-[8%] top-[46%] right-[12%] h-[6px] rounded" style={{ background: 'rgba(40,40,35,.35)' }} />
        <div className="absolute left-[8%] top-[56%] right-[28%] h-[6px] rounded" style={{ background: 'rgba(40,40,35,.2)' }} />
        <div className="absolute right-[8%] bottom-[12%] w-[54px] h-[38px]" style={{ background: 'rgba(120,120,110,.4)' }} />
      </div>
    );
  }
  return (
    <div className="absolute inset-0 overflow-hidden" style={base}>
      <div className="absolute left-0 top-0 bottom-0 w-[22%] px-2 py-3" style={{ background: 'rgba(255,255,255,.05)' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[4px] rounded mb-2" style={{ background: 'rgba(255,255,255,.22)', width: `${60 + i * 6}%` }} />
        ))}
      </div>
      <div className="absolute left-[28%] top-[14%] right-[10%]">
        <div className="h-[8px] w-[54%] rounded" style={{ background: 'rgba(255,255,255,.4)' }} />
        <div className="mt-2 h-[4px] rounded" style={{ background: 'rgba(255,255,255,.18)' }} />
        <div className="mt-1.5 h-[4px] w-[80%] rounded" style={{ background: 'rgba(255,255,255,.18)' }} />
      </div>
      <div className="absolute left-[28%] right-[10%] bottom-[10%] h-[40%] rounded" style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)' }} />
    </div>
  );
}

export default function Sites() {
  const { t } = useI18n();
  const toast = useStore((s) => s.toast);
  const newSession = useStore((s) => s.newSession);
  const [filter, setFilter] = useState('featured');
  const [detail, setDetail] = useState<SiteTemplate | null>(null);
  const [create, setCreate] = useState(false);
  const filters = [
    ['featured', t('sites.featured')],
    ['all', t('sites.all')],
    ['landing', t('sites.landing')],
    ['stores', t('sites.stores')],
    ['games', t('sites.games')],
    ['portfolios', t('sites.portfolios')],
    ['dashboards', t('sites.dashboards')],
    ['docs', t('sites.docs')],
  ];
  const shown = TEMPLATES.filter((x) => filter === 'all' || filter === 'featured' ? true : x.kind === filter);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="px-4 pb-10 max-w-[760px]">
        <PageTitle actions={<Btn variant="primary" onClick={() => setCreate(true)}><Plus size={17} />{t('sites.create')}</Btn>}>
          {t('sites.title')}
        </PageTitle>

        <div className="flex gap-2 overflow-x-auto no-bar pb-1 -mx-1 px-1">
          {filters.map(([id, label]) => (
            <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>{label}</Chip>
          ))}
        </div>

        <button
          type="button"
          onClick={() => { newSession(); toast('New blank project created'); }}
          className="w-full mt-4 flex flex-col items-center gap-3 px-6 py-7 group transition-colors"
          style={{ border: '1.5px dashed var(--line-strong)', borderRadius: 16 }}
        >
          <span className="w-[70px] h-[70px] rounded-full grid place-items-center" style={{ background: 'var(--elevated)' }}>
            <Plus size={26} className="transition-transform group-hover:rotate-90" />
          </span>
          <span className="text-[20px] font-semibold">{t('sites.startScratch')}</span>
          <span className="text-[15px] text-[var(--muted)]">{t('sites.startScratchSub')}</span>
        </button>

        <div className="mt-4 flex flex-col gap-4">
          {shown.map((tpl) => (
            <button key={tpl.id} type="button" onClick={() => setDetail(tpl)} className="card p-2.5 text-start group">
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1.6', borderRadius: 12, border: '1px solid var(--line)' }}>
                <div className="absolute inset-0 transition-transform duration-[260ms] group-hover:scale-[1.02]">
                  <Art template={tpl} />
                </div>
              </div>
              <div className="px-1 pt-2.5">
                <div className="text-[21px] font-bold tracking-[-.01em]">{tpl.name}</div>
                <p className="text-[15px] text-[var(--muted)] mt-1 leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {tpl.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} width={560} sheet>
        {detail ? (
          <div className="pt-3">
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1.6', borderRadius: 14, border: '1px solid var(--line)' }}>
              <Art template={detail} />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <h3 className="text-[22px] font-bold flex-1">{detail.name}</h3>
              <Badge tone="accent">{detail.kind}</Badge>
            </div>
            <p className="text-[14.5px] text-[var(--muted)] mt-1.5 leading-relaxed">{detail.description}</p>
            <div className="flex gap-2 mt-4">
              <Btn variant="primary" onClick={() => { newSession(); setDetail(null); toast(`${detail.name} template started`); }}>{t('sites.useTemplate')}</Btn>
              <Btn variant="outline" onClick={() => toast('Opening in Cloud browser')}>{t('sites.preview')}</Btn>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog open={create} onClose={() => setCreate(false)} title={`Create a site`} width={480} sheet>
        <label className="text-[13.5px] text-[var(--muted)]">Describe the site</label>
        <textarea className="area mt-1" rows={4} placeholder="A landing page for a small coffee roaster, warm and typographic." />
        <div className="flex flex-wrap gap-2 mt-3">
          {['Landing page', 'Store', 'Dashboard', 'Portfolio', 'Docs'].map((k) => (
            <Chip key={k} className="h-7 text-[12.5px]" active={k === 'Landing page'}>{k}</Chip>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <Btn variant="primary" onClick={() => { setCreate(false); newSession(); toast('Creating with agent…'); }}>Create with agent</Btn>
        </div>
      </Dialog>
    </div>
  );
}
