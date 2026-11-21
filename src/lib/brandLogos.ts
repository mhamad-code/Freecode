import {
  siAnthropic,
  siAsana,
  siDeepseek,
  siFigma,
  siGithub,
  siGmail,
  siGooglecalendar,
  siGoogledrive,
  siGooglegemini,
  siJira,
  siLinear,
  siLmstudio,
  siMistralai,
  siNotion,
  siOllama,
  siOpenrouter,
  siOvh,
  siPosthog,
  siSentry,
  siStripe,
  siSupabase,
  siVercel,
  siZapier,
} from 'simple-icons';
import type { SimpleIcon } from 'simple-icons';

/**
 * Brand marks come from `simple-icons` (CC0 data) and are keyed by our own ids,
 * not theirs, so a catalog id never depends on a vendor slug. Brands that the
 * package does not ship (Slack, OpenAI, Groq, Together, xAI, Kilo, LLM7) are
 * deliberately absent: their tiles keep the monogram fallback instead of a
 * look-alike mark.
 */
const BRAND_ICONS: Record<string, SimpleIcon> = {
  // Integrations
  github: siGithub,
  gmail: siGmail,
  gcal: siGooglecalendar,
  gdrive: siGoogledrive,
  notion: siNotion,
  linear: siLinear,
  posthog: siPosthog,
  sentry: siSentry,
  supabase: siSupabase,
  vercel: siVercel,
  stripe: siStripe,
  figma: siFigma,
  jira: siJira,
  asana: siAsana,
  zapier: siZapier,
  // Providers
  'ovh-anon': siOvh,
  openrouter: siOpenrouter,
  gemini: siGooglegemini,
  anthropic: siAnthropic,
  deepseek: siDeepseek,
  mistral: siMistralai,
  ollama: siOllama,
  lmstudio: siLmstudio,
};

export function logoFor(id: string): SimpleIcon | undefined {
  return BRAND_ICONS[id];
}

/** The brand's own hex, as published in its guidelines; not a theme token. */
export function brandColor(id: string): string | undefined {
  const icon = BRAND_ICONS[id];
  return icon ? `#${icon.hex}` : undefined;
}

/** Ids that intentionally fall back to a monogram or a generic glyph. */
export const NO_BRAND_LOGO = [
  'slack',
  'openai',
  'groq',
  'together',
  'xai',
  'kilo-free',
  'llm7',
] as const;
