const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const AppError = require('../utils/appError');
const { getTodayDateString } = require('../utils/dateUtils');

function normalizeText(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeEmail(value) {
  const email = normalizeText(value);
  return email ? email.toLowerCase() : undefined;
}

async function findUnlinkedEmployeeByName(fullName) {
  const result = await pool.query(
    `
      SELECT e.id
      FROM employees e
      LEFT JOIN users u ON u.employee_id = e.id
      WHERE LOWER(e.full_name) = LOWER($1)
        AND u.id IS NULL
      ORDER BY e.id ASC
      LIMIT 1
    `,
    [fullName]
  );

  return result.rowCount > 0 ? result.rows[0].id : null;
}

async function createDefaultEmployeeRecord(fullName, role) {
  const result = await pool.query(
    `
      INSERT INTO employees (
        full_name,
        role,
        team,
        start_date,
        salary,
        employment_type,
        active,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
      RETURNING id
    `,
    [
      fullName,
      role,
      role === 'HR' ? 'HR' : 'General',
      getTodayDateString(),
      1,
      'Full-time',
    ]
  );

  return result.rows[0].id;
}

function validateRegistrationPayload(payload) {
  const fullName = normalizeText(payload.full_name);
  const email = normalizeEmail(payload.email);
  const password = normalizeText(payload.password);
  const confirmPassword = normalizeText(payload.confirm_password);
  const role = normalizeText(payload.role);

  if (!fullName) {
    throw new AppError('Full name is required.', 400);
  }

  if (!email) {
    throw new AppError('Email is required.', 400);
  }

  if (!password) {
    throw new AppError('Password is required.', 400);
  }

  if (!confirmPassword) {
    throw new AppError('Confirm password is required.', 400);
  }

  if (password !== confirmPassword) {
    throw new AppError('Passwords do not match.', 400);
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters long.', 400);
  }

  if (!['Employee', 'HR'].includes(role)) {
    throw new AppError('Role must be Employee or HR.', 400);
  }

  return { full_name: fullName, email, password, role };
}

function validateLoginPayload(payload) {
  const email = normalizeEmail(payload.email);
  const password = normalizeText(payload.password);

  if (!email) {
    throw new AppError('Email is required.', 400);
  }

  if (!password) {
    throw new AppError('Password is required.', 400);
  }

  return { email, password };
}

async function registerUser(payload) {
  const data = validateRegistrationPayload(payload);

  const existingResult = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [data.email]
  );

  if (existingResult.rowCount > 0) {
    throw new AppError('Email is already registered.', 400);
  }

  let employeeId = null;

  const linkedEmployeeId = await findUnlinkedEmployeeByName(data.full_name);
  if (linkedEmployeeId) {
    employeeId = linkedEmployeeId;
  } else {
    employeeId = await createDefaultEmployeeRecord(data.full_name, data.role);
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const result = await pool.query(
    `
      INSERT INTO users (full_name, email, password, role, employee_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, full_name, email, role, employee_id, created_at
    `,
    [data.full_name, data.email, hashedPassword, data.role, employeeId]
  );

  return result.rows[0];
}

async function loginUser(payload) {
  const data = validateLoginPayload(payload);

  const result = await pool.query(
    `
      SELECT id, full_name, email, password, role, employee_id
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [data.email]
  );

  if (result.rowCount === 0) {
    throw new AppError('Invalid email or password.', 400);
  }

  const user = result.rows[0];
  const passwordMatches = await bcrypt.compare(data.password, user.password);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password.', 400);
  }

  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    employee_id: user.employee_id,
  };
}

async function getUserById(userId) {
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

  return result.rows[0];
}

module.exports = {
  getUserById,
  loginUser,
  registerUser,
};
