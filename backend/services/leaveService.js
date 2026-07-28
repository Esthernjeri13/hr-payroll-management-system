const pool = require('../db/pool');
const AppError = require('../utils/appError');
const notificationService = require('./notificationService');
const { serializeLeaveRequest } = require('../utils/serializers');
const {
  compareDateStrings,
  getTodayDateString,
  inclusiveDaysBetween,
  overlapDays,
  parseDateOnly,
} = require('../utils/dateUtils');
const {
  ANNUAL_LEAVE_ENTITLEMENT,
  calculateLeaveDays,
  countLeaveBalance,
  hasMinimumNotice,
  isLeaveCoverageAllowed,
  isPastDate,
} = require('../utils/leaveRules');

function normalizeText(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeInteger(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
}

async function ensureEmployeeRecordForUser(user) {
  if (!user || !user.id) {
    throw new AppError('Authentication required.', 401);
  }

  if (user.employee_id) {
    return Number(user.employee_id);
  }

  const userResult = await pool.query(
    `
      SELECT id, full_name, role, employee_id
      FROM users
      WHERE id = $1
    `,
    [user.id]
  );

  if (userResult.rowCount === 0) {
    throw new AppError('Authentication required.', 401);
  }

  const currentUser = userResult.rows[0];
  if (currentUser.employee_id) {
    return Number(currentUser.employee_id);
  }

  const matchingEmployeeResult = await pool.query(
    `
      SELECT e.id
      FROM employees e
      LEFT JOIN users u ON u.employee_id = e.id
      WHERE LOWER(e.full_name) = LOWER($1)
        AND u.id IS NULL
      ORDER BY e.id ASC
      LIMIT 1
    `,
    [currentUser.full_name]
  );

  if (matchingEmployeeResult.rowCount > 0) {
    const matchedEmployeeId = matchingEmployeeResult.rows[0].id;
    await pool.query(
      `
        UPDATE users
        SET employee_id = $1
        WHERE id = $2
      `,
      [matchedEmployeeId, currentUser.id]
    );

    return matchedEmployeeId;
  }

  const createdEmployeeResult = await pool.query(
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
      VALUES ($1, $2, $3, CURRENT_DATE, 1, 'Full-time', TRUE, NOW())
      RETURNING id
    `,
    [
      currentUser.full_name,
      currentUser.role,
      currentUser.role === 'HR' ? 'HR' : 'General',
    ]
  );

  const createdEmployeeId = createdEmployeeResult.rows[0].id;

  await pool.query(
    `
      UPDATE users
      SET employee_id = $1
      WHERE id = $2
    `,
    [createdEmployeeId, currentUser.id]
  );

  return createdEmployeeId;
}

function validateLeavePayload(payload) {
  const leaveType = normalizeText(payload.leave_type);
  const startDate = normalizeText(payload.start_date);
  const endDate = normalizeText(payload.end_date);

  if (!leaveType) {
    throw new AppError('Leave type is required.', 400);
  }

  if (!startDate || !parseDateOnly(startDate)) {
    throw new AppError('Valid start date is required.', 400);
  }

  if (!endDate || !parseDateOnly(endDate)) {
    throw new AppError('Valid end date is required.', 400);
  }

  if (compareDateStrings(endDate, startDate) < 0) {
    throw new AppError('End date cannot be before start date.', 400);
  }

  return {
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
  };
}

async function listLeaveRequests(filters = {}) {
  const values = [];
  let whereClause = '';

  if (filters.status) {
    whereClause = 'WHERE l.status = $1';
    values.push(filters.status);
  }

  const result = await pool.query(
    `
      SELECT
        l.*,
        e.full_name AS employee_name,
        e.manager_id AS manager_id,
        m.full_name AS manager_name
      FROM leave_requests l
      JOIN employees e ON e.id = l.employee_id
      LEFT JOIN employees m ON m.id = e.manager_id
      ${whereClause}
      ORDER BY l.created_at DESC, l.id DESC
    `,
    values
  );

  return result.rows.map(serializeLeaveRequest);
}

async function getLeaveRequestById(leaveRequestId) {
  const result = await pool.query(
    `
      SELECT
        l.*,
        e.full_name AS employee_name,
        e.manager_id AS manager_id,
        m.full_name AS manager_name
      FROM leave_requests l
      JOIN employees e ON e.id = l.employee_id
      LEFT JOIN employees m ON m.id = e.manager_id
      WHERE l.id = $1
    `,
    [leaveRequestId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Leave request not found.', 404);
  }

  return serializeLeaveRequest(result.rows[0]);
}

async function createLeaveRequest(payload, user, today = getTodayDateString()) {
  const data = validateLeavePayload(payload);
  const employeeId = await ensureEmployeeRecordForUser(user);

  const employeeResult = await pool.query(
    `
      SELECT *
      FROM employees
      WHERE id = $1
    `,
    [employeeId]
  );

  if (employeeResult.rowCount === 0) {
    throw new AppError('Employee not found.', 404);
  }

  const employee = employeeResult.rows[0];
  if (!employee.active) {
    throw new AppError('Employee must be active to request leave.', 400);
  }

  if (compareDateStrings(data.start_date, today) < 0) {
    throw new AppError('Leave cannot be requested in the past.', 400);
  }

  if (!hasMinimumNotice(today, data.start_date)) {
    throw new AppError('Leave requires at least 3 days notice.', 400);
  }

  if (compareDateStrings(data.start_date, employee.start_date) < 0) {
    throw new AppError('Leave cannot start before the employee start date.', 400);
  }

  const overlapResult = await pool.query(
    `
      SELECT id
      FROM leave_requests
      WHERE employee_id = $1
        AND status = 'Approved'
        AND start_date <= $3
        AND end_date >= $2
      LIMIT 1
    `,
    [employeeId, data.start_date, data.end_date]
  );

  if (overlapResult.rowCount > 0) {
    throw new AppError('Leave overlaps an approved leave request.', 400);
  }

  const totalDays = calculateLeaveDays(data.start_date, data.end_date);

  const result = await pool.query(
    `
      INSERT INTO leave_requests (
        employee_id,
        leave_type,
        start_date,
        end_date,
        total_days,
        status,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, 'Pending', NOW())
      RETURNING id
    `,
    [
      employeeId,
      data.leave_type,
      data.start_date,
      data.end_date,
      totalDays,
    ]
  );

  const leaveRequest = await getLeaveRequestById(result.rows[0].id);
  function formatLeaveDate(value, fieldName) {
    const date = value instanceof Date ? value : new Date(value);

    if (!date || Number.isNaN(date.getTime())) {
      throw new AppError(`${fieldName} is invalid.`, 400);
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  const startDateLabel = formatLeaveDate(leaveRequest.start_date, 'Start date');
  const endDateLabel = formatLeaveDate(leaveRequest.end_date, 'End date');

  await notificationService.createNotification(
    'Leave Request',
    `${employee.full_name} submitted leave from ${startDateLabel} to ${endDateLabel}.`
  );

  return leaveRequest;
}

async function approveLeaveRequest(leaveRequestId, payload, user) {
  if (!user || user.role !== 'HR') {
    throw new AppError('Forbidden.', 403);
  }

  const managerComments = normalizeText(payload.manager_comments) || null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const leaveResult = await client.query(
      `
        SELECT
          l.*,
          e.full_name AS employee_name,
          e.team AS team,
          e.manager_id AS employee_manager_id,
          e.active AS employee_active
        FROM leave_requests l
        JOIN employees e ON e.id = l.employee_id
        WHERE l.id = $1
        FOR UPDATE
      `,
      [leaveRequestId]
    );

    if (leaveResult.rowCount === 0) {
      throw new AppError('Leave request not found.', 404);
    }

    const leaveRequest = leaveResult.rows[0];

    if (leaveRequest.status !== 'Pending') {
      throw new AppError('Only pending requests can be approved.', 400);
    }

    if (!leaveRequest.employee_active) {
      throw new AppError('Inactive employees cannot have leave approved.', 400);
    }

    const activeTeamResult = await client.query(
      `
        SELECT COUNT(*)::int AS count
        FROM employees
        WHERE team = $1 AND active = TRUE
      `,
      [leaveRequest.team]
    );

    const approvedLeaveResult = await client.query(
      `
        SELECT COUNT(DISTINCT e.id)::int AS count
        FROM leave_requests l
        JOIN employees e ON e.id = l.employee_id
        WHERE e.team = $1
          AND e.active = TRUE
          AND l.status = 'Approved'
          AND l.start_date <= $3
          AND l.end_date >= $2
      `,
      [leaveRequest.team, leaveRequest.start_date, leaveRequest.end_date]
    );

    const activeEmployeeCount = activeTeamResult.rows[0].count;
    const projectedEmployeesOnLeave = approvedLeaveResult.rows[0].count + 1;

    if (!isLeaveCoverageAllowed(activeEmployeeCount, projectedEmployeesOnLeave)) {
      throw new AppError(
        `Approval rejected because ${projectedEmployeesOnLeave} of ${activeEmployeeCount} active employees in the ${leaveRequest.team} team would be on leave.`,
        400
      );
    }

    await client.query(
      `
        UPDATE leave_requests
        SET status = 'Approved',
            manager_comments = $2
        WHERE id = $1
      `,
      [leaveRequestId, managerComments]
    );

    await client.query('COMMIT');

    return getLeaveRequestById(leaveRequestId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function rejectLeaveRequest(leaveRequestId, payload, user) {
  if (!user || user.role !== 'HR') {
    throw new AppError('Forbidden.', 403);
  }

  const managerComments = normalizeText(payload.manager_comments) || 'Rejected by manager.';

  const leaveResult = await pool.query(
    `
      SELECT
        l.*,
        e.manager_id AS employee_manager_id
      FROM leave_requests l
      JOIN employees e ON e.id = l.employee_id
      WHERE l.id = $1
    `,
    [leaveRequestId]
  );

  if (leaveResult.rowCount === 0) {
    throw new AppError('Leave request not found.', 404);
  }

  const leaveRequest = leaveResult.rows[0];
  if (leaveRequest.status !== 'Pending') {
    throw new AppError('Only pending requests can be rejected.', 400);
  }

  await pool.query(
    `
      UPDATE leave_requests
      SET status = 'Rejected',
          manager_comments = $2
      WHERE id = $1
    `,
    [leaveRequestId, managerComments]
  );

  return getLeaveRequestById(leaveRequestId);
}

async function getCurrentLeaveEmployees() {
  const result = await pool.query(
    `
      SELECT
        e.id,
        e.full_name,
        e.team,
        l.leave_type,
        l.start_date,
        l.end_date
      FROM leave_requests l
      JOIN employees e ON e.id = l.employee_id
      WHERE l.status = 'Approved'
        AND CURRENT_DATE BETWEEN l.start_date AND l.end_date
      ORDER BY e.team ASC, e.full_name ASC
    `
  );

  return result.rows;
}

async function getLeaveBalances() {
  const result = await pool.query(
    `
      SELECT
        e.id,
        e.full_name,
        e.team,
        COALESCE(SUM(l.total_days), 0)::int AS used_days
      FROM employees e
      LEFT JOIN leave_requests l
        ON l.employee_id = e.id
       AND l.status = 'Approved'
       AND EXTRACT(YEAR FROM l.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      WHERE e.active = TRUE
      GROUP BY e.id
      ORDER BY e.team ASC, e.full_name ASC
    `
  );

  return result.rows.map((row) => ({
    id: row.id,
    full_name: row.full_name,
    team: row.team,
    used_days: Number(row.used_days),
    balance_days: countLeaveBalance(row.used_days),
    annual_entitlement: ANNUAL_LEAVE_ENTITLEMENT,
  }));
}

module.exports = {
  approveLeaveRequest,
  createLeaveRequest,
  getCurrentLeaveEmployees,
  getLeaveBalances,
  getLeaveRequestById,
  listLeaveRequests,
  rejectLeaveRequest,
};
