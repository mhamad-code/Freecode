import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Check,
  ChevronDown,
  Clock,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  FolderCog,
  Gauge,
  Keyboard,
  KeyRound,
  Lock,
  Moon,
  Palette,
  Plug,
  Plus,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Sun,
  TerminalSquare,
  Trash2,
  UserCircle,
  X,
} from 'lucide-react';
import { useStore } from '../store';
import { useI18n } from '../lib/i18n';
import { THEMES, type ThemePreset } from '../themes/registry';
import {
  Badge,
  Btn,
  Dialog,
  IBtn,
  Input,
  Kbd,
  Menu,
  MenuItem,
  PageTitle,
  Row,
  SearchInput,
  SectionTitle,
  SettingCard,
  Segmented,
  Switch,
  Tip,
  useCountUp,
} from '../components/ui';
import { RuntimeStatus } from '../components/RuntimeBanner';
import ProvidersTab from './ProvidersTab';
import { exportBackup, readBackup } from '../lib/backup';

const TABS = [
  { id: 'general', icon: SlidersHorizontal },
  { id: 'account', icon: UserCircle },
  { id: 'appearance', icon: Palette },
  { id: 'usage', icon: Gauge },
  { id: 'providers', icon: KeyRound },
  { id: 'project', icon: FolderCog },
  { id: 'skills', icon: Sparkles },
  { id: 'mcp', icon: Plug },
  { id: 'keyboard', icon: Keyboard },
];

function Select({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <Menu
      width={210}
      trigger={
        <button type="button" className="chip h-8 gap-1.5 text-[13.5px]">
          {value}
          <ChevronDown size={13} />
        </button>
      }
    >
      {options.map((o) => (
        <MenuItem key={o} icon={o === value ? <Check size={14} /> : undefined} onClick={() => onChange(o)}>
          {o}
        </MenuItem>
      ))}
    </Menu>
  );
}

/* ------------------------------- general ------------------------------- */
function GeneralTab() {
  const { t, lang } = useI18n();
  const settings = useStore((s) => s.settings);
  const set = useStore((s) => s.setSetting);
  const setLang = useStore((s) => s.setLang);
  const toast = useStore((s) => s.toast);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const doExport = () => {
    const st = useStore.getState();
    const name = exportBackup({ settings: st.settings, sessions: st.sessions });
    toast(`Backup saved: ${name}`);
  };
  const doImport = async (file: File) => {
    try {
      const data = await readBackup(file);
      useStore.getState().restoreBackup({
        settings: data.settings as never,
        sessions: data.sessions as never,
      });
      toast('Backup imported');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Import failed');
    }
  };

  return (
    <div className="max-w-[720px]">
      <div className="mb-4">
        <SectionTitle icon={<SlidersHorizontal size={18} />} title={t('settings.composer')} />
        <SettingCard>
          <Row label={t('settings.advancedMode')} hint="Show the model picker, reasoning effort and the branch chip.">
            <Switch checked={settings.advancedMode} onChange={(v) => set('advancedMode', v)} label={t('settings.advancedMode')} />
          </Row>
          <Row label={t('settings.sendEnter')} hint="Shift+Enter inserts a newline.">
            <Switch checked={settings.sendEnter} onChange={(v) => set('sendEnter', v)} label={t('settings.sendEnter')} />
          </Row>
          <Row label={t('settings.showSuggestions')}>
            <Switch checked={settings.suggestions} onChange={(v) => set('suggestions', v)} label={t('settings.showSuggestions')} />
          </Row>
        </SettingCard>
      </div>

      <div className="mb-4">
        <SectionTitle icon={<Activity size={18} />} title={t('settings.notifications')} />
        <SettingCard>
          <Row label={t('settings.notificationSounds')}>
            <Switch checked={settings.sounds} onChange={(v) => set('sounds', v)} label={t('settings.notificationSounds')} />
          </Row>
          {settings.sounds ? (
            <Row label="Volume">
              <input type="range" min={0} max={100} defaultValue={60} className="w-32 accent-[var(--accent)]" aria-label="Volume" />
            </Row>
          ) : null}
          <Row label={t('settings.desktopNotifications')}>
            <Switch checked={settings.desktopNotifications} onChange={(v) => set('desktopNotifications', v)} label={t('settings.desktopNotifications')} />
          </Row>
        </SettingCard>
      </div>

      <div className="mb-4">
        <SectionTitle icon={<Clock size={18} />} title={t('settings.sessions')} />
        <SettingCard>
          <Row label={t('settings.autoRenew')}>
            <Switch checked={settings.autoRenew} onChange={(v) => set('autoRenew', v)} label={t('settings.autoRenew')} />
          </Row>
          <Row label={t('settings.keepAlive')}>
            <Switch checked={settings.keepAlive} onChange={(v) => set('keepAlive', v)} label={t('settings.keepAlive')} />
          </Row>
          <Row label={t('settings.autoArchive')} hint="Archive chats that have been idle.">
            <Select value={settings.autoArchive === 'never' ? 'Never' : settings.autoArchive} options={['Never', 'After 1 day', 'After 7 days', 'After 30 days']} onChange={(v) => set('autoArchive', v)} />
          </Row>
        </SettingCard>
      </div>

      <div className="mb-4">
        <SectionTitle icon={<Sparkles size={18} />} title={t('settings.feedback')} />
        <div className="card p-3 flex items-center gap-2">
          <Btn variant="inverse" className="flex-1" onClick={() => toast('Thanks — feedback opened')}>{t('settings.reportIssue')}</Btn>
          <Btn variant="inverse" className="w-9 px-0" aria-label="Discord" onClick={() => toast('Opening Discord')}>
            <ExternalLink size={17} />
          </Btn>
        </div>
      </div>

      <div className="mb-4">
        <SectionTitle icon={<Shield size={18} />} title={t('settings.agentPermissions')} />
        <SettingCard>
          <Row label={t('composer.permissionAsk')} hint="How the agent asks before running risky actions.">
            <Select
              value={settings.permissionMode === 'ask' ? 'Ask every time' : settings.permissionMode}
              options={['Ask every time', 'Ask for risky actions only', 'Allow all in this project', 'Read-only']}
              onChange={(v) => set('permissionMode', v)}
            />
          </Row>
          <div className="py-3.5">
            <div className="text-[16px]">{t('settings.alwaysAllowed')}</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['npm run build', 'git status', 'ls'].map((c) => (
                <span key={c} className="badge font-mono gap-1" dir="ltr">
                  {c}
                  <button type="button" aria-label={`Remove ${c}`} onClick={() => toast(`Removed ${c}`)}><X size={11} /></button>
                </span>
              ))}
            </div>
          </div>
        </SettingCard>
      </div>

      <div className="mb-4">
        <SectionTitle icon={<Palette size={18} />} title={t('settings.language')} />
        <SettingCard>
          <Row label={t('settings.language')} hint="Text blocks follow the language; the app chrome stays anchored to the left.">
            <Segmented
              value={lang}
              onChange={(v) => setLang(v)}
              options={[
                { value: 'en', label: 'English' },
                { value: 'ar', label: 'العربية' },
              ]}
            />
          </Row>
        </SettingCard>
      </div>

      <div className="mb-8">
        <SectionTitle icon={<Trash2 size={18} />} title={t('settings.data')} />
        <SettingCard>
          <RuntimeStatus />
          <Row label={t('settings.exportBackup')} hint={t('settings.exportHint')}>
            <Btn size="sm" variant="primary" onClick={doExport}>{t('settings.exportBackup')}</Btn>
          </Row>
          <Row label={t('settings.import')} hint={t('settings.importHint')}>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void doImport(f);
                e.target.value = '';
              }}
            />
            <Btn size="sm" variant="outline" onClick={() => fileRef.current?.click()}>{t('settings.import')}</Btn>
          </Row>
          <Row label={t('settings.resetDemo')} hint={t('settings.resetHint')}>
            <Btn size="sm" variant="outline" onClick={() => { useStore.getState().resetSettings(); toast('Demo data reset'); }}>Reset</Btn>
          </Row>
          <Row label={t('settings.deleteChats')}>
            <Btn size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>{t('common.delete')}</Btn>
          </Row>
        </SettingCard>
      </div>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t('settings.deleteChats')}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDeleteOpen(false)}>{t('common.cancel')}</Btn>
            <Btn variant="danger" disabled={confirm !== 'DELETE'} onClick={() => { setDeleteOpen(false); setConfirm(''); toast('All chats deleted'); }}>
              {t('common.delete')}
            </Btn>
          </>
        }
      >
        <p className="text-[14.5px] text-[var(--muted)]">This cannot be undone. Type DELETE to confirm.</p>
        <Input value={confirm} onValueChange={setConfirm} placeholder="DELETE" className="mt-3" />
      </Dialog>
    </div>
  );
}

/* ------------------------------- appearance ------------------------------- */
function MiniPreview({ theme }: { theme: ThemePreset }) {
  const tk = theme.tokens;
  return (
    <div
      className="relative overflow-hidden w-full"
      style={{ aspectRatio: '1.55', borderRadius: 12, border: '1px solid var(--line)', background: tk.bgImage ?? tk.bg }}
    >
      <div className="absolute left-2.5 top-3 flex flex-col gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: tk.accent }} />
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(140,140,145,.6)' }} />
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(140,140,145,.35)' }} />
      </div>
      <div
        className="absolute right-2 top-2 bottom-4 left-8 rounded-[6px] p-2"
        style={{ background: tk.panel, border: `1px solid ${tk.line}`, backdropFilter: theme.glass ? 'blur(4px)' : undefined }}
      >
        <div className="flex justify-end gap-1">
          <span className="h-1.5 w-6 rounded-full" style={{ background: tk.lineStrong }} />
          <span className="h-1.5 w-6 rounded-full" style={{ background: tk.lineStrong }} />
        </div>
        <div className="flex gap-2 mt-2">
          <span className="h-1.5 w-5 rounded-full" style={{ background: tk.lineStrong }} />
          <div className="flex-1">
            <div className="h-1 w-full rounded-full" style={{ background: tk.text, opacity: 0.45 }} />
            <div className="h-1 w-3/4 rounded-full mt-1" style={{ background: tk.text, opacity: 0.45 }} />
            <div className="h-1 w-2/3 rounded-full mt-1.5" style={{ background: tk.text, opacity: 0.2 }} />
          </div>
        </div>
        <div className="absolute bottom-1.5 right-1.5 left-2 h-4 rounded-[4px] flex items-center px-1.5 gap-1" style={{ background: tk.elevated, border: `1px solid ${tk.line}` }}>
          <span className="h-1 w-8 rounded-full" style={{ background: tk.text, opacity: 0.3 }} />
          <span className="h-2.5 w-2.5 rounded-[3px] ms-auto" style={{ background: tk.accent }} />
        </div>
      </div>
    </div>
  );
}

function AutoPreview() {
  return (
    <div className="relative overflow-hidden w-full" style={{ aspectRatio: '1.55', borderRadius: 12, border: '1px solid var(--line)' }}>
      <div className="absolute inset-0" style={{ background: '#ecebe6' }} />
      <div className="absolute inset-0" style={{ background: '#0b0b0c', clipPath: 'polygon(62% 0, 100% 0, 100% 100%, 46% 100%)' }} />
      <div className="absolute left-[30%] top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#4b4b45]"><Sun size={22} /></div>
      <div className="absolute left-[80%] top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#e7e7e9]"><Moon size={20} /></div>
    </div>
  );
}

function AppearanceTab() {
  const { t } = useI18n();
  const themeId = useStore((s) => s.themeId);
  const setTheme = useStore((s) => s.setTheme);
  const toast = useStore((s) => s.toast);
  const settings = useStore((s) => s.settings);
  const set = useStore((s) => s.setSetting);
  const [filter, setFilter] = useState<'all' | 'dark' | 'light'>('all');
  const list = THEMES.filter((th) => (filter === 'all' ? true : th.mode === filter));

  return (
    <div className="max-w-[720px]">
      <div className="flex items-center gap-3">
        <SectionTitle icon={<Palette size={18} />} title={t('settings.selectPreset')} className="flex-1" />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <button
          type="button"
          onClick={() => { setTheme('auto'); toast('Theme: Auto'); }}
          className="text-start relative rounded-[14px] p-1.5 transition-transform hover:-translate-y-0.5"
          style={{
            border: themeId === 'auto' ? '2px solid var(--accent)' : '2px solid transparent',
            background: themeId === 'auto' ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : undefined,
          }}
          aria-pressed={themeId === 'auto'}
        >
          <AutoPreview />
          <div className="flex items-center gap-2 px-1 pt-2">
            <span className="text-[16px] flex-1">Auto</span>
            {themeId === 'auto' ? <Check size={17} className="text-[var(--accent)]" /> : null}
          </div>
        </button>

        {list.map((theme) => {
          const selected = themeId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => { setTheme(theme.id); toast(`Theme: ${theme.label}`); }}
              className="text-start relative rounded-[14px] p-1.5 transition-transform hover:-translate-y-0.5 active:scale-[.98]"
              style={{
                border: selected ? '2px solid var(--accent)' : '2px solid transparent',
                background: selected ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : undefined,
              }}
              aria-pressed={selected}
            >
              <MiniPreview theme={theme} />
              <div className="flex items-center gap-2 px-1 pt-2">
                <span className="text-[16px] flex-1 truncate">{theme.label}</span>
                {selected ? <Check size={17} className="text-[var(--accent)] flex-none" /> : null}
                {theme.locked ? <Lock size={15} className="text-[var(--accent)] flex-none" /> : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <SettingCard>
          <Row label={t('settings.reduceMotion')} hint="Overrides your system preference.">
            <Switch checked={settings.reduceMotion} onChange={(v) => set('reduceMotion', v)} label={t('settings.reduceMotion')} />
          </Row>
          <Row label={t('settings.transparency')} hint="Applies to glass themes only.">
            <input
              type="range"
              min={40}
              max={95}
              value={settings.transparency}
              onChange={(e) => set('transparency', Number(e.target.value))}
              className="w-28 accent-[var(--accent)]"
              aria-label={t('settings.transparency')}
            />
            <span className="text-[13px] text-[var(--muted)] w-8 text-end">{settings.transparency}%</span>
          </Row>
          <Row label={t('settings.accentOverride')}>
            <div className="flex gap-1.5">
              {['', '#6bb34f', '#2ee6b0', '#ff8a3d', '#ff6984', '#9d71e8', '#0f969c', '#e0b341'].map((c) => (
                <button
                  key={c || 'default'}
                  type="button"
                  aria-label={c || 'Default accent'}
                  onClick={() => set('accent', c)}
                  className="w-6 h-6 rounded-md"
                  style={{
                    background: c || 'var(--accent)',
                    border: settings.accent === c ? '2px solid var(--text)' : '1px solid var(--line-strong)',
                  }}
                />
              ))}
            </div>
          </Row>
        </SettingCard>
      </div>
    </div>
  );
}

/* ------------------------------- usage ------------------------------- */
function Heatmap() {
  const heat = useStore((s) => s.usage.heat);
  const level = (m: number) =>
    m === 0
      ? 'color-mix(in srgb, var(--elevated) 80%, transparent)'
      : m <= 15
        ? 'color-mix(in srgb, var(--accent) 25%, transparent)'
        : m <= 30
          ? 'color-mix(in srgb, var(--accent) 50%, transparent)'
          : m <= 45
            ? 'color-mix(in srgb, var(--accent) 75%, transparent)'
            : 'var(--accent)';
  return (
    <div className="overflow-x-auto no-bar">
      <div className="grid grid-flow-col gap-[3px] w-max" style={{ gridTemplateRows: 'repeat(7, 14px)' }} role="img" aria-label="Activity heatmap">
        {heat.map((c) => (
          <div key={c.date} className="ht-cell" style={{ background: level(c.minutes), width: 14, height: 14 }} title={`${c.date} · ${c.minutes} min`} />
        ))}
      </div>
    </div>
  );
}

function UsageTab() {
  const { t } = useI18n();
  const usage = useStore((s) => s.usage);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d');
  const messages = useCountUp(usage.messages);
  const streak = useCountUp(usage.streak.current);

  return (
    <div className="max-w-[720px]">
      <PageTitle>{t('settings.usage')}</PageTitle>

      <div>

        <SectionTitle icon={<Activity size={18} />} title={t('settings.activity')} help="Your daily coding activity." />
        <div className="card p-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[15px] text-[var(--muted)]">{t('settings.currentStreak')}</div>
              <div className="text-[34px] font-bold leading-tight">{streak} <span className="text-[18px] font-medium">{t('settings.days', { n: '' }).trim()}</span></div>
            </div>
            <div>
              <div className="text-[15px] text-[var(--muted)]">{t('settings.longestStreak')}</div>
              <div className="text-[34px] font-bold leading-tight">{usage.streak.longest} <span className="text-[18px] font-medium">{t('settings.days', { n: '' }).trim()}</span></div>
            </div>
            <div>
              <div className="text-[15px] text-[var(--muted)]">{t('settings.activeDays')}</div>
              <div className="text-[34px] font-bold leading-tight">{usage.streak.active}</div>
            </div>
          </div>
          <div className="mt-4"><Heatmap /></div>
        </div>
      </div>

      <div className="mt-6">
        <SectionTitle icon={<BarChart3 size={18} />} title={t('settings.last7')} />
        <div className="card p-4 mt-2">
          <div className="flex items-start gap-6">
            <div>
              <div className="text-[14px] text-[var(--muted)]">{t('settings.messages')}</div>
              <div className="text-[30px] font-bold leading-tight">{messages}</div>
            </div>
            <div>
              <div className="text-[14px] text-[var(--muted)]">{t('settings.totalTokens')}</div>
              <div className="text-[30px] font-bold leading-tight">{usage.tokens}</div>
            </div>
            <div className="ms-auto">
              <Segmented
                value={range}
                onChange={setRange}
                options={[
                  { value: '7d', label: '7d' },
                  { value: '30d', label: '30d' },
                  { value: '90d', label: '90d' },
                ]}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1.5">
            {[
              [t('settings.inputTokens'), usage.input],
              [t('settings.outputTokens'), usage.output],
              [t('settings.cachedTokens'), usage.cached],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-[14px]">
                <span className="text-[var(--muted)]">{k}</span>
                <span className="font-mono" dir="ltr">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-2 h-24 mt-4">
            {usage.bars.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t-[4px]"
                  style={{ height: `${b * 4}px`, background: i === 3 ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 45%, transparent)' }}
                  title={`${b} messages`}
                />
                <span className="text-[10.5px] text-[var(--faint)]">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- skills ------------------------------- */
const GALLERY = [
  { name: 'web-design-guidelines', desc: 'Review UI code against interface guidelines.', author: 'freecode', installs: '12.4k' },
  { name: 'frontend-design', desc: 'Distinctive visual design for new UI.', author: 'freecode', installs: '8.1k' },
  { name: 'canvas-design', desc: 'Posters and PDFs with real design philosophy.', author: 'freecode', installs: '5.6k' },
  { name: 'ai-video-generation', desc: 'Veo, Seedance and 40+ video models.', author: 'community', installs: '3.2k' },
];

function SkillsTab() {
  const { t } = useI18n();
  const skills = useStore((s) => s.skills);
  const toggle = useStore((s) => s.toggleSkill);
  const add = useStore((s) => s.addSkill);
  const toast = useStore((s) => s.toast);
  const [query, setQuery] = useState('');
  const [discover, setDiscover] = useState(false);
  const [create, setCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const shown = skills.filter((s) => s.name.includes(query.toLowerCase()));

  return (
    <div className="max-w-[720px]">
      <div className="flex items-center gap-2">
        <PageTitle>{t('settings.skills')}</PageTitle>
        <Tip label="Skills are reusable instructions the agent can load on demand." side="top">
          <span className="text-[var(--faint)] mb-4">?</span>
        </Tip>
      </div>
      <div className="card p-4">
        <SearchInput value={query} onValueChange={setQuery} placeholder={t('settings.searchSkills')} />
        <div className="flex gap-2 mt-3">
          <Btn variant="inverse" onClick={() => setDiscover(true)}>{t('settings.discover')}</Btn>
          <Btn variant="inverse" onClick={() => setCreate(true)}>{t('settings.create')}</Btn>
          <Btn variant="inverse" onClick={() => toast('Drop a folder containing SKILL.md')}>{t('settings.upload')}</Btn>
        </div>
        <div className="mt-3 divide-y divide-[var(--line)]">
          {shown.map((s) => (
            <div key={s.id} className="py-3 flex items-start gap-3" style={{ opacity: s.enabled ? 1 : 0.6 }}>
              <div className="w-10 h-10 rounded-[10px] grid place-items-center flex-none" style={{ background: 'var(--elevated)', border: '1px solid var(--line)' }}>
                <Sparkles size={18} className="text-[var(--muted)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[16.5px] font-semibold font-mono truncate" dir="ltr">{s.name}</span>
                  <Badge tone={s.scope === 'project' ? 'info' : 'neutral'}>{s.scope}</Badge>
                </div>
                <p className="text-[14px] text-[var(--muted)] mt-0.5 leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {s.description}
                </p>
                <div className="text-[12px] text-[var(--faint)] mt-1">Used {s.used} times</div>
              </div>
              <div className="flex items-center gap-2 flex-none">
                <Btn size="sm" variant="outline" onClick={() => toast(`Editing ${s.name}`)}>{t('common.edit')}</Btn>
                <Switch checked={s.enabled} onChange={() => toggle(s.id)} label={s.name} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={discover} onClose={() => setDiscover(false)} title={t('settings.discover')} width={540} sheet>
        <div className="grid gap-2">
          {GALLERY.map((g) => (
            <div key={g.name} className="card p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] grid place-items-center" style={{ background: 'var(--elevated)' }}>
                <Sparkles size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold font-mono truncate" dir="ltr">{g.name}</div>
                <div className="text-[13px] text-[var(--muted)]">{g.desc} · {g.installs} installs</div>
              </div>
              <Btn
                size="sm"
                variant="inverse"
                onClick={() => { add(g.name, g.desc); toast(`Installed ${g.name}`); }}
              >
                Install
              </Btn>
            </div>
          ))}
        </div>
      </Dialog>

      <Dialog
        open={create}
        onClose={() => setCreate(false)}
        title={t('settings.create')}
        width={520}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setCreate(false)}>{t('common.cancel')}</Btn>
            <Btn variant="primary" disabled={!name.includes('-')} onClick={() => { add(name, desc || 'Project skill'); setCreate(false); setName(''); setDesc(''); toast('Skill created'); }}>
              {t('common.save')}
            </Btn>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[13.5px] text-[var(--muted)]">Name (kebab-case)</label>
            <Input value={name} onValueChange={(v) => setName(v.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="my-skill" className="mt-1" />
            {name && !name.includes('-') ? <div className="text-[12.5px] mt-1" style={{ color: 'var(--danger)' }}>Use at least one hyphen.</div> : null}
          </div>
          <div>
            <label className="text-[13.5px] text-[var(--muted)]">When to use it</label>
            <Input value={desc} onValueChange={setDesc} placeholder="Review UI code for accessibility" className="mt-1" />
          </div>
          <div>
            <label className="text-[13.5px] text-[var(--muted)]">Instructions</label>
            <textarea className="area mt-1" rows={5} defaultValue={'# My skill\n\n1. Read the changed files.\n2. Check against the guidelines.'} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] text-[var(--muted)]">Scope</span>
            <Segmented value={'project'} onChange={() => {}} options={[{ value: 'project', label: 'Project' }, { value: 'global', label: 'Global' }]} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

/* ------------------------------- project ------------------------------- */
function ProjectTab() {
  const { t } = useI18n();
  const toast = useStore((s) => s.toast);
  const [script, setScript] = useState('bun install\nbun run dev');
  const [secrets, setSecrets] = useState([
    { name: 'GHToken', value: 'ghp_2f9a7c4e1b', shown: false },
    { name: 'OPENAI_API_KEY', value: 'sk-live-9f2b', shown: false },
  ]);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="max-w-[720px]">
      <PageTitle>{t('settings.project')}</PageTitle>

      <Menu
        width={260}
        trigger={
          <button type="button" className="chip h-9 gap-2 mb-4">
            <FolderCog size={16} />
            VEXORA Complete
            <ChevronDown size={13} />
          </button>
        }
      >
        <MenuItem>VEXORA Complete</MenuItem>
        <MenuItem>Design System Extractor</MenuItem>
        <MenuItem icon={<Plus size={14} />}>New project…</MenuItem>
      </Menu>

      <SectionTitle icon={<TerminalSquare size={18} />} title={t('settings.startupScript')} help={t('settings.startupHint')} />
      <div className="card p-4 mt-2">
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          className="area font-mono text-[14px]"
          style={{ minHeight: 100, fontFamily: 'var(--font-mono)' }}
          dir="ltr"
          aria-label={t('settings.startupScript')}
        />
        <p className="text-[13px] text-[var(--muted)] mt-2">{t('settings.startupHint')}</p>
        <button type="button" className="text-[13.5px] text-[var(--muted)] hover:text-[var(--text)] mt-1" onClick={() => toast('Startup script ran')}>
          {t('settings.runNow')}
        </button>
      </div>

      <div className="mt-6">
        <SectionTitle icon={<KeyRound size={18} />} title={t('settings.secrets')} help="Values are stored encrypted and only shown masked." />
        <div className="card p-4 mt-2">
          <div className="flex flex-col gap-2">
            {secrets.map((s) => (
              <div key={s.name} className="flex items-center gap-2 py-1.5">
                <span className="font-mono text-[14px] w-[160px] truncate" dir="ltr">{s.name}</span>
                <span className="font-mono text-[13.5px] text-[var(--muted)] flex-1" dir="ltr">
                  {s.shown ? s.value : '••••••••'}
                </span>
                <IBtn
                  label={s.shown ? 'Hide value' : 'Reveal value'}
                  className="w-8 h-8"
                  onClick={() => setSecrets((all) => all.map((x) => (x.name === s.name ? { ...x, shown: !x.shown } : x)))}
                >
                  {s.shown ? <EyeOff size={16} /> : <Eye size={16} />}
                </IBtn>
                <Btn size="sm" variant="danger" onClick={() => setSecrets((all) => all.filter((x) => x.name !== s.name))}>{t('common.remove')}</Btn>
              </div>
            ))}
          </div>
          <div className="divider my-3" />
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                value={name}
                onValueChange={(v) => { setName(v.toUpperCase().replace(/[^A-Z0-9_]/g, '')); setError(''); }}
                placeholder={t('settings.secretName')}
                aria-label={t('settings.secretName')}
                className="font-mono"
              />
              <div className="flex-1 flex gap-2">
                <Input value={value} onValueChange={setValue} placeholder={t('settings.secretValue')} type="password" aria-label={t('settings.secretValue')} />
                <Btn
                  variant="inverse"
                  onClick={() => {
                    if (!name || !value) return;
                    if (secrets.some((s) => s.name === name)) { setError('Name already exists.'); return; }
                    setSecrets([...secrets, { name, value, shown: false }]);
                    setName(''); setValue(''); toast('Secret added');
                  }}
                >
                  {t('common.add')}
                </Btn>
              </div>
            </div>
            {error ? <div className="text-[12.5px]" style={{ color: 'var(--danger)' }}>{error}</div> : null}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <SectionTitle icon={<Code2 size={18} />} title={t('settings.instructions')} />
        <div className="card p-4 mt-2">
          <textarea className="area font-mono text-[13.5px]" rows={6} defaultValue={'# Project overview\nVEXORA is a Vite + React multi-page site.\n\n## Commands\n- bun run dev\n- bun run build'} style={{ fontFamily: 'var(--font-mono)' }} dir="ltr" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[12.5px] text-[var(--faint)]">Last read by the agent: 2m ago</span>
            <Btn size="sm" variant="outline" onClick={() => toast('Template inserted')}>Insert template</Btn>
          </div>
        </div>
      </div>

      <div className="mt-6 mb-8">
        <SectionTitle icon={<Trash2 size={18} />} title={t('settings.dangerZone')} />
        <div className="card p-4 mt-2 flex items-center justify-between gap-3" style={{ borderColor: 'color-mix(in srgb, var(--danger) 30%, var(--line))' }}>
          <p className="text-[13.5px] text-[var(--muted)]">Deleting a project removes its files, secrets and sessions.</p>
          <Btn variant="danger" onClick={() => toast('Project deletion needs confirmation')}>{t('settings.deleteProject')}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- keyboard ------------------------------- */
const SHORTCUTS = [
  ['General', [['Command palette', '⌘ K'], ['New chat', '⌘ ⇧ O'], ['Toggle drawer', '⌘ B'], ['Open settings', '⌘ ,']]],
  ['Chat', [['Focus composer', '⌘ L'], ['Send', 'Enter'], ['Stop agent', 'Esc'], ['Switch mode', 'Alt 1–4']]],
  ['Panels', [['Toggle terminal', '⌃ `'], ['Toggle files', '⌘ ⇧ E'], ['Close tab', '⌘ W']]],
  ['Changes', [['Accept hunk', 'Y'], ['Reject hunk', 'N'], ['Next change', 'J'], ['Commit', '⌘ Enter']]],
];

function KeyboardTab() {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [capture, setCapture] = useState<string | null>(null);
  return (
    <div className="max-w-[720px]">
      <PageTitle>{t('settings.keyboard')}</PageTitle>
      <SearchInput value={query} onValueChange={setQuery} placeholder={t('settings.searchShortcuts')} />
      <div className="mt-4 flex flex-col gap-5">
        {SHORTCUTS.map(([group, rows]) => {
          const list = (rows as string[][]).filter((r) => r[0].toLowerCase().includes(query.toLowerCase()));
          if (!list.length) return null;
          return (
            <div key={group as string}>
              <div className="text-[13px] uppercase tracking-wide text-[var(--faint)] mb-2">{group as string}</div>
              <SettingCard>
                {list.map(([label, keys]) => (
                  <div key={label} className="flex items-center gap-2 py-2.5">
                    <span className="text-[15px] flex-1">{label}</span>
                    {capture === label ? (
                      <span className="text-[12.5px] px-2 py-1 rounded-md" style={{ border: '1px solid var(--warning)', color: 'var(--warning)' }}>Press new keys…</span>
                    ) : (
                      <button type="button" onClick={() => setCapture(label)} aria-label={`Change ${label}`}>
                        <Kbd>{keys}</Kbd>
                      </button>
                    )}
                    <button type="button" className="text-[12px] text-[var(--faint)] hover:text-[var(--text)]" onClick={() => setCapture(null)}>Reset</button>
                  </div>
                ))}
              </SettingCard>
            </div>
          );
        })}
      </div>
      <Btn variant="ghost" className="mt-4" onClick={() => useStore.getState().toast('Shortcuts reset')}>{t('settings.resetAll')}</Btn>
    </div>
  );
}

/* ------------------------------- account ------------------------------- */
function AccountTab() {
  const { t } = useI18n();
  const toast = useStore((s) => s.toast);
  const [name, setName] = useState('Mohammed Hamra');
  return (
    <div className="max-w-[720px]">
      <PageTitle>{t('settings.account')}</PageTitle>
      <div className="card p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl grid place-items-center text-[20px] font-bold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>M</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-semibold">{name}</span>
            <Badge tone="accent">{t('settings.verified')}</Badge>
          </div>
          <div className="text-[13.5px] text-[var(--muted)]">mohammed@example.com</div>
        </div>
        <Btn variant="outline" size="sm" onClick={() => toast('Profile saved')}>{t('common.save')}</Btn>
      </div>

      <div className="mt-5">
        <SectionTitle icon={<UserCircle size={18} />} title={t('settings.profile')} />
        <SettingCard>
          <Row label={t('settings.displayName')}>
            <Input value={name} onValueChange={setName} className="w-52" />
          </Row>
          <Row label={t('settings.email')}>
            <span className="text-[14px] text-[var(--muted)]">mohammed@example.com</span>
          </Row>
          <Row label="GitHub" hint="Connected as @mhamad-code">
            <Btn size="sm" variant="outline" onClick={() => toast('GitHub disconnected')}>{t('common.disconnect')}</Btn>
          </Row>
          <Row label="Google">
            <Btn size="sm" variant="inverse" onClick={() => toast('Google connected')}>{t('common.connect')}</Btn>
          </Row>
          <Row label={t('settings.twoFactor')}>
            <Switch checked={false} onChange={() => toast('Two-factor setup')} label={t('settings.twoFactor')} />
          </Row>
        </SettingCard>
      </div>

      <div className="mt-5">
        <SectionTitle icon={<Shield size={18} />} title={t('settings.activeDevices')} />
        <SettingCard>
          <Row label="MacBook Pro · Chrome" hint="Berlin · current session">
            <Badge tone="accent">Current</Badge>
          </Row>
          <Row label="iPhone 15 · Safari" hint="Berlin · 2 hours ago">
            <Btn size="sm" variant="ghost" onClick={() => toast('Device signed out')}>Sign out</Btn>
          </Row>
        </SettingCard>
      </div>

      <div className="mt-5 mb-8">
        <SectionTitle icon={<Trash2 size={18} />} title={t('settings.dangerZone')} />
        <div className="card p-4 mt-2 flex items-center justify-between">
          <p className="text-[13.5px] text-[var(--muted)]">{t('settings.deleteAccount')}</p>
          <Btn variant="danger" size="sm" onClick={() => toast('Type your email to confirm')}>{t('settings.deleteAccount')}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- mcp ------------------------------- */
function McpTab() {
  const { t } = useI18n();
  const servers = useStore((s) => s.mcp);
  const toggle = useStore((s) => s.toggleMcp);
  const toggleTool = useStore((s) => s.toggleMcpTool);
  const toast = useStore((s) => s.toast);
  const [open, setOpen] = useState<string | null>('fs');

  return (
    <div className="max-w-[720px]">
      <div className="flex items-center justify-between gap-2">
        <PageTitle>MCP servers</PageTitle>
        <div className="flex gap-2 mb-4">
          <Btn variant="inverse" size="sm" onClick={() => toast('Add server')}>{t('common.add')}</Btn>
          <Btn variant="outline" size="sm" onClick={() => toast('Import JSON')}>Import JSON</Btn>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {servers.map((s) => {
          const dot = s.status === 'connected' ? 'var(--success)' : s.status === 'error' ? 'var(--danger)' : s.status === 'connecting' ? 'var(--warning)' : 'var(--faint)';
          return (
            <div key={s.id} className="card p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[10px] grid place-items-center" style={{ background: 'var(--elevated)', border: '1px solid var(--line)' }}>
                  <Plug size={17} />
                </div>
                <button type="button" className="flex-1 text-start min-w-0" onClick={() => setOpen(open === s.id ? null : s.id)}>
                  <div className="flex items-center gap-2">
                    <span className="text-[15.5px] font-semibold">{s.name}</span>
                    <Badge>{s.transport}</Badge>
                    <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
                    <span className="text-[12px] text-[var(--faint)]">{s.tools.length} tools</span>
                  </div>
                </button>
                <Switch checked={s.status !== 'disabled'} onChange={() => toggle(s.id)} label={s.name} />
                <ChevronDown size={16} className="text-[var(--muted)] cursor-pointer" style={{ transform: open === s.id ? undefined : 'rotate(-90deg)' }} onClick={() => setOpen(open === s.id ? null : s.id)} />
              </div>
              {open === s.id ? (
                <div className="mt-3 pt-3 border-t border-[var(--line)]">
                  <div className="flex items-center gap-2">
                    <code className="code-chip truncate flex-1" dir="ltr">{s.command}</code>
                    <Btn size="sm" variant="outline" onClick={() => toast('Connection ok · 42ms')}>Test connection</Btn>
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5">
                    {s.tools.map((tool) => (
                      <div key={tool.name} className="flex items-center gap-2 text-[13.5px]">
                        <span className="font-mono flex-1" dir="ltr">{tool.name}</span>
                        <Switch checked={tool.enabled} onChange={() => toggleTool(s.id, tool.name)} label={tool.name} />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[12.5px] text-[var(--muted)]">Permission policy</span>
                    <Select value={s.policy === 'ask' ? 'Ask' : s.policy === 'auto' ? 'Auto-allow' : 'Block'} options={['Ask', 'Auto-allow', 'Block']} onChange={() => {}} />
                    <Btn size="sm" variant="ghost" className="ms-auto" style={{ color: 'var(--danger)' }} onClick={() => toast('Server removed')}>{t('common.remove')}</Btn>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------- page ------------------------------- */
export default function Settings({ tab }: { tab: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const current = TABS.some((x) => x.id === tab) ? tab : 'general';

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <SearchInput value={query} onValueChange={setQuery} placeholder={t('settings.search')} />
        <div className="tabrow mt-3">
          {TABS.map(({ id, icon: Icon }, i) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={current === id}
              className="tab"
              ref={(el) => {
                if (el && current === id && i >= 4) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              }}
              onClick={() => navigate(`/settings/${id}`)}
            >
              <Icon size={18} />
              {t(`settings.${id}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-10 pt-2">
        {query ? (
          <div className="max-w-[720px]">
            <div className="text-[13px] text-[var(--muted)] mb-2">Results for “{query}”</div>
            {TABS.filter((x) => t(`settings.${x.id}`).toLowerCase().includes(query.toLowerCase())).map((x) => (
              <button key={x.id} type="button" className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--hover)] text-start" onClick={() => { navigate(`/settings/${x.id}`); setQuery(''); }}>
                <x.icon size={17} className="text-[var(--muted)]" />
                <span className="text-[15px]">{t(`settings.${x.id}`)}</span>
              </button>
            ))}
            {!TABS.some((x) => t(`settings.${x.id}`).toLowerCase().includes(query.toLowerCase())) ? (
              <div className="text-[14px] text-[var(--muted)] py-4">No settings match “{query}”.</div>
            ) : null}
          </div>
        ) : (
          <>
            {current === 'general' ? <GeneralTab /> : null}
            {current === 'account' ? <AccountTab /> : null}
            {current === 'appearance' ? <AppearanceTab /> : null}
            {current === 'usage' ? <UsageTab /> : null}
            {current === 'providers' ? <ProvidersTab /> : null}
            {current === 'project' ? <ProjectTab /> : null}
            {current === 'skills' ? <SkillsTab /> : null}
            {current === 'mcp' ? <McpTab /> : null}
            {current === 'keyboard' ? <KeyboardTab /> : null}
          </>
        )}
      </div>
    </div>
  );
}
