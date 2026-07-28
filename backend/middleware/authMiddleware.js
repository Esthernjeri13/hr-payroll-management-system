const pool = require('../db/pool');
const AppError = require('../utils/appError');

async function requireAuth(req, res, next) {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      throw new AppError('Authentication required.', 401);
    }

    const result = await pool.query(
      `
        SELECT id, full_name, email, role, employee_id
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Authentication required.', 401);
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden.', 403));
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
