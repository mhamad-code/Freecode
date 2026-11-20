import type { Integration } from './types';

/**
 * Supported integrations. This is the product registry: every entry starts
 * with no connected account. Nothing here is a demo connection.
 */
export const INTEGRATION_CATALOG: Integration[] = [
  { id: 'github', name: 'GitHub', category: 'popular', monogram: 'G', color: '#24292f', accounts: [] },
  { id: 'gmail', name: 'Gmail', category: 'popular', monogram: 'M', color: '#ea4335', accounts: [] },
  { id: 'gcal', name: 'Google Calendar', category: 'popular', monogram: '31', color: '#4285f4', accounts: [] },
  { id: 'gdrive', name: 'Google Drive', category: 'popular', monogram: '▲', color: '#0f9d58', accounts: [] },
  { id: 'slack', name: 'Slack', category: 'popular', monogram: '#', color: '#4a154b', accounts: [] },
  { id: 'notion', name: 'Notion', category: 'popular', monogram: 'N', color: '#111111', accounts: [] },
  { id: 'linear', name: 'Linear', category: 'popular', monogram: 'L', color: '#5e6ad2', accounts: [] },
  { id: 'posthog', name: 'PostHog', category: 'popular', monogram: 'P', color: '#f54e00', accounts: [] },
  { id: 'sentry', name: 'Sentry', category: 'popular', monogram: 'S', color: '#362d59', accounts: [] },
  { id: 'supabase', name: 'Supabase', category: 'popular', monogram: 'Sb', color: '#3ecf8e', accounts: [] },
  { id: 'vercel', name: 'Vercel', category: 'popular', monogram: 'V', color: '#000000', accounts: [] },
  { id: 'stripe', name: 'Stripe', category: 'popular', monogram: 'st', color: '#635bff', accounts: [] },
  { id: 'figma', name: 'Figma', category: 'popular', monogram: 'F', color: '#a259ff', accounts: [] },
  { id: 'jira', name: 'Jira', category: 'popular', monogram: 'J', color: '#0052cc', accounts: [] },
  { id: 'asana', name: 'Asana', category: 'popular', monogram: 'A', color: '#f06a6a', accounts: [] },
  { id: 'zapier', name: 'Zapier', category: 'popular', monogram: 'Z', color: '#ff4f00', accounts: [] },
];
