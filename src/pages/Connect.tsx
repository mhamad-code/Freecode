import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, Loader2, X } from 'lucide-react';
import { useStore } from '../store';
import logo from '../assets/brand/logo.png';

type Field = { key: string; label: string; placeholder?: string; value?: string; helper?: string; password?: boolean };

const SERVICES: Record<
  string,
  { name: string; monogram: string; color: string; oauth?: boolean; fields?: Field[]; description?: string }
> = {
  supabase: {
    name: 'Supabase',
    monogram: 'Sb',
    color: '#3ecf8e',
    fields: [
      {
        key: 'baseUrl',
        label: 'Base URL',
        value: 'https://api.supabase.com',
        helper: 'The management API URL for your Supabase organization. Keep the default unless you self-host.',
      },
      { key: 'token', label: 'Access token', placeholder: 'sbp_…', helper: 'Create a personal access token in Supabase → Account → Access tokens.', password: true },
    ],
  },
  github: {
    name: 'GitHub',
    monogram: 'G',
    color: '#24292f',
    fields: [{ key: 'token', label: 'Personal access token', placeholder: 'ghp_…', helper: 'Needs the repo scope. Fine-grained tokens work too.', password: true }],
  },
  gmail: { name: 'Gmail', monogram: 'M', color: '#ea4335', oauth: true, description: 'Read, search and draft email on your behalf.' },
  gcal: { name: 'Google Calendar', monogram: '31', color: '#4285f4', oauth: true, description: 'Read your calendars and create events.' },
  gdrive: { name: 'Google Drive', monogram: '▲', color: '#0f9d58', oauth: true, description: 'Access files and folders in your Drive.' },
  slack: { name: 'Slack', monogram: '#', color: '#4a154b', oauth: true, description: 'Read channels and post messages as you.' },
  notion: { name: 'Notion', monogram: 'N', color: '#111111', oauth: true, description: 'Read and write pages in your workspace.' },
  linear: { name: 'Linear', monogram: 'L', color: '#5e6ad2', oauth: true, description: 'Read issues and create or update them.' },
  figma: { name: 'Figma', monogram: 'F', color: '#a259ff', oauth: true, description: 'Read files and export assets.' },
  vercel: { name: 'Vercel', monogram: 'V', color: '#000000', oauth: true, description: 'Read projects and trigger deployments.' },
  stripe: { name: 'Stripe', monogram: 'st', color: '#635bff', oauth: true, description: 'Read customers, payments and products.' },
  sentry: { name: 'Sentry', monogram: 'S', color: '#362d59', oauth: true, description: 'Read issues and stack traces.' },
  posthog: { name: 'PostHog', monogram: 'P', color: '#f54e00', oauth: true, description: 'Query product analytics.' },
  jira: { name: 'Jira', monogram: 'J', color: '#0052cc', oauth: true, description: 'Read and create issues.' },
  asana: { name: 'Asana', monogram: 'A', color: '#f06a6a', oauth: true, description: 'Read tasks and projects.' },
  zapier: { name: 'Zapier', monogram: 'Z', color: '#ff4f00', oauth: true, description: 'Trigger Zaps from agent runs.' },
};

export default function Connect({ onDone }: { onDone: (id?: string) => void }) {
  const { service = 'supabase' } = useParams();
  const navigate = useNavigate();
  const cfg = SERVICES[service] ?? { name: service, monogram: service.slice(0, 2).toUpperCase(), color: '#444', oauth: true, description: 'Connect this service.' };
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    cfg.fields?.forEach((f) => (init[f.key] = f.value ?? ''));
    return init;
  });
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const connectIntegration = useStore((s) => s.connectIntegration);
  const [popup, setPopup] = useState(false);

  const required = cfg.fields?.filter((f) => !f.value) ?? [];
  const ready = cfg.oauth ? true : required.every((f) => values[f.key]?.trim());

  const finish = (account?: string) => {
    setState('loading');
    window.setTimeout(() => {
      setState('success');
      connectIntegration(service, account || `${cfg.name} account`);
      window.setTimeout(() => onDone(service), 1100);
    }, 1100);
  };

  return (
    <div className="connect-root min-h-[100dvh] relative overflow-y-auto" style={{ background: '#fafafa', color: '#111' }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        aria-hidden
      />
      <div className="relative min-h-[100dvh] flex flex-col items-center justify-center py-8 px-4">
        <button
          type="button"
          onClick={() => navigate('/integrations')}
          className="mb-4 inline-flex items-center gap-1 text-[13.5px] text-[#6b6b6b] hover:text-[#111]"
        >
          <ChevronLeft size={15} />
          Back to integrations
        </button>

        <div
          className="w-full overflow-hidden relative"
          style={{
            maxWidth: 440,
            background: '#ffffff',
            borderRadius: 16,
            boxShadow: '0 1px 2px rgba(0,0,0,.06), 0 8px 30px rgba(0,0,0,.06)',
            border: '1px solid #efefef',
          }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => navigate('/integrations')}
            className="absolute top-3 right-3 z-10 w-8 h-8 grid place-items-center rounded-full"
            style={{ background: 'rgba(255,255,255,.7)', color: '#6b6b6b' }}
          >
            <X size={17} />
          </button>

          <div
            className="relative flex flex-col items-center justify-center px-6 text-center"
            style={{
              height: 200,
              background: 'linear-gradient(135deg, #e3d2ff 0%, #f1a9bf 45%, #fbc3a0 80%, #ffffff 100%)',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="grid place-items-center"
                style={{ width: 68, height: 68, borderRadius: 18, background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}
              >
                <img src={logo} width={42} height={42} alt="Freecode" style={{ borderRadius: 10 }} />
              </span>
              <span className="relative flex flex-col gap-1.5 mx-1" aria-hidden>
                <span className="h-[2px] w-6 rounded-full" style={{ background: '#8b5cf6', animation: 'drawLine .6s ease both' }} />
                <span className="h-[2px] w-6 rounded-full" style={{ background: '#fb923c', animation: 'drawLine .6s .1s ease both' }} />
              </span>
              <span
                className="grid place-items-center"
                style={{ width: 68, height: 68, borderRadius: 18, background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,.12)', color: cfg.color, fontWeight: 700, fontSize: 28 }}
              >
                {cfg.monogram}
              </span>
            </div>
            <h1 className="mt-4 text-[22px] font-bold leading-snug" style={{ color: '#111', maxWidth: 340 }}>
              Freecode wants to connect to your {cfg.name}
            </h1>
            <style>{`@keyframes drawLine{from{transform:scaleX(0);transform-origin:left}to{transform:scaleX(1);transform-origin:left}}`}</style>
          </div>

          {state === 'success' ? (
            <div className="px-6 py-10 flex flex-col items-center text-center">
              <span className="w-14 h-14 rounded-full grid place-items-center" style={{ background: '#e7f5e1', color: '#3f7a2a' }}>
                <Check size={30} />
              </span>
              <div className="text-[20px] font-semibold mt-3">Connected</div>
              <p className="text-[14px] mt-1" style={{ color: '#777' }}>Returning to Integrations…</p>
            </div>
          ) : (
            <>
              <div className="px-6 pt-6 pb-5">
                {cfg.oauth ? (
                  <p className="text-[15px] leading-relaxed" style={{ color: '#5f5f63' }}>
                    {cfg.description} You&apos;ll sign in to {cfg.name} and approve access. Nothing is stored on our servers.
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {cfg.fields?.map((f) => (
                      <div key={f.key}>
                        <label htmlFor={f.key} className="text-[15px] font-semibold" style={{ color: '#6b6b6b' }}>
                          {f.label} <span style={{ color: '#d33' }}>*</span>
                        </label>
                        {f.helper ? <p className="text-[13px] leading-relaxed mt-1" style={{ color: '#7a7a7a' }}>{f.helper}</p> : null}
                        <input
                          id={f.key}
                          type={f.password ? 'password' : 'text'}
                          value={values[f.key] ?? ''}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="mt-1.5 w-full outline-none transition-shadow"
                          style={{
                            height: 52,
                            borderRadius: 12,
                            background: '#fafafa',
                            border: '1px solid #d9d9de',
                            padding: '0 14px',
                            fontSize: 18,
                            color: '#111',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.border = '2px solid #6366f1';
                            e.currentTarget.style.boxShadow = '0 0 0 4px rgba(99,102,241,.25)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.border = '1px solid #d9d9de';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          dir="ltr"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {state === 'error' ? (
                  <div className="mt-4 px-3 py-2 rounded-lg text-[13.5px]" style={{ background: '#fdecec', color: '#b3261e', border: '1px solid #f5c2c0' }}>
                    Could not connect. Check the credentials and try again.
                  </div>
                ) : null}
              </div>

              <div className="px-6 py-5" style={{ borderTop: '1px solid #eee' }}>
                <button
                  type="button"
                  disabled={!ready || state === 'loading'}
                  onClick={() => (cfg.oauth ? setPopup(true) : finish())}
                  className="w-full inline-flex items-center justify-center gap-2 font-medium transition-transform active:translate-y-px"
                  style={{
                    height: 52,
                    borderRadius: 12,
                    background: ready ? '#6bb34f' : '#b5cfa8',
                    color: ready ? '#12301a' : '#2c3a26',
                    fontSize: 17,
                    cursor: ready ? 'pointer' : 'not-allowed',
                  }}
                >
                  {state === 'loading' ? <Loader2 size={18} className="animate-spin" /> : null}
                  {state === 'loading' ? 'Connecting…' : cfg.oauth ? `Continue with ${cfg.name}` : 'Connect Account'}
                </button>
                <div className="text-center text-[13px] mt-3" style={{ color: '#777' }}>
                  Secured by Composio
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {popup ? (
        <div className="fixed inset-0 z-20 grid place-items-center p-4" style={{ background: 'rgba(0,0,0,.35)' }}>
          <div className="w-full overflow-hidden" style={{ maxWidth: 420, background: '#fff', borderRadius: 12, boxShadow: '0 24px 60px rgba(0,0,0,.3)' }}>
            <div className="flex items-center gap-2 px-3 h-9 text-[12px]" style={{ background: '#f2f2f2', borderBottom: '1px solid #e5e5e5', color: '#666' }}>
              <span className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
              </span>
              <span className="mx-auto">{cfg.name} authorization</span>
            </div>
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-xl grid place-items-center text-[20px] font-bold" style={{ background: '#f3f3f3', color: cfg.color }}>
                {cfg.monogram}
              </div>
              <div className="text-[17px] font-semibold mt-3">Authorize Freecode</div>
              <p className="text-[13.5px] mt-1" style={{ color: '#666' }}>
                {cfg.name} will share the scopes you approve with Freecode.
              </p>
              <div className="flex gap-2 mt-5">
                <button type="button" className="flex-1 h-10 rounded-lg text-[14px]" style={{ background: '#f2f2f2', color: '#333' }} onClick={() => setPopup(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 h-10 rounded-lg text-[14px] font-medium"
                  style={{ background: '#6bb34f', color: '#12301a' }}
                  onClick={() => { setPopup(false); finish(); }}
                >
                  Authorize
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
