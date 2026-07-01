import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadPostgresStore, resetPostgresStore, savePostgresStore } from './postgresStore.js';
import { seedData } from './seed.js';

const dataFile = resolve(process.env.DATA_FILE || './data/dev-db.json');
const storageDriver = process.env.STORAGE_DRIVER || 'json';

const clone = (value) => JSON.parse(JSON.stringify(value));

const jsonAdapter = {
  name: 'json',
  mode: 'development',
  async load() {
    try {
      const raw = await readFile(dataFile, 'utf8');
      return JSON.parse(raw);
    } catch {
      await mkdir(dirname(dataFile), { recursive: true });
      const initial = clone(seedData);
      await writeFile(dataFile, JSON.stringify(initial, null, 2));
      return initial;
    }
  },
  async save(store) {
    await mkdir(dirname(dataFile), { recursive: true });
    await writeFile(dataFile, JSON.stringify(store, null, 2));
  },
};

const postgresAdapter = {
  name: 'postgres',
  mode: 'database-snapshot',
  load: loadPostgresStore,
  save: savePostgresStore,
  reset: resetPostgresStore,
};

const getAdapter = () => {
  if (storageDriver === 'json') return jsonAdapter;
  if (storageDriver === 'postgres') return postgresAdapter;
  throw new Error(`Unknown STORAGE_DRIVER "${storageDriver}". Use "json" or "postgres".`);
};

export const getStorageInfo = () => ({
  driver: storageDriver,
  mode: getAdapter().mode,
  dataFile: storageDriver === 'json' ? dataFile : undefined,
  databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
});

export const getStorageDriver = () => storageDriver;

export const loadStore = async () => getAdapter().load();

export const saveStore = async (store) => getAdapter().save(store);

export const withStore = async (handler) => {
  const store = await loadStore();
  const result = await handler(store);
  await saveStore(store);
  return result;
};

export const resetStore = async () => {
  const adapter = getAdapter();
  if (adapter.reset) return adapter.reset();
  const initial = clone(seedData);
  await adapter.save(initial);
  return initial;
};
