const pool = require('../db/pool');
const AppError = require('../utils/appError');
const { serializePayrollRecord } = require('../utils/serializers');
const { calculatePayrollForPeriod } = require('../utils/payrollRules');
const { getMonthRange, overlapDays, parseDateOnly } = require('../utils/dateUtils');

function normalizeMonthYear(payload) {
  const month = Number(payload.month);
  const year = Number(payload.year);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new AppError('Month must be between 1 and 12.', 400);
  }

  if (!Number.isInteger(year) || year < 2000) {
    throw new AppError('Year is required.', 400);
  }

  return { month, year };
}

async function getPayrollRecords(filters = {}) {
  const values = [];
  let whereClause = '';

  if (filters.month && filters.year) {
    whereClause = 'WHERE p.month = $1 AND p.year = $2';
    values.push(Number(filters.month), Number(filters.year));
  }

  const result = await pool.query(
    `
      SELECT
        p.*,
        e.full_name AS employee_name
      FROM payroll p
      JOIN employees e ON e.id = p.employee_id
      ${whereClause}
      ORDER BY p.year DESC, p.month DESC, e.full_name ASC
      LIMIT 200
    `,
    values
  );

  return result.rows.map(serializePayrollRecord);
}

async function generatePayroll(payload) {
  const { month, year } = normalizeMonthYear(payload);
  const { start: monthStart, end: monthEnd } = getMonthRange(year, month);

  const employeeResult = await pool.query(
    `
      SELECT
        id,
        full_name,
        start_date,
        salary,
        deactivated_at
      FROM employees
      WHERE start_date <= $2
        AND (deactivated_at IS NULL OR deactivated_at >= $1)
      ORDER BY full_name ASC
    `,
    [monthStart, monthEnd]
  );

  const client = await pool.connect();
  const generated = [];
  const skippedMessages = [];

  try {
    await client.query('BEGIN');

    for (const employee of employeeResult.rows) {
      const existingPayrollResult = await client.query(
        `
          SELECT id
          FROM payroll
          WHERE employee_id = $1
            AND month = $2
            AND year = $3
          LIMIT 1
        `,
        [employee.id, month, year]
      );

      if (existingPayrollResult.rowCount > 0) {
        skippedMessages.push('Payroll has already been generated for this employee for this period.');
        continue;
      }

      const unpaidLeaveResult = await client.query(
        `
          SELECT start_date, end_date
          FROM leave_requests
          WHERE employee_id = $1
            AND status = 'Approved'
            AND LOWER(leave_type) = 'unpaid'
            AND start_date <= $3
            AND end_date >= $2
        `,
        [employee.id, monthStart, monthEnd]
      );

      const unpaidLeaveDays = unpaidLeaveResult.rows.reduce((total, leaveRequest) => {
        const overlap = overlapDays(leaveRequest.start_date, leaveRequest.end_date, monthStart, monthEnd);
        return total + (overlap || 0);
      }, 0);

      const payroll = calculatePayrollForPeriod({
        salary: employee.salary,
        month,
        year,
        startDate: employee.start_date,
        endDate: employee.deactivated_at,
        unpaidLeaveDays,
      });

      await client.query(
        `
          INSERT INTO payroll (
            employee_id,
            month,
            year,
            gross_pay,
            unpaid_leave_days,
            tax,
            social_security,
            net_pay,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `,
        [
          employee.id,
          month,
          year,
          payroll.grossPay,
          payroll.unpaidLeaveDays,
          payroll.tax,
          payroll.socialSecurity,
          payroll.netPay,
        ]
      );

      generated.push({
        employee_id: employee.id,
        employee_name: employee.full_name,
        month,
        year,
        gross_pay: payroll.grossPay,
        unpaid_leave_days: payroll.unpaidLeaveDays,
        tax: payroll.tax,
        social_security: payroll.socialSecurity,
        net_pay: payroll.netPay,
      });
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const records = await getPayrollRecords({ month, year });

  return {
    month,
    year,
    generated_count: generated.length,
    skipped_count: skippedMessages.length,
    message: skippedMessages.length > 0 ? skippedMessages[0] : 'Payroll generated successfully.',
    skipped_messages: skippedMessages,
    records,
  };
}

module.exports = {
  generatePayroll,
  getPayrollRecords,
};
