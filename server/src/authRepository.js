import { getPostgresPool } from './postgresStore.js';
import { getStorageDriver } from './store.js';

export const usesNormalizedAuth = () => getStorageDriver() === 'postgres';

const mapUserRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    passwordHash: row.passwordHash,
    roles: row.roles || ['buyer'],
    status: row.status,
    fullName: row.fullName,
    city: row.city,
    emailVerified: row.emailVerified,
    phoneVerified: row.phoneVerified,
    notificationPreferences: row.notificationPreferences || {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const mapSessionRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    refreshTokenHash: row.refreshTokenHash,
    status: row.status || 'active',
    userAgent: row.userAgent,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
  };
};

const userSelect = `
  SELECT
    u.id,
    u.email,
    u.phone,
    u.password_hash AS "passwordHash",
    u.status,
    u.email_verified AS "emailVerified",
    u.phone_verified AS "phoneVerified",
    u.created_at AS "createdAt",
    u.updated_at AS "updatedAt",
    p.full_name AS "fullName",
    p.city,
    p.notification_preferences AS "notificationPreferences",
    COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::TEXT[]) AS roles
  FROM users u
  LEFT JOIN user_profiles p ON p.user_id = u.id
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
`;

const userGroup = `
  GROUP BY
    u.id,
    p.full_name,
    p.city,
    p.notification_preferences
`;

export const findAuthUserByEmail = async (email) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `${userSelect} WHERE LOWER(u.email) = LOWER($1) ${userGroup}`,
    [email]
  );
  return mapUserRow(result.rows[0]);
};

export const findAuthUserById = async (id) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `${userSelect} WHERE u.id = $1 ${userGroup}`,
    [id]
  );
  return mapUserRow(result.rows[0]);
};

export const createAuthUser = async ({ email, phone, fullName, city, passwordHash, roles = ['buyer'] }) => {
  const pool = await getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows[0]) {
      await client.query('ROLLBACK');
      return { conflict: true };
    }

    const userResult = await client.query(
      `
        INSERT INTO users (email, phone, password_hash, status)
        VALUES ($1, $2, $3, 'active')
        RETURNING id
      `,
      [email, phone || null, passwordHash]
    );
    const userId = userResult.rows[0].id;

    await client.query(
      `
        INSERT INTO user_profiles (user_id, full_name, city)
        VALUES ($1, $2, $3)
      `,
      [userId, fullName, city || null]
    );

    for (const roleName of roles.length ? roles : ['buyer']) {
      const roleResult = await client.query(
        `
          INSERT INTO roles (name)
          VALUES ($1)
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `,
        [roleName]
      );
      await client.query(
        `
          INSERT INTO user_roles (user_id, role_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `,
        [userId, roleResult.rows[0].id]
      );
    }

    await client.query(
      `
        INSERT INTO kyc_profiles (user_id, status)
        VALUES ($1, 'not_started')
        ON CONFLICT (user_id) DO NOTHING
      `,
      [userId]
    );

    await client.query(
      `
        INSERT INTO wallet_accounts (user_id, currency)
        VALUES ($1, 'PKR')
        ON CONFLICT (user_id) DO NOTHING
      `,
      [userId]
    );

    await client.query(
      `
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id)
        VALUES ($1, 'auth.register', 'user', $1)
      `,
      [userId]
    );

    await client.query('COMMIT');
    return { user: await findAuthUserById(userId) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const createAuthSession = async ({ userId, refreshTokenHash, userAgent, ipAddress, expiresAt }) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at, status, last_seen_at)
      VALUES ($1, $2, $3, $4, $5, 'active', NOW())
      RETURNING
        id,
        user_id AS "userId",
        refresh_token_hash AS "refreshTokenHash",
        status,
        user_agent AS "userAgent",
        ip_address AS "ipAddress",
        created_at AS "createdAt",
        last_seen_at AS "lastSeenAt",
        expires_at AS "expiresAt",
        revoked_at AS "revokedAt"
    `,
    [userId, refreshTokenHash, userAgent || null, ipAddress || null, expiresAt]
  );
  return mapSessionRow(result.rows[0]);
};

export const findAuthSessionById = async (id) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      SELECT
        id,
        user_id AS "userId",
        refresh_token_hash AS "refreshTokenHash",
        status,
        user_agent AS "userAgent",
        ip_address AS "ipAddress",
        created_at AS "createdAt",
        last_seen_at AS "lastSeenAt",
        expires_at AS "expiresAt",
        revoked_at AS "revokedAt"
      FROM sessions
      WHERE id = $1
    `,
    [id]
  );
  return mapSessionRow(result.rows[0]);
};

export const findAuthSessionByRefreshHash = async (refreshTokenHash) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      SELECT
        id,
        user_id AS "userId",
        refresh_token_hash AS "refreshTokenHash",
        status,
        user_agent AS "userAgent",
        ip_address AS "ipAddress",
        created_at AS "createdAt",
        last_seen_at AS "lastSeenAt",
        expires_at AS "expiresAt",
        revoked_at AS "revokedAt"
      FROM sessions
      WHERE refresh_token_hash = $1
      LIMIT 1
    `,
    [refreshTokenHash]
  );
  return mapSessionRow(result.rows[0]);
};

export const touchAuthSession = async (id) => {
  const pool = await getPostgresPool();
  await pool.query('UPDATE sessions SET last_seen_at = NOW() WHERE id = $1', [id]);
};

export const revokeAuthSession = async (id) => {
  const pool = await getPostgresPool();
  await pool.query(
    `
      UPDATE sessions
      SET status = 'revoked', revoked_at = COALESCE(revoked_at, NOW())
      WHERE id = $1
    `,
    [id]
  );
};

export const listAuthSessions = async (userId) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      SELECT
        id,
        user_id AS "userId",
        refresh_token_hash AS "refreshTokenHash",
        status,
        user_agent AS "userAgent",
        ip_address AS "ipAddress",
        created_at AS "createdAt",
        last_seen_at AS "lastSeenAt",
        expires_at AS "expiresAt",
        revoked_at AS "revokedAt"
      FROM sessions
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [userId]
  );
  return result.rows.map(mapSessionRow);
};

export const updateAuthUser = async (id, patch = {}) => {
  const pool = await getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `
        UPDATE users
        SET phone = COALESCE($2, phone), updated_at = NOW()
        WHERE id = $1
      `,
      [id, patch.phone ?? null]
    );
    await client.query(
      `
        UPDATE user_profiles
        SET
          full_name = COALESCE($2, full_name),
          city = COALESCE($3, city),
          notification_preferences = COALESCE($4::jsonb, notification_preferences),
          updated_at = NOW()
        WHERE user_id = $1
      `,
      [
        id,
        patch.fullName ?? null,
        patch.city ?? null,
        patch.notificationPreferences ? JSON.stringify(patch.notificationPreferences) : null,
      ]
    );
    await client.query(
      `
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id)
        VALUES ($1, 'auth.update_me', 'user', $1)
      `,
      [id]
    );
    await client.query('COMMIT');
    return findAuthUserById(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateAuthPassword = async (id, passwordHash) => {
  const pool = await getPostgresPool();
  await pool.query('UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1', [id, passwordHash]);
  await pool.query(
    'INSERT INTO audit_logs (actor_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $1)',
    [id, 'auth.password_reset_completed', 'user']
  );
  return findAuthUserById(id);
};

export const markAuthVerification = async (id, field) => {
  const column = field === 'phone' ? 'phone_verified' : 'email_verified';
  const action = field === 'phone' ? 'auth.verify_phone' : 'auth.verify_email';
  const pool = await getPostgresPool();
  await pool.query(`UPDATE users SET ${column} = TRUE, updated_at = NOW() WHERE id = $1`, [id]);
  await pool.query(
    'INSERT INTO audit_logs (actor_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $1)',
    [id, action, 'user']
  );
  return findAuthUserById(id);
};
