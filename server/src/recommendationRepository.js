import { getPostgresPool } from './postgresStore.js';
import { getStorageDriver } from './store.js';

export const usesNormalizedRecommendations = () => getStorageDriver() === 'postgres';

export const recordRecommendationEvent = async (userId, payload = {}) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      INSERT INTO recommendation_events (user_id, listing_id, event_type, score, metadata)
      VALUES ($1, $2, $3, $4, COALESCE($5::jsonb, '{}'))
      RETURNING id, user_id AS "userId", listing_id AS "listingId", event_type AS "eventType",
        score, metadata, created_at AS "createdAt"
    `,
    [
      userId || null,
      payload.listingId || payload.carId || null,
      payload.eventType || payload.action || 'view',
      payload.score === undefined ? null : Number(payload.score),
      JSON.stringify(payload.metadata || payload),
    ]
  );
  return { ...result.rows[0], score: result.rows[0].score === null ? null : Number(result.rows[0].score) };
};

export const listRecommendationEvents = async ({ userId, listingId, limit = 200 } = {}) => {
  const pool = await getPostgresPool();
  const clauses = [];
  const values = [];
  if (userId) {
    values.push(userId);
    clauses.push(`user_id = $${values.length}`);
  }
  if (listingId) {
    values.push(String(listingId));
    clauses.push(`listing_id::text = $${values.length}`);
  }
  values.push(Math.min(500, Number(limit) || 200));
  const result = await pool.query(
    `
      SELECT id, user_id AS "userId", listing_id AS "listingId", event_type AS "eventType",
        score, metadata, created_at AS "createdAt"
      FROM recommendation_events
      ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
      ORDER BY created_at DESC
      LIMIT $${values.length}
    `,
    values
  );
  return result.rows.map((row) => ({ ...row, score: row.score === null ? null : Number(row.score) }));
};

export const buildRecommendationStoreFromEvents = async (listings = [], userId = null) => {
  const events = await listRecommendationEvents({ userId, limit: 500 });
  return {
    listings,
    recommendationFeedback: events.map((event) => ({
      id: event.id,
      userId: event.userId,
      listingId: event.listingId,
      action: event.eventType,
      score: event.score,
      ...event.metadata,
    })),
    bids: [],
    auctions: [],
    savedSearches: events
      .filter((event) => event.eventType === 'saved_search')
      .map((event) => ({ userId: event.userId, query: event.metadata?.query || event.metadata || {} })),
  };
};

export const saveRecommendationModelItems = async (modelVersion, rankedListings = []) => {
  const pool = await getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM recommendation_model_items WHERE model_version = $1', [modelVersion]);
    for (const listing of rankedListings) {
      await client.query(
        `
          INSERT INTO recommendation_model_items (
            model_version, listing_id, hybrid_score, content_score, collaborative_score, feature_vector, reasons
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
          ON CONFLICT (model_version, listing_id)
          DO UPDATE SET
            hybrid_score = EXCLUDED.hybrid_score,
            content_score = EXCLUDED.content_score,
            collaborative_score = EXCLUDED.collaborative_score,
            feature_vector = EXCLUDED.feature_vector,
            reasons = EXCLUDED.reasons,
            created_at = NOW()
        `,
        [
          modelVersion,
          listing.id,
          Number(listing.hybridScore || listing.aiMatchScore || listing.recommendationScore || 0),
          Number(listing.contentScore || 0),
          Number(listing.collaborativeScore || 0),
          JSON.stringify({
            make: listing.make,
            model: listing.model,
            city: listing.city,
            bodyStyle: listing.bodyStyle,
            price: listing.buyNowPrice || listing.askingPrice || listing.highBid || 0,
            dealScore: listing.dealScore || 0,
            trustScore: listing.trustScore || 0,
          }),
          JSON.stringify(listing.aiReasons || []),
        ]
      );
    }
    await client.query('COMMIT');
    return { modelVersion, indexed: rankedListings.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const listRecommendationModelItems = async (modelVersion = 'default', limit = 100) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      SELECT r.id, r.model_version AS "modelVersion", r.listing_id AS "listingId",
        r.hybrid_score AS "hybridScore", r.content_score AS "contentScore",
        r.collaborative_score AS "collaborativeScore", r.feature_vector AS "featureVector",
        r.reasons, r.created_at AS "createdAt",
        l.make, l.model, l.variant, l.city, l.body_style AS "bodyStyle", l.asking_price AS "askingPrice"
      FROM recommendation_model_items r
      LEFT JOIN listings l ON l.id = r.listing_id
      WHERE r.model_version = $1
      ORDER BY r.hybrid_score DESC
      LIMIT $2
    `,
    [modelVersion, Math.min(500, Number(limit) || 100)]
  );
  return result.rows.map((row) => ({
    ...row,
    hybridScore: Number(row.hybridScore) || 0,
    contentScore: Number(row.contentScore) || 0,
    collaborativeScore: Number(row.collaborativeScore) || 0,
    askingPrice: row.askingPrice === null ? null : Number(row.askingPrice),
  }));
};
