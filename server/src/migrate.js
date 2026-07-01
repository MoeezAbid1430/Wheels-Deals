import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const getPool = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run database migrations.');
  }

  const { Pool } = await import('pg').catch((error) => {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error('The "pg" package is required to run migrations. Install dependencies first.');
    }
    throw error;
  });

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
};

const run = async () => {
  const pool = await getPool();
  const schemaPath = resolve('database/schema.sql');
  const schema = await readFile(schemaPath, 'utf8');

  try {
    await pool.query(schema);
    console.log('Database migration completed.');
  } finally {
    await pool.end();
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
