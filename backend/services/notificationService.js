const pool = require('../db/pool');
const AppError = require('../utils/appError');

function formatNotificationDate(dateValue) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateValue));
}

async function createNotification(title, message) {
  const result = await pool.query(
    `
      INSERT INTO notifications (title, message, created_at, is_read)
      VALUES ($1, $2, NOW(), FALSE)
      RETURNING id
    `,
    [title, message]
  );

  return result.rows[0];
}

async function listNotifications() {
  const result = await pool.query(
    `
      SELECT id, title, message, created_at, is_read
      FROM notifications
      ORDER BY created_at DESC, id DESC
    `
  );

  return result.rows;
}

async function markNotificationAsRead(notificationId) {
  const result = await pool.query(
    `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1
      RETURNING id, title, message, created_at, is_read
    `,
    [notificationId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Notification not found.', 404);
  }

  return result.rows[0];
}

module.exports = {
  createNotification,
  formatNotificationDate,
  listNotifications,
  markNotificationAsRead,
};
