import { getPostgresPool } from './postgresStore.js';
import { getStorageDriver } from './store.js';

export const usesNormalizedEngagement = () => getStorageDriver() === 'postgres';

export const listOrders = async (userId) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      SELECT id, buyer_id AS "buyerId", seller_id AS "sellerId", listing_id AS "listingId", accessory_id AS "accessoryId",
        checkout_case_id AS "checkoutCaseId", order_type AS "orderType", status, amount, currency, metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM orders
      WHERE buyer_id = $1 OR seller_id = $1
      ORDER BY created_at DESC
    `,
    [userId]
  );
  return result.rows.map((row) => ({ ...row, amount: Number(row.amount) || 0 }));
};

export const listSellerOrders = async (sellerId) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      SELECT id, buyer_id AS "buyerId", seller_id AS "sellerId", listing_id AS "listingId", accessory_id AS "accessoryId",
        checkout_case_id AS "checkoutCaseId", order_type AS "orderType", status, amount, currency, metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM orders
      WHERE seller_id = $1
      ORDER BY created_at DESC
    `,
    [sellerId]
  );
  return result.rows.map((row) => ({ ...row, amount: Number(row.amount) || 0 }));
};

export const listAdminOrders = async ({ status, orderType, limit = 100 } = {}) => {
  const pool = await getPostgresPool();
  const clauses = [];
  const values = [];
  if (status && status !== 'All') {
    values.push(status);
    clauses.push(`status = $${values.length}`);
  }
  if (orderType && orderType !== 'All') {
    values.push(orderType);
    clauses.push(`order_type = $${values.length}`);
  }
  values.push(Math.min(250, Number(limit) || 100));
  const result = await pool.query(
    `
      SELECT id, buyer_id AS "buyerId", seller_id AS "sellerId", listing_id AS "listingId", accessory_id AS "accessoryId",
        checkout_case_id AS "checkoutCaseId", order_type AS "orderType", status, amount, currency, metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM orders
      ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
      ORDER BY created_at DESC
      LIMIT $${values.length}
    `,
    values
  );
  return result.rows.map((row) => ({ ...row, amount: Number(row.amount) || 0 }));
};

export const createOrder = async (userId, payload) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      INSERT INTO orders (buyer_id, seller_id, listing_id, accessory_id, checkout_case_id, order_type, status, amount, currency, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'created'), COALESCE($8, 0), COALESCE($9, 'PKR'), COALESCE($10::jsonb, '{}'))
      RETURNING id, buyer_id AS "buyerId", seller_id AS "sellerId", listing_id AS "listingId", accessory_id AS "accessoryId",
        checkout_case_id AS "checkoutCaseId", order_type AS "orderType", status, amount, currency, metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [
      userId,
      payload.sellerId || null,
      payload.listingId || null,
      payload.accessoryId || null,
      payload.checkoutCaseId || null,
      payload.orderType || 'vehicle',
      payload.status || null,
      payload.amount || 0,
      payload.currency || 'PKR',
      JSON.stringify(payload.metadata || {}),
    ]
  );
  return { ...result.rows[0], amount: Number(result.rows[0].amount) || 0 };
};

export const updateOrderWorkflow = async (actorId, orderId, patch = {}) => {
  const pool = await getPostgresPool();
  const current = await pool.query('SELECT metadata FROM orders WHERE id::text = $1', [String(orderId)]);
  if (!current.rows[0]) return null;
  const metadata = current.rows[0].metadata || {};
  const timeline = [
    ...(metadata.timeline || []),
    {
      action: patch.action || patch.status || 'updated',
      note: patch.note || null,
      actorId,
      createdAt: new Date().toISOString(),
    },
  ];
  const nextMetadata = {
    ...metadata,
    ...patch.metadata,
    sellerNote: patch.note || metadata.sellerNote,
    pickupSlot: patch.pickupSlot || metadata.pickupSlot,
    timeline,
  };
  const result = await pool.query(
    `
      UPDATE orders
      SET status = COALESCE($2, status), metadata = $3::jsonb, updated_at = NOW()
      WHERE id::text = $1
      RETURNING id, buyer_id AS "buyerId", seller_id AS "sellerId", listing_id AS "listingId", accessory_id AS "accessoryId",
        checkout_case_id AS "checkoutCaseId", order_type AS "orderType", status, amount, currency, metadata,
        created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [String(orderId), patch.status || null, JSON.stringify(nextMetadata)]
  );
  return { ...result.rows[0], amount: Number(result.rows[0].amount) || 0 };
};

export const listInspectionBookings = async (userId) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      SELECT id, buyer_id AS "buyerId", listing_id AS "listingId", package_type AS "packageType", city, address,
        scheduled_at AS "scheduledAt", status, price, inspector_notes AS "inspectorNotes", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM inspection_bookings
      WHERE buyer_id = $1
      ORDER BY created_at DESC
    `,
    [userId]
  );
  return result.rows.map((row) => ({ ...row, price: Number(row.price) || 0 }));
};

export const createInspectionBooking = async (userId, payload) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      INSERT INTO inspection_bookings (buyer_id, listing_id, package_type, city, address, scheduled_at, status, price)
      VALUES ($1, $2, $3, $4, $5, $6, 'requested', COALESCE($7, 0))
      RETURNING id, buyer_id AS "buyerId", listing_id AS "listingId", package_type AS "packageType", city, address,
        scheduled_at AS "scheduledAt", status, price, inspector_notes AS "inspectorNotes", created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [userId, payload.listingId || null, payload.packageType || 'basic', payload.city || null, payload.address || null, payload.scheduledAt || null, payload.price || 0]
  );
  return { ...result.rows[0], price: Number(result.rows[0].price) || 0 };
};

export const listNotifications = async (userId) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      SELECT id, type, title, body, link, read_at AS "readAt", created_at AS "createdAt"
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [userId]
  );
  return result.rows;
};

export const markNotificationRead = async (userId, id) => {
  const pool = await getPostgresPool();
  await pool.query('UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND id::text = $2', [userId, String(id)]);
  return listNotifications(userId);
};

export const markAllNotificationsRead = async (userId) => {
  const pool = await getPostgresPool();
  await pool.query('UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL', [userId]);
  return listNotifications(userId);
};

export const listConversations = async (userId) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      SELECT c.id, c.listing_id AS "listingId", c.buyer_id AS "buyerId", c.seller_id AS "sellerId", c.status,
        c.last_message_at AS "lastMessageAt", c.created_at AS "createdAt",
        COALESCE(json_agg(json_build_object(
          'id', m.id,
          'senderId', m.sender_id,
          'body', m.body,
          'readAt', m.read_at,
          'createdAt', m.created_at
        ) ORDER BY m.created_at) FILTER (WHERE m.id IS NOT NULL), '[]') AS messages
      FROM conversations c
      LEFT JOIN conversation_messages m ON m.conversation_id = c.id
      WHERE c.buyer_id = $1 OR c.seller_id = $1
      GROUP BY c.id
      ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
    `,
    [userId]
  );
  return result.rows;
};

export const getConversation = async (userId, conversationId) => {
  const conversations = await listConversations(userId);
  return conversations.find((conversation) => String(conversation.id) === String(conversationId)) || null;
};

export const createConversation = async (userId, payload) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      INSERT INTO conversations (listing_id, buyer_id, seller_id, last_message_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, listing_id AS "listingId", buyer_id AS "buyerId", seller_id AS "sellerId", status, last_message_at AS "lastMessageAt", created_at AS "createdAt"
    `,
    [payload.listingId || null, userId, payload.sellerId || null]
  );
  if (payload.body) await sendMessage(userId, result.rows[0].id, payload.body);
  return result.rows[0];
};

export const sendMessage = async (userId, conversationId, body) => {
  const pool = await getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const participant = await client.query(
      'SELECT 1 FROM conversations WHERE id::text = $1 AND (buyer_id = $2 OR seller_id = $2)',
      [String(conversationId), userId]
    );
    if (!participant.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    const result = await client.query(
      `
        INSERT INTO conversation_messages (conversation_id, sender_id, body)
        VALUES ($1, $2, $3)
        RETURNING id, conversation_id AS "conversationId", sender_id AS "senderId", body, read_at AS "readAt", created_at AS "createdAt"
      `,
      [conversationId, userId, body]
    );
    await client.query('UPDATE conversations SET last_message_at = NOW() WHERE id = $1', [conversationId]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const markConversationRead = async (userId, conversationId) => {
  const pool = await getPostgresPool();
  await pool.query(
    `
      UPDATE conversation_messages
      SET read_at = NOW()
      WHERE conversation_id::text = $1
        AND sender_id <> $2
        AND EXISTS (
          SELECT 1 FROM conversations
          WHERE id::text = $1 AND (buyer_id = $2 OR seller_id = $2)
        )
    `,
    [String(conversationId), userId]
  );
  return getConversation(userId, conversationId);
};

export const updateConversationStatus = async (userId, conversationId, status) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      UPDATE conversations
      SET status = $3
      WHERE id::text = $1 AND (buyer_id = $2 OR seller_id = $2)
      RETURNING id, listing_id AS "listingId", buyer_id AS "buyerId", seller_id AS "sellerId", status,
        last_message_at AS "lastMessageAt", created_at AS "createdAt"
    `,
    [String(conversationId), userId, status]
  );
  return result.rows[0] || null;
};

export const listForums = async () => {
  const pool = await getPostgresPool();
  const result = await pool.query('SELECT id, slug, name, description FROM community_forums ORDER BY name');
  return result.rows;
};

export const createForum = async (payload) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      INSERT INTO community_forums (slug, name, description)
      VALUES ($1, $2, $3)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      RETURNING id, slug, name, description
    `,
    [payload.slug, payload.name, payload.description || null]
  );
  return result.rows[0];
};

export const listPosts = async (forumId) => {
  const pool = await getPostgresPool();
  const values = [];
  const where = forumId ? 'WHERE p.forum_id::text = $1 OR f.slug = $1' : '';
  if (forumId) values.push(String(forumId));
  const result = await pool.query(
    `
      SELECT p.id, p.forum_id AS "forumId", f.slug AS "forumSlug", p.author_id AS "authorId", p.listing_id AS "listingId",
        p.title, p.body, p.votes, p.reports_count AS "reportsCount", p.is_locked AS "isLocked", p.is_pinned AS "isPinned",
        p.created_at AS "createdAt"
      FROM community_posts p
      JOIN community_forums f ON f.id = p.forum_id
      ${where}
      ORDER BY p.is_pinned DESC, p.created_at DESC
      LIMIT 100
    `,
    values
  );
  return result.rows;
};

export const createPost = async (userId, payload) => {
  const pool = await getPostgresPool();
  let forumId = payload.forumId;
  if (forumId && !/^[0-9a-f-]{36}$/i.test(String(forumId))) {
    const forum = await pool.query('SELECT id FROM community_forums WHERE slug = $1', [forumId]);
    forumId = forum.rows[0]?.id;
  }
  if (!forumId) throw new Error('Forum not found.');
  const result = await pool.query(
    `
      INSERT INTO community_posts (forum_id, author_id, listing_id, title, body)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, forum_id AS "forumId", author_id AS "authorId", listing_id AS "listingId", title, body, votes, reports_count AS "reportsCount", is_locked AS "isLocked", is_pinned AS "isPinned", created_at AS "createdAt"
    `,
    [forumId, userId, payload.listingId || null, payload.title, payload.body]
  );
  return result.rows[0];
};

export const getPost = async (id) => {
  const pool = await getPostgresPool();
  const postResult = await pool.query(
    `
      SELECT id, forum_id AS "forumId", author_id AS "authorId", listing_id AS "listingId", title, body, votes,
        reports_count AS "reportsCount", is_locked AS "isLocked", is_pinned AS "isPinned", created_at AS "createdAt"
      FROM community_posts
      WHERE id::text = $1
    `,
    [String(id)]
  );
  if (!postResult.rows[0]) return null;
  const comments = await pool.query(
    `
      SELECT id, post_id AS "postId", parent_comment_id AS "parentCommentId", author_id AS "authorId", body, votes,
        reports_count AS "reportsCount", is_best_answer AS "isBestAnswer", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM community_comments
      WHERE post_id::text = $1
      ORDER BY created_at ASC
    `,
    [String(id)]
  );
  return { ...postResult.rows[0], comments: comments.rows };
};

export const addComment = async (userId, postId, payload) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      INSERT INTO community_comments (post_id, parent_comment_id, author_id, body)
      VALUES ($1, $2, $3, $4)
      RETURNING id, post_id AS "postId", parent_comment_id AS "parentCommentId", author_id AS "authorId", body, votes, reports_count AS "reportsCount", is_best_answer AS "isBestAnswer", created_at AS "createdAt"
    `,
    [postId, payload.parentCommentId || null, userId, payload.body]
  );
  return result.rows[0];
};

export const votePost = async (postId, delta = 1) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      UPDATE community_posts
      SET votes = votes + $2
      WHERE id::text = $1
      RETURNING id, forum_id AS "forumId", author_id AS "authorId", listing_id AS "listingId", title, body,
        votes, reports_count AS "reportsCount", is_locked AS "isLocked", is_pinned AS "isPinned", created_at AS "createdAt"
    `,
    [String(postId), Number(delta) || 1]
  );
  return result.rows[0] || null;
};

export const reportPost = async (postId) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      UPDATE community_posts
      SET reports_count = reports_count + 1
      WHERE id::text = $1
      RETURNING id, forum_id AS "forumId", author_id AS "authorId", listing_id AS "listingId", title, body,
        votes, reports_count AS "reportsCount", is_locked AS "isLocked", is_pinned AS "isPinned", created_at AS "createdAt"
    `,
    [String(postId)]
  );
  return result.rows[0] || null;
};

export const savePost = async (userId, postId, saved = true) => {
  const pool = await getPostgresPool();
  if (saved) {
    await pool.query(
      `
        INSERT INTO saved_community_posts (user_id, post_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, post_id) DO NOTHING
      `,
      [userId, postId]
    );
    return { postId, saved: true };
  }
  await pool.query('DELETE FROM saved_community_posts WHERE user_id = $1 AND post_id::text = $2', [userId, String(postId)]);
  return { postId, saved: false };
};

export const voteComment = async (commentId, delta = 1) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      UPDATE community_comments
      SET votes = votes + $2
      WHERE id::text = $1
      RETURNING id, post_id AS "postId", parent_comment_id AS "parentCommentId", author_id AS "authorId",
        body, votes, reports_count AS "reportsCount", is_best_answer AS "isBestAnswer", created_at AS "createdAt"
    `,
    [String(commentId), Number(delta) || 1]
  );
  return result.rows[0] || null;
};

export const listReplies = async (commentId) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      SELECT id, post_id AS "postId", parent_comment_id AS "parentCommentId", author_id AS "authorId",
        body, votes, reports_count AS "reportsCount", is_best_answer AS "isBestAnswer", created_at AS "createdAt"
      FROM community_comments
      WHERE parent_comment_id::text = $1
      ORDER BY created_at ASC
    `,
    [String(commentId)]
  );
  return result.rows;
};

export const markBestAnswer = async (commentId, isBestAnswer = true) => {
  const pool = await getPostgresPool();
  const result = await pool.query(
    `
      UPDATE community_comments
      SET is_best_answer = $2
      WHERE id::text = $1
      RETURNING id, post_id AS "postId", parent_comment_id AS "parentCommentId", author_id AS "authorId",
        body, votes, reports_count AS "reportsCount", is_best_answer AS "isBestAnswer", created_at AS "createdAt"
    `,
    [String(commentId), Boolean(isBestAnswer)]
  );
  return result.rows[0] || null;
};
