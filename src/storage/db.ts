import { deleteDB, openDB } from 'idb';

export const SCHEMA_VERSION = 1;

export const STORES = [
  'meta',
  'settings',
  'providers',
  'sessions',
  'messages',
  'blobs',
  'projects',
  'checkpoints',
  'skills',
  'mcpServers',
  'integrations',
  'usage',
  'activity',
  'memories',
  'requestLog',
  'pendingHandoff',
  'vaultKeys',
  'vaultItems',
  'projectFs',
] as const;

export type StoreName = (typeof STORES)[number];

export interface KeyValueDB {
  get(store: string, key: unknown): Promise<unknown>;
  put(store: string, value: unknown, key?: unknown): Promise<unknown>;
  delete(store: string, key: unknown): Promise<void>;
  getAll(store: string): Promise<unknown[]>;
  getAllFromIndex(store: string, index: string, query?: unknown): Promise<unknown[]>;
  clear(store: string): Promise<void>;
}

export const dbName = (profileId: string) => `freecode:${profileId}`;

export async function openProfileDb(profileId: string): Promise<KeyValueDB> {
  const db = await openDB(dbName(profileId), SCHEMA_VERSION, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        database.createObjectStore('meta');
        database.createObjectStore('settings');
        database.createObjectStore('providers').createIndex('order', 'order');
        const sessions = database.createObjectStore('sessions');
        sessions.createIndex('projectId', 'projectId');
        sessions.createIndex('updatedAt', 'updatedAt');
        database.createObjectStore('messages').createIndex('sessionId', 'sessionId');
        database.createObjectStore('blobs').createIndex('sessionId', 'sessionId');
        database.createObjectStore('projects');
        const checkpoints = database.createObjectStore('checkpoints');
        checkpoints.createIndex('projectId', 'projectId');
        checkpoints.createIndex('sessionId', 'sessionId');
        database.createObjectStore('skills').createIndex('scope', 'scope');
        database.createObjectStore('mcpServers');
        database.createObjectStore('integrations');
        database.createObjectStore('usage').createIndex('ts', 'ts');
        const activity = database.createObjectStore('activity');
        activity.createIndex('ts', 'ts');
        activity.createIndex('sessionId', 'sessionId');
        database.createObjectStore('memories');
        database.createObjectStore('requestLog').createIndex('ts', 'ts');
        database.createObjectStore('pendingHandoff');
        database.createObjectStore('vaultKeys');
        database.createObjectStore('vaultItems');
        database.createObjectStore('projectFs');
      }
    },
  });
  return db as unknown as KeyValueDB;
}

export async function deleteProfileDb(profileId: string): Promise<void> {
  await deleteDB(dbName(profileId));
}

/** Typed repository over one object store. */
export class Repo<T> {
  constructor(
    private readonly db: KeyValueDB,
    private readonly store: StoreName,
    private readonly keyOf: (value: T) => string,
  ) {}

  async get(id: string): Promise<T | undefined> {
    return (await this.db.get(this.store, id)) as T | undefined;
  }

  async put(value: T): Promise<void> {
    await this.db.put(this.store, value, this.keyOf(value));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(this.store, id);
  }

  async all(): Promise<T[]> {
    return (await this.db.getAll(this.store)) as T[];
  }

  async byIndex(index: string, query: unknown): Promise<T[]> {
    return (await this.db.getAllFromIndex(this.store, index, query)) as T[];
  }

  async clear(): Promise<void> {
    await this.db.clear(this.store);
  }
}
