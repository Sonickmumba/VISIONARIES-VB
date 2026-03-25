const db = require('../config/database');

/**
 * Create notification for user
 */
const createNotification = async (client, userId, type, title, message, referenceId = null) => {
  try {
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, message, referenceId]
    );
  } catch (error) {
    console.error('Create notification error:', error);
    // Don't throw - notification failure shouldn't break the main operation
  }
};

/**
 * Create notifications for multiple users
 */
const createBulkNotifications = async (client, userIds, type, title, message, referenceId = null) => {
  try {
    const values = userIds.map((userId, index) => {
      const offset = index * 5;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
    }).join(', ');

    const params = userIds.flatMap(userId => [userId, type, title, message, referenceId]);

    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id)
       VALUES ${values}`,
      params
    );
  } catch (error) {
    console.error('Create bulk notifications error:', error);
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  } catch (error) {
    console.error('Mark as read error:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for user
 */
const markAllAsRead = async (userId) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );
  } catch (error) {
    console.error('Mark all as read error:', error);
    throw error;
  }
};

/**
 * Get unread count for user
 */
const getUnreadCount = async (userId) => {
  try {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Get unread count error:', error);
    return 0;
  }
};

module.exports = {
  createNotification,
  createBulkNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
