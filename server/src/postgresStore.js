import { seedData } from './seed.js';

const SNAPSHOT_ID = 'default';

let poolPromise;

const clone = (value) => JSON.parse(JSON.stringify(value));

export const getPostgresPool = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required when STORAGE_DRIVER=postgres.');
  }

  if (!poolPromise) {
    poolPromise = import('pg').then(({ Pool }) => new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    })).catch((error) => {
      if (error.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error('The "pg" package is required for PostgreSQL storage. Install dependencies before using STORAGE_DRIVER=postgres.');
      }
      throw error;
    });
  }

  return poolPromise;
};

const ensureSnapshotTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_state_snapshots (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

export const loadPostgresStore = async () => {
  const pool = await getPostgresPool();
  const client = await pool.connect();

  try {
    await ensureSnapshotTable(client);
    const result = await client.query('SELECT payload FROM app_state_snapshots WHERE id = $1', [SNAPSHOT_ID]);

    if (result.rows[0]) return result.rows[0].payload;

    const initial = clone(seedData);
    await client.query(
      'INSERT INTO app_state_snapshots (id, payload) VALUES ($1, $2::jsonb)',
      [SNAPSHOT_ID, JSON.stringify(initial)]
    );
    return initial;
  } finally {
    client.release();
  }
};

export const savePostgresStore = async (store) => {
  const pool = await getPostgresPool();
  await pool.query(
    `
      INSERT INTO app_state_snapshots (id, payload, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (id)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
    `,
    [SNAPSHOT_ID, JSON.stringify(store)]
  );
};

export const resetPostgresStore = async () => {
  const initial = clone(seedData);
  await savePostgresStore(initial);
  return initial;
};

export const closePostgresPool = async () => {
  if (!poolPromise) return;
  const pool = await poolPromise;
  await pool.end();
  poolPromise = null;
};
