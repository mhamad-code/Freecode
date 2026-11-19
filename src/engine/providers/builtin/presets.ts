import type { ProviderConfig, Protocol } from '../types';

export interface Preset {
  id: string;
  label: string;
  baseUrl: string;
  protocol: Protocol;
  keyLabel: string;
  note?: string;
}

export const PRESETS: Preset[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    protocol: 'openai-compatible',
    keyLabel: 'OpenRouter API key',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    protocol: 'openai-compatible',
    keyLabel: 'Gemini API key',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    protocol: 'anthropic',
    keyLabel: 'Anthropic API key',
    note: 'The key is stored only on this device.',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    protocol: 'openai-compatible',
    keyLabel: 'OpenAI API key',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    protocol: 'openai-compatible',
    keyLabel: 'DeepSeek API key',
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    protocol: 'openai-compatible',
    keyLabel: 'Groq API key',
  },
  {
    id: 'mistral',
    label: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    protocol: 'openai-compatible',
    keyLabel: 'Mistral API key',
  },
  {
    id: 'xai',
    label: 'xAI',
    baseUrl: 'https://api.x.ai/v1',
    protocol: 'openai-compatible',
    keyLabel: 'xAI API key',
  },
  {
    id: 'together',
    label: 'Together',
    baseUrl: 'https://api.together.xyz/v1',
    protocol: 'openai-compatible',
    keyLabel: 'Together API key',
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    protocol: 'openai-compatible',
    keyLabel: 'Token (optional)',
    note: 'Set OLLAMA_ORIGINS to allow this site. HTTPS→localhost may prompt for local network access.',
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (local)',
    baseUrl: 'http://localhost:1234/v1',
    protocol: 'openai-compatible',
    keyLabel: 'Token (optional)',
    note: 'Enable CORS in LM Studio server settings.',
  },
];

export function presetConfig(preset: Preset, order: number): ProviderConfig {
  return {
    id: preset.id,
    label: preset.label,
    kind: 'preset',
    protocol: preset.protocol,
    baseUrl: preset.baseUrl,
    enabled: true,
    order,
    auth: preset.id === 'ollama' || preset.id === 'lmstudio' ? { type: 'none' } : { type: 'bearer' },
    keys: [],
    headers: [],
    catalog: {
      path: preset.protocol === 'anthropic' ? '' : '/models',
      parser: preset.id === 'openrouter' ? 'openrouter' : 'openai',
      freeFilter: preset.id === 'openrouter' ? 'suffix:free' : 'none',
    },
    quirks: {
      supportsStreamUsage: preset.id !== 'gemini',
      supportsParallelTools: preset.protocol === 'openai-compatible',
      strictTemplates: false,
    },
    corsStatus: 'unknown',
    models: [],
  };
}

export function customProvider(order: number): ProviderConfig {
  return {
    id: `custom-${Date.now().toString(36)}`,
    label: 'Custom provider',
    kind: 'custom',
    protocol: 'openai-compatible',
    baseUrl: '',
    enabled: true,
    order,
    auth: { type: 'bearer' },
    keys: [],
    headers: [],
    catalog: { path: '/models', parser: 'openai', freeFilter: 'none' },
    quirks: { supportsStreamUsage: false, supportsParallelTools: false, strictTemplates: false },
    corsStatus: 'unknown',
    models: [],
  };
}
