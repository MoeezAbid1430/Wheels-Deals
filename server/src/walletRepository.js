import { getPostgresPool } from './postgresStore.js';
import { getStorageDriver } from './store.js';
import { getPaymentProvider } from './paymentProvider.js';
import { getAuctionBidPolicy } from './auctionRules.js';

export const usesNormalizedWallet = () => getStorageDriver() === 'postgres';

const mapLedgerEntry = (row) => ({
  id: row.id,
  walletAccountId: row.walletAccountId,
  entryType: row.entryType,
  amount: Number(row.amount) || 0,
  referenceType: row.referenceType,
  referenceId: row.referenceId,
  note: row.note,
  createdAt: row.createdAt,
});

const mapHold = (row) => ({
  id: row.id,
  walletAccountId: row.walletAccountId,
  auctionId: row.auctionId,
  amount: Number(row.amount) || 0,
  status: row.status,
  releasedAt: row.releasedAt,
  createdAt: row.createdAt,
});

export const ensureWalletAccount = async (client, userId) => {
  const existing = await client.query('SELECT id, user_id AS "userId", currency, created_at AS "createdAt" FROM wallet_accounts WHERE user_id = $1', [userId]);
  if (existing.rows[0]) return existing.rows[0];

  const created = await client.query(
    `
      INSERT INTO wallet_accounts (user_id, currency)
      VALUES ($1, 'PKR')
      RETURNING id, user_id AS "userId", currency, created_at AS "createdAt"
    `,
    [userId]
  );
  return created.rows[0];
};

export const getWalletSummary = async (userId, clientOverride) => {
  const pool = clientOverride ? null : await getPostgresPool();
  const client = clientOverride || pool;
  const account = await ensureWalletAccount(client, userId);

  const [ledgerResult, holdsResult] = await Promise.all([
    client.query(
      `
        SELECT
          id,
          wallet_account_id AS "walletAccountId",
          entry_type AS "entryType",
          amount,
          reference_type AS "referenceType",
          reference_id AS "referenceId",
          note,
          created_at AS "createdAt"
        FROM wallet_ledger_entries
        WHERE wallet_account_id = $1
        ORDER BY created_at DESC
      `,
      [account.id]
    ),
    client.query(
      `
        SELECT
          id,
          wallet_account_id AS "walletAccountId",
          auction_id AS "auctionId",
          amount,
          status,
          released_at AS "releasedAt",
          created_at AS "createdAt"
        FROM deposit_holds
        WHERE wallet_account_id = $1
        ORDER BY created_at DESC
      `,
      [account.id]
    ),
  ]);

  const transactions = ledgerResult.rows.map(mapLedgerEntry);
  const holds = holdsResult.rows.map(mapHold);
  const balance = transactions.reduce((total, entry) => total + entry.amount, 0);
  const locked = holds.filter((hold) => hold.status === 'locked').reduce((total, hold) => total + hold.amount, 0);

  return {
    account,
    balance,
    locked,
    available: balance - locked,
    transactions,
    holds,
  };
};

export const createTopUpIntent = async (userId, amount) => {
  const pool = await getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const wallet = await ensureWalletAccount(client, userId);
    const providerIntent = await getPaymentProvider().createTopUpIntent({ amount, currency: wallet.currency, userId });
    const intentResult = await client.query(
      `
        INSERT INTO payment_intents (wallet_account_id, provider, provider_reference, amount, status, metadata)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING id, wallet_account_id AS "walletAccountId", provider, provider_reference AS "providerReference", amount, status, metadata, created_at AS "createdAt"
      `,
      [
        wallet.id,
        providerIntent.provider,
        providerIntent.providerReference,
        providerIntent.amount,
        providerIntent.status,
        JSON.stringify(providerIntent.metadata || {}),
      ]
    );
    const intent = intentResult.rows[0];
    if (intent.status === 'succeeded') {
      await client.query(
        `
          INSERT INTO wallet_ledger_entries (wallet_account_id, entry_type, amount, reference_type, reference_id, note)
          VALUES ($1, 'deposit', $2, 'payment_intent', $3, 'Wallet top-up')
        `,
        [wallet.id, amount, intent.id]
      );
    }
    await client.query('COMMIT');
    return { intent, wallet: await getWalletSummary(userId) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const requestWithdrawal = async (userId, amount, bankAccount) => {
  const pool = await getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const wallet = await ensureWalletAccount(client, userId);
    const summary = await getWalletSummary(userId, client);
    if (summary.available < amount) {
      await client.query('ROLLBACK');
      return { insufficient: true, wallet: summary };
    }

    await client.query(
      `
        INSERT INTO wallet_ledger_entries (wallet_account_id, entry_type, amount, reference_type, note)
        VALUES ($1, 'withdrawal', $2, 'withdrawal_request', $3)
      `,
      [wallet.id, -amount, bankAccount ? `Withdrawal request: ${bankAccount}` : 'Withdrawal request']
    );
    await client.query('COMMIT');
    return {
      withdrawal: { amount, status: 'processing', bankAccount: bankAccount || null, createdAt: new Date().toISOString() },
      wallet: await getWalletSummary(userId),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateHoldStatus = async (userId, holdId, status) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      UPDATE deposit_holds dh
      SET status = $3, released_at = CASE WHEN $3 IN ('released', 'forfeited') THEN NOW() ELSE released_at END
      FROM wallet_accounts wa
      WHERE dh.id = $1 AND dh.wallet_account_id = wa.id AND wa.user_id = $2
      RETURNING
        dh.id,
        dh.wallet_account_id AS "walletAccountId",
        dh.auction_id AS "auctionId",
        dh.amount,
        dh.status,
        dh.released_at AS "releasedAt",
        dh.created_at AS "createdAt"
    `,
    [holdId, userId, status]
  );
  return { hold: result.rows[0] ? mapHold(result.rows[0]) : null, wallet: await getWalletSummary(userId) };
};

const writeBidAudit = async (client, actorId, auctionId, action, metadata = {}) => {
  await client.query(
    `
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
      VALUES ($1, $2, 'auction', $3, $4::jsonb)
    `,
    [actorId, action, auctionId, JSON.stringify(metadata)]
  );
};

export const placeAuctionBid = async ({ auctionId, bidderId, amount, ipAddress, userAgent, idempotencyKey }) => {
  const pool = await getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const auctionResult = await client.query(
      `
        SELECT
          id,
          listing_id AS "listingId",
          status,
          ends_at AS "endsAt",
          reserve_price AS "reservePrice",
          high_bid AS "highBid",
          bid_increment AS "bidIncrement",
          last_bidder_id AS "lastBidderId",
          bids_count AS "bidsCount",
          extensions_count AS "extensionsCount"
        FROM auctions
        WHERE id::text = $1
        FOR UPDATE
      `,
      [String(auctionId)]
    );

    const auction = auctionResult.rows[0];
    if (!auction) {
      await client.query('ROLLBACK');
      return { notFound: true };
    }

    const policy = getAuctionBidPolicy(auction);
    if (!policy.isLive) {
      await writeBidAudit(client, bidderId, auction.id, 'auction.bid_rejected', {
        reason: policy.isPastEnd ? 'auction_ended' : 'not_live',
        amount,
        status: auction.status,
      });
      await client.query('COMMIT');
      return { error: policy.isPastEnd ? 'Auction has ended.' : 'Live auction not found.', status: policy.isPastEnd ? 409 : 404 };
    }

    if (String(auction.lastBidderId || '') === String(bidderId)) {
      await writeBidAudit(client, bidderId, auction.id, 'auction.bid_rejected', { reason: 'already_highest_bidder', amount });
      await client.query('COMMIT');
      return { error: 'You are already the highest bidder.', status: 409 };
    }

    if (idempotencyKey) {
      const duplicate = await client.query(
        `
          SELECT id, auction_id AS "auctionId", bidder_id AS "bidderId", amount, status, created_at AS "createdAt"
          FROM bids
          WHERE auction_id = $1 AND bidder_id = $2 AND idempotency_key = $3
        `,
        [auction.id, bidderId, idempotencyKey]
      );
      if (duplicate.rows[0]) {
        await client.query('COMMIT');
        return { duplicate: true, bid: { ...duplicate.rows[0], amount: Number(duplicate.rows[0].amount) }, auction };
      }
    }

    const minimumBid = policy.minimumBid;
    if (!amount || amount < minimumBid) {
      await writeBidAudit(client, bidderId, auction.id, 'auction.bid_rejected', { reason: 'below_minimum', amount, minimumBid });
      await client.query('COMMIT');
      return { error: `Minimum bid is ${minimumBid}.`, status: 400 };
    }

    const wallet = await ensureWalletAccount(client, bidderId);
    const summary = await getWalletSummary(bidderId, client);
    const requiredDeposit = Math.max(policy.minimumDeposit, Math.ceil(amount * policy.requiredDepositRatio));
    const existingHold = summary.holds.find((hold) => String(hold.auctionId) === String(auction.id) && hold.status === 'locked');
    const availableWithExistingHold = summary.available + (existingHold?.amount || 0);
    if (availableWithExistingHold < requiredDeposit) {
      await writeBidAudit(client, bidderId, auction.id, 'auction.bid_rejected', {
        reason: 'insufficient_deposit',
        amount,
        requiredDeposit,
        available: summary.available,
      });
      await client.query('COMMIT');
      return { error: 'Insufficient available deposit.', status: 402, requiredDeposit };
    }

    await client.query(
      `
        UPDATE deposit_holds
        SET status = 'released', released_at = NOW()
        WHERE wallet_account_id = $1 AND auction_id = $2 AND status = 'locked'
      `,
      [wallet.id, auction.id]
    );
    await client.query(
      `
        INSERT INTO deposit_holds (wallet_account_id, auction_id, amount, status)
        VALUES ($1, $2, $3, 'locked')
      `,
      [wallet.id, auction.id, requiredDeposit]
    );

    const bidResult = await client.query(
      `
        INSERT INTO bids (auction_id, bidder_id, amount, status, ip_address, user_agent, idempotency_key)
        VALUES ($1, $2, $3, 'accepted', $4, $5, $6)
        RETURNING id, auction_id AS "auctionId", bidder_id AS "bidderId", amount, status, created_at AS "createdAt"
      `,
      [auction.id, bidderId, amount, ipAddress || null, userAgent || null, idempotencyKey || null]
    );
    const bid = bidResult.rows[0];

    const remainingMs = auction.endsAt ? new Date(auction.endsAt).getTime() - Date.now() : Infinity;
    const shouldExtend = remainingMs > 0 && remainingMs <= 120000;
    const updatedAuctionResult = await client.query(
      `
        UPDATE auctions
        SET
          high_bid = $2,
          last_bidder_id = $3,
          bids_count = bids_count + 1,
          extensions_count = extensions_count + $4,
          ends_at = CASE WHEN $5 THEN NOW() + INTERVAL '2 minutes' ELSE ends_at END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          listing_id AS "listingId",
          status,
          ends_at AS "endsAt",
          reserve_price AS "reservePrice",
          high_bid AS "highBid",
          bid_increment AS "bidIncrement",
          last_bidder_id AS "lastBidderId",
          extensions_count AS "extensionsCount",
          winner_id AS "winnerId"
      `,
      [auction.id, amount, bidderId, shouldExtend ? 1 : 0, shouldExtend]
    );

    await writeBidAudit(client, bidderId, auction.id, 'auction.bid_placed', { amount, requiredDeposit, idempotencyKey: idempotencyKey || null });

    await client.query('COMMIT');
    return {
      bid: { ...bid, amount: Number(bid.amount) },
      auction: {
        ...updatedAuctionResult.rows[0],
        highBid: Number(updatedAuctionResult.rows[0].highBid),
        bidIncrement: Number(updatedAuctionResult.rows[0].bidIncrement),
        reservePrice: Number(updatedAuctionResult.rows[0].reservePrice),
      },
      requiredDeposit,
      wallet: await getWalletSummary(bidderId),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
