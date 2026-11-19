export interface Migration {
  version: number;
  name: string;
  up: (data: Record<string, unknown>) => Record<string, unknown>;
}

/** Each step must be pure and must never delete user content. */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'baseline',
    up: (data) => ({ ...data, schemaVersion: 1 }),
  },
];

export function migrate(
  data: Record<string, unknown>,
  from: number,
  to: number,
): Record<string, unknown> {
  let current = { ...data };
  for (const step of MIGRATIONS) {
    if (step.version <= from || step.version > to) continue;
    current = step.up(current);
  }
  return { ...current, schemaVersion: to };
}

/** Refuses to open data written by a newer major schema. */
export function assertCompatible(version: number, current = 1): void {
  if (version > current) {
    throw new Error(`This data needs a newer version of Freecode (schema ${version}).`);
  }
}
