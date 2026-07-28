const pool = require('../db/pool');
const { countLeaveBalance } = require('../utils/leaveRules');
const { serializeLeaveRequest, serializePayrollRecord } = require('../utils/serializers');

async function getDashboardSummary() {
  const pendingRequestsResult = await pool.query(
    `
      SELECT
        l.*,
        e.full_name AS employee_name,
        e.manager_id AS manager_id,
        m.full_name AS manager_name
      FROM leave_requests l
      JOIN employees e ON e.id = l.employee_id
      LEFT JOIN employees m ON m.id = e.manager_id
      WHERE l.status = 'Pending'
      ORDER BY l.created_at ASC, l.id ASC
    `
  );

  const currentLeaveResult = await pool.query(
    `
      SELECT
        e.id,
        e.full_name,
        e.team,
        l.leave_type,
        l.start_date,
        l.end_date,
        l.total_days
      FROM leave_requests l
      JOIN employees e ON e.id = l.employee_id
      WHERE l.status = 'Approved'
        AND CURRENT_DATE BETWEEN l.start_date AND l.end_date
      ORDER BY e.team ASC, e.full_name ASC
    `
  );

  const leaveBalanceResult = await pool.query(
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

  const payrollHistoryResult = await pool.query(
    `
      SELECT
        p.*,
        e.full_name AS employee_name
      FROM payroll p
      JOIN employees e ON e.id = p.employee_id
      ORDER BY p.year DESC, p.month DESC, p.created_at DESC
      LIMIT 12
    `
  );

  return {
    pending_requests: pendingRequestsResult.rows.map(serializeLeaveRequest),
    current_on_leave: currentLeaveResult.rows,
    leave_balances: leaveBalanceResult.rows.map((row) => ({
      id: row.id,
      full_name: row.full_name,
      team: row.team,
      used_days: Number(row.used_days),
      balance_days: countLeaveBalance(row.used_days),
    })),
    payroll_history: payrollHistoryResult.rows.map(serializePayrollRecord),
  };
}

module.exports = {
  getDashboardSummary,
};
