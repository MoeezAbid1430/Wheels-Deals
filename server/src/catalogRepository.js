import { getPostgresPool } from './postgresStore.js';
import { getStorageDriver } from './store.js';
import { getAuctionTransition, normalizeAuctionStatus } from './auctionRules.js';

export const usesNormalizedCatalog = () => getStorageDriver() === 'postgres';

const toListingType = (value) => {
  if (String(value).toLowerCase() === 'auction') return 'auction';
  return 'marketplace';
};

const fromListingType = (value) => {
  if (String(value).toLowerCase() === 'auction') return 'Auction';
  return 'Marketplace';
};

const mapListing = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    sellerId: row.sellerId,
    listingType: fromListingType(row.listingType),
    status: row.status,
    year: row.year,
    make: row.make,
    model: row.model,
    variant: row.variant,
    bodyStyle: row.bodyStyle,
    powertrain: row.powertrain,
    transmission: row.transmission,
    mileageKm: Number(row.mileageKm) || 0,
    mileageValue: Number(row.mileageKm) || 0,
    city: row.city,
    titleStatus: row.titleStatus,
    askingPrice: row.askingPrice === null ? null : Number(row.askingPrice),
    buyNowPrice: row.askingPrice === null ? null : Number(row.askingPrice),
    marketEstimate: row.marketEstimate === null ? null : Number(row.marketEstimate),
    inspectionScore: row.inspectionScore,
    trustScore: row.trustScore,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const mapAuction = (row) => {
  if (!row) return null;
  return {
    id: row.auctionId,
    listingId: row.listingId,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    reservePrice: row.reservePrice === null ? null : Number(row.reservePrice),
    highBid: Number(row.highBid) || 0,
    bidIncrement: Number(row.bidIncrement) || 0,
    lastBidderId: row.lastBidderId,
    bidsCount: Number(row.bidsCount) || 0,
    watchersCount: Number(row.watchersCount) || 0,
    spectators: Number(row.watchersCount) || 0,
    extensionsCount: Number(row.extensionsCount) || 0,
    winnerId: row.winnerId,
    listing: mapListing({ ...row, id: row.listingId, status: row.listingStatus }),
    bidHistory: row.bidHistory || [],
    createdAt: row.auctionCreatedAt,
    updatedAt: row.auctionUpdatedAt,
  };
};

const listingSelect = `
  SELECT
    l.id,
    l.seller_id AS "sellerId",
    l.listing_type AS "listingType",
    l.status,
    l.year,
    l.make,
    l.model,
    l.variant,
    l.body_style AS "bodyStyle",
    l.powertrain,
    l.transmission,
    l.mileage_km AS "mileageKm",
    l.city,
    l.title_status AS "titleStatus",
    l.asking_price AS "askingPrice",
    l.market_estimate AS "marketEstimate",
    l.inspection_score AS "inspectionScore",
    l.trust_score AS "trustScore",
    l.created_at AS "createdAt",
    l.updated_at AS "updatedAt"
  FROM listings l
`;

const auctionSelect = `
  SELECT
    a.id AS "auctionId",
    a.listing_id AS "listingId",
    a.status,
    a.starts_at AS "startsAt",
    a.ends_at AS "endsAt",
    a.reserve_price AS "reservePrice",
    a.high_bid AS "highBid",
    a.bid_increment AS "bidIncrement",
    a.last_bidder_id AS "lastBidderId",
    a.bids_count AS "bidsCount",
    a.watchers_count AS "watchersCount",
    a.extensions_count AS "extensionsCount",
    a.winner_id AS "winnerId",
    a.created_at AS "auctionCreatedAt",
    a.updated_at AS "auctionUpdatedAt",
    l.id AS id,
    l.seller_id AS "sellerId",
    l.listing_type AS "listingType",
    l.status AS "listingStatus",
    l.year,
    l.make,
    l.model,
    l.variant,
    l.body_style AS "bodyStyle",
    l.powertrain,
    l.transmission,
    l.mileage_km AS "mileageKm",
    l.city,
    l.title_status AS "titleStatus",
    l.asking_price AS "askingPrice",
    l.market_estimate AS "marketEstimate",
    l.inspection_score AS "inspectionScore",
    l.trust_score AS "trustScore",
    l.created_at AS "createdAt",
    l.updated_at AS "updatedAt"
  FROM auctions a
  JOIN listings l ON l.id = a.listing_id
`;

const buildListingWhere = (query = {}) => {
  const clauses = [];
  const values = [];
  let orderBy = 'l.updated_at DESC';
  const add = (sql, value) => {
    values.push(value);
    clauses.push(sql.replace('?', `$${values.length}`));
  };

  const term = query.get?.('q') || query.get?.('query') || query.q || query.query;
  if (term) {
    values.push(String(term));
    const searchParam = `$${values.length}`;
    const vector = `to_tsvector('simple', COALESCE(l.make, '') || ' ' || COALESCE(l.model, '') || ' ' || COALESCE(l.variant, '') || ' ' || COALESCE(l.city, '') || ' ' || COALESCE(l.body_style, '') || ' ' || COALESCE(l.powertrain, '') || ' ' || COALESCE(l.transmission, '') || ' ' || COALESCE(l.title_status, ''))`;
    clauses.push(`(${vector} @@ plainto_tsquery('simple', ${searchParam}) OR l.make ILIKE '%' || ${searchParam} || '%' OR l.model ILIKE '%' || ${searchParam} || '%' OR l.variant ILIKE '%' || ${searchParam} || '%' OR l.city ILIKE '%' || ${searchParam} || '%')`);
    orderBy = `ts_rank_cd(${vector}, plainto_tsquery('simple', ${searchParam})) DESC, l.updated_at DESC`;
  }

  const city = query.get?.('city') || query.city;
  if (city && city !== 'All') add('l.city = ?', city);
  const make = query.get?.('make') || query.make;
  if (make && make !== 'All') add('l.make = ?', make);
  const listingType = query.get?.('type') || query.get?.('listingType') || query.type || query.listingType;
  if (listingType && listingType !== 'All') add('l.listing_type = ?', toListingType(listingType));
  const minPrice = query.get?.('minPrice') || query.get?.('priceFrom') || query.minPrice || query.priceFrom;
  if (minPrice) add('COALESCE(l.asking_price, l.market_estimate, 0) >= ?', Number(minPrice));
  const maxPrice = query.get?.('maxPrice') || query.get?.('priceTo') || query.maxPrice || query.priceTo;
  if (maxPrice) add('COALESCE(l.asking_price, l.market_estimate, 0) <= ?', Number(maxPrice));
  const minYear = query.get?.('minYear') || query.get?.('yearFrom') || query.minYear || query.yearFrom;
  if (minYear && minYear !== 'All') add('l.year >= ?', Number(minYear));
  const maxYear = query.get?.('maxYear') || query.get?.('yearTo') || query.maxYear || query.yearTo;
  if (maxYear && maxYear !== 'All') add('l.year <= ?', Number(maxYear));
  const bodyStyle = query.get?.('bodyStyle') || query.bodyStyle;
  if (bodyStyle && bodyStyle !== 'All') add('l.body_style = ?', bodyStyle);
  const powertrain = query.get?.('powertrain') || query.powertrain;
  if (powertrain && powertrain !== 'All') add('l.powertrain = ?', powertrain);

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
    orderBy,
  };
};

export const listNormalizedListings = async (query) => {
  const pool = await getPostgresPool();
  const { where, values, orderBy } = buildListingWhere(query);
  const result = await pool.query(`${listingSelect} ${where} ORDER BY ${orderBy} LIMIT 100`, values);
  return result.rows.map(mapListing);
};

export const getNormalizedListing = async (id) => {
  const pool = await getPostgresPool();
  const result = await pool.query(`${listingSelect} WHERE l.id::text = $1`, [String(id)]);
  return mapListing(result.rows[0]);
};

export const createNormalizedListing = async (sellerId, payload) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      INSERT INTO listings (
        seller_id,
        listing_type,
        status,
        year,
        make,
        model,
        variant,
        body_style,
        powertrain,
        transmission,
        mileage_km,
        city,
        title_status,
        asking_price,
        market_estimate,
        inspection_score,
        trust_score
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING
        id,
        seller_id AS "sellerId",
        listing_type AS "listingType",
        status,
        year,
        make,
        model,
        variant,
        body_style AS "bodyStyle",
        powertrain,
        transmission,
        mileage_km AS "mileageKm",
        city,
        title_status AS "titleStatus",
        asking_price AS "askingPrice",
        market_estimate AS "marketEstimate",
        inspection_score AS "inspectionScore",
        trust_score AS "trustScore",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      sellerId,
      toListingType(payload.listingType),
      payload.status || 'draft',
      Number(payload.year),
      payload.make,
      payload.model,
      payload.variant || null,
      payload.bodyStyle || payload.body_style || null,
      payload.powertrain || payload.fuel || null,
      payload.transmission || null,
      Number(payload.mileageKm || payload.mileageValue || payload.mileage) || null,
      payload.city,
      payload.titleStatus || null,
      payload.askingPrice || payload.buyNowPrice || null,
      payload.marketEstimate || null,
      payload.inspectionScore || null,
      payload.trustScore || 50,
    ]
  );
  return mapListing(result.rows[0]);
};

export const updateNormalizedListing = async (id, payload) => {
  const current = await getNormalizedListing(id);
  if (!current) return null;
  const merged = { ...current, ...payload };
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      UPDATE listings
      SET
        status = $2,
        year = $3,
        make = $4,
        model = $5,
        variant = $6,
        body_style = $7,
        powertrain = $8,
        transmission = $9,
        mileage_km = $10,
        city = $11,
        title_status = $12,
        asking_price = $13,
        market_estimate = $14,
        inspection_score = $15,
        trust_score = $16,
        updated_at = NOW()
      WHERE id::text = $1
      RETURNING
        id,
        seller_id AS "sellerId",
        listing_type AS "listingType",
        status,
        year,
        make,
        model,
        variant,
        body_style AS "bodyStyle",
        powertrain,
        transmission,
        mileage_km AS "mileageKm",
        city,
        title_status AS "titleStatus",
        asking_price AS "askingPrice",
        market_estimate AS "marketEstimate",
        inspection_score AS "inspectionScore",
        trust_score AS "trustScore",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      String(id),
      merged.status,
      Number(merged.year),
      merged.make,
      merged.model,
      merged.variant || null,
      merged.bodyStyle || null,
      merged.powertrain || null,
      merged.transmission || null,
      Number(merged.mileageKm || merged.mileageValue) || null,
      merged.city,
      merged.titleStatus || null,
      merged.askingPrice || merged.buyNowPrice || null,
      merged.marketEstimate || null,
      merged.inspectionScore || null,
      merged.trustScore || 50,
    ]
  );
  return mapListing(result.rows[0]);
};

export const setNormalizedListingStatus = async (id, status) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      UPDATE listings
      SET status = $2, updated_at = NOW()
      WHERE id::text = $1
      RETURNING
        id,
        seller_id AS "sellerId",
        listing_type AS "listingType",
        status,
        year,
        make,
        model,
        variant,
        body_style AS "bodyStyle",
        powertrain,
        transmission,
        mileage_km AS "mileageKm",
        city,
        title_status AS "titleStatus",
        asking_price AS "askingPrice",
        market_estimate AS "marketEstimate",
        inspection_score AS "inspectionScore",
        trust_score AS "trustScore",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [String(id), status]
  );
  return mapListing(result.rows[0]);
};

export const listNormalizedAuctions = async (query) => {
  const pool = await getPostgresPool();
  const { where, values } = buildListingWhere(query);
  const result = await pool.query(`${auctionSelect} ${where} ORDER BY a.ends_at ASC NULLS LAST LIMIT 100`, values);
  return result.rows.map((row) => mapAuction({ ...row, status: row.status, listingType: row.listingType }));
};

export const getNormalizedAuction = async (id) => {
  const pool = await getPostgresPool();
  const result = await pool.query(`${auctionSelect} WHERE a.id::text = $1`, [String(id)]);
  const auction = mapAuction(result.rows[0]);
  if (!auction) return null;
  const bids = await listNormalizedAuctionBids(id);
  return { ...auction, bidHistory: bids };
};

export const createNormalizedAuction = async (payload) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      INSERT INTO auctions (listing_id, status, starts_at, ends_at, reserve_price, high_bid, bid_increment)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
    [
      payload.listingId,
      normalizeAuctionStatus(payload.status || 'scheduled'),
      payload.startsAt || null,
      payload.endsAt || null,
      payload.reservePrice || null,
      payload.highBid || 0,
      payload.bidIncrement || 25000,
    ]
  );
  await setNormalizedListingStatus(payload.listingId, 'live');
  return getNormalizedAuction(result.rows[0].id);
};

export const setNormalizedAuctionStatus = async (id, status, patch = {}) => {
  const current = await getNormalizedAuction(id);
  if (!current) return null;
  const nextStatus = normalizeAuctionStatus(status);
  const transition = getAuctionTransition(current.status, patch.action || nextStatus);
  if (!transition.ok && current.status !== nextStatus) {
    const directTransition = getAuctionTransition(current.status, Object.entries({
      start: 'live',
      reopen: 'live',
      extend: 'live',
      pause: 'scheduled',
      end: 'won',
      cancel: 'cancelled',
      expire: 'expired',
      dispute: 'disputed',
      forfeit: 'forfeited',
      payment_due: 'payment_pending',
      mark_paid: 'paid',
      handover: 'handover',
      complete: 'completed',
    }).find(([, target]) => target === nextStatus)?.[0]);
    if (!directTransition.ok) {
      const error = new Error(directTransition.message || transition.message);
      error.status = 409;
      throw error;
    }
  }

  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      UPDATE auctions
      SET
        status = $2,
        ends_at = COALESCE($3, ends_at),
        winner_id = COALESCE($4, winner_id),
        starts_at = COALESCE($5, starts_at),
        updated_at = NOW()
      WHERE id::text = $1
      RETURNING id
    `,
    [String(id), nextStatus, patch.endsAt || null, patch.winnerId || null, patch.startsAt || null]
  );
  if (!result.rows[0]) return null;
  return getNormalizedAuction(result.rows[0].id);
};

export const registerAuctionWatcher = async ({ auctionId, userId, anonymousId }) => {
  const pool = await getPostgresPool();
  const client = await pool.connect();
  const visitorId = anonymousId || null;

  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM auctions WHERE id::text = $1 FOR UPDATE', [String(auctionId)]);
    if (!existing.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    const watcher = userId
      ? await client.query('SELECT id FROM auction_watchers WHERE auction_id = $1 AND user_id = $2', [existing.rows[0].id, userId])
      : await client.query('SELECT id FROM auction_watchers WHERE auction_id = $1 AND anonymous_id = $2', [existing.rows[0].id, visitorId]);

    if (watcher.rows[0]) {
      await client.query('UPDATE auction_watchers SET last_seen_at = NOW() WHERE id = $1', [watcher.rows[0].id]);
    } else {
      await client.query(
        `
          INSERT INTO auction_watchers (auction_id, user_id, anonymous_id, last_seen_at)
          VALUES ($1, $2, $3, NOW())
        `,
        [existing.rows[0].id, userId || null, userId ? null : visitorId]
      );
    }

    const count = await client.query('SELECT COUNT(*)::int AS count FROM auction_watchers WHERE auction_id = $1', [existing.rows[0].id]);
    await client.query('UPDATE auctions SET watchers_count = $2, updated_at = NOW() WHERE id = $1', [existing.rows[0].id, count.rows[0].count]);
    await client.query('COMMIT');
    return getNormalizedAuction(existing.rows[0].id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const listNormalizedAuctionBids = async (auctionId) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      SELECT
        b.id,
        b.auction_id AS "auctionId",
        b.bidder_id AS "bidderId",
        b.amount,
        b.status,
        b.idempotency_key AS "idempotencyKey",
        b.created_at AS "createdAt",
        u.email AS "bidderEmail"
      FROM bids b
      LEFT JOIN users u ON u.id = b.bidder_id
      WHERE b.auction_id::text = $1
      ORDER BY b.amount DESC, b.created_at DESC
    `,
    [String(auctionId)]
  );
  return result.rows.map((row) => ({
    id: row.id,
    auctionId: row.auctionId,
    bidderId: row.bidderId,
    user: row.bidderEmail || row.bidderId,
    amount: Number(row.amount) || 0,
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    time: row.createdAt,
    createdAt: row.createdAt,
  }));
};
