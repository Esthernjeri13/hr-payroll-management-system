const pool = require('../db/pool');
const AppError = require('../utils/appError');
const { serializeEmployee, toNumber } = require('../utils/serializers');
const { compareDateStrings, parseDateOnly, getTodayDateString } = require('../utils/dateUtils');

function normalizeText(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeManagerId(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const managerId = Number(value);
  if (!Number.isInteger(managerId) || managerId <= 0) {
    return NaN;
  }

  return managerId;
}

function normalizeSalary(value) {
  if (value === undefined) {
    return undefined;
  }

  const salary = Number(value);
  return Number.isFinite(salary) ? salary : NaN;
}

function normalizeBoolean(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true' || value === '1') {
    return true;
  }

  if (value === 'false' || value === '0') {
    return false;
  }

  return undefined;
}

async function ensureManagerExists(managerId, employeeId = null) {
  if (managerId === null || managerId === undefined) {
    return null;
  }

  const managerQuery = await pool.query(
    'SELECT id, active FROM employees WHERE id = $1',
    [managerId]
  );

  if (managerQuery.rowCount === 0) {
    throw new AppError('Manager does not exist.', 400);
  }

  if (!managerQuery.rows[0].active) {
    throw new AppError('Manager must be active.', 400);
  }

  if (employeeId && managerId === employeeId) {
    throw new AppError('Employee cannot be their own manager.', 400);
  }

  return managerId;
}

function validateEmployeePayload(payload) {
  const fullName = normalizeText(payload.full_name);
  const role = normalizeText(payload.role);
  const team = normalizeText(payload.team);
  const startDate = normalizeText(payload.start_date);
  const employmentType = normalizeText(payload.employment_type);
  const salary = normalizeSalary(payload.salary);
  const managerId = normalizeManagerId(payload.manager_id);
  const active = normalizeBoolean(payload.active);

  if (!fullName) {
    throw new AppError('Full name is required.', 400);
  }

  if (!role) {
    throw new AppError('Role is required.', 400);
  }

  if (!team) {
    throw new AppError('Team is required.', 400);
  }

  if (!startDate || !parseDateOnly(startDate)) {
    throw new AppError('Valid start date is required.', 400);
  }

  if (!employmentType) {
    throw new AppError('Employment type is required.', 400);
  }

  if (!Number.isFinite(salary) || salary <= 0) {
    throw new AppError('Salary must be greater than 0.', 400);
  }

  if (managerId !== undefined && Number.isNaN(managerId)) {
    throw new AppError('Manager must be a valid employee ID.', 400);
  }

  if (active !== undefined && typeof active !== 'boolean') {
    throw new AppError('Active must be a boolean value.', 400);
  }

  return {
    full_name: fullName,
    role,
    team,
    manager_id: managerId,
    start_date: startDate,
    salary,
    employment_type: employmentType,
    active,
  };
}

async function listEmployees(filters = {}) {
  const values = [];
  let whereClause = '';

  if (filters.active === true) {
    whereClause = 'WHERE e.active = TRUE';
  } else if (filters.active === false) {
    whereClause = 'WHERE e.active = FALSE';
  }

  const query = `
    SELECT
      e.*,
      m.full_name AS manager_name
    FROM employees e
    LEFT JOIN employees m ON m.id = e.manager_id
    ${whereClause}
    ORDER BY e.active DESC, e.team ASC, e.full_name ASC
  `;

  const result = await pool.query(query, values);
  return result.rows.map(serializeEmployee);
}

async function getEmployeeById(employeeId) {
  const result = await pool.query(
    `
      SELECT
        e.*,
        m.full_name AS manager_name
      FROM employees e
      LEFT JOIN employees m ON m.id = e.manager_id
      WHERE e.id = $1
    `,
    [employeeId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Employee not found.', 404);
  }

  return serializeEmployee(result.rows[0]);
}

async function createEmployee(payload) {
  const data = validateEmployeePayload(payload);
  await ensureManagerExists(data.manager_id);

  const result = await pool.query(
    `
      INSERT INTO employees (
        full_name,
        role,
        team,
        manager_id,
        start_date,
        salary,
        employment_type,
        active,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, TRUE), NOW())
      RETURNING *
    `,
    [
      data.full_name,
      data.role,
      data.team,
      data.manager_id,
      data.start_date,
      data.salary,
      data.employment_type,
      data.active,
    ]
  );

  return getEmployeeById(result.rows[0].id);
}

async function updateEmployee(employeeId, payload) {
  const existingResult = await pool.query('SELECT * FROM employees WHERE id = $1', [employeeId]);
  if (existingResult.rowCount === 0) {
    throw new AppError('Employee not found.', 404);
  }

  const existing = existingResult.rows[0];
  const mergedPayload = {
    full_name: payload.full_name ?? existing.full_name,
    role: payload.role ?? existing.role,
    team: payload.team ?? existing.team,
    manager_id: payload.manager_id === undefined ? existing.manager_id : payload.manager_id,
    start_date: payload.start_date ?? existing.start_date,
    salary: payload.salary ?? existing.salary,
    employment_type: payload.employment_type ?? existing.employment_type,
    active: payload.active === undefined ? existing.active : payload.active,
  };

  const data = validateEmployeePayload(mergedPayload);
  await ensureManagerExists(data.manager_id, Number(employeeId));

  const result = await pool.query(
    `
      UPDATE employees
      SET
        full_name = $1,
        role = $2,
        team = $3,
        manager_id = $4,
        start_date = $5,
        salary = $6,
        employment_type = $7,
        active = COALESCE($8, active),
        updated_at = NOW()
      WHERE id = $9
      RETURNING id
    `,
    [
      data.full_name,
      data.role,
      data.team,
      data.manager_id,
      data.start_date,
      data.salary,
      data.employment_type,
      data.active,
      employeeId,
    ]
  );

  return getEmployeeById(result.rows[0].id);
}

async function deactivateEmployee(employeeId) {
  const result = await pool.query(
    `
      UPDATE employees
      SET active = FALSE,
          deactivated_at = CURRENT_DATE,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [employeeId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Employee not found.', 404);
  }

  return getEmployeeById(result.rows[0].id);
}

async function getActiveEmployeesByTeam(team) {
  const result = await pool.query(
    `
      SELECT id, full_name
      FROM employees
      WHERE team = $1 AND active = TRUE
      ORDER BY full_name ASC
    `,
    [team]
  );

  return result.rows;
}

async function getEmployeeForLeave(employeeId) {
  const result = await pool.query(
    `
      SELECT
        e.*,
        m.full_name AS manager_name
      FROM employees e
      LEFT JOIN employees m ON m.id = e.manager_id
      WHERE e.id = $1
    `,
    [employeeId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Employee not found.', 404);
  }

  return result.rows[0];
}

module.exports = {
  createEmployee,
  deactivateEmployee,
  getActiveEmployeesByTeam,
  getEmployeeById,
  getEmployeeForLeave,
  listEmployees,
  updateEmployee,
};
