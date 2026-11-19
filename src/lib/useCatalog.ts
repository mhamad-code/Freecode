import { useEffect, useState } from 'react';
import type { ProviderConfig } from '../engine/providers/types';
import { loadProviders } from './providersStore';

export function useCatalog(): ProviderConfig[] {
  const [providers, setProviders] = useState<ProviderConfig[]>(() => loadProviders());

  useEffect(() => {
    const update = () => setProviders(loadProviders());
    window.addEventListener('fc:providers', update);
    window.addEventListener('storage', update);
    update();
    return () => {
      window.removeEventListener('fc:providers', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return providers;
}
