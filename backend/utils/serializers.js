function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function serializeEmployee(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    role: row.role,
    team: row.team,
    manager_id: row.manager_id,
    manager_name: row.manager_name || null,
    start_date: row.start_date,
    salary: toNumber(row.salary),
    employment_type: row.employment_type,
    active: row.active,
    deactivated_at: row.deactivated_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function serializeLeaveRequest(row) {
  return {
    id: row.id,
    employee_id: row.employee_id,
    employee_name: row.employee_name || null,
    manager_id: row.manager_id || null,
    manager_name: row.manager_name || null,
    leave_type: row.leave_type,
    start_date: row.start_date,
    end_date: row.end_date,
    total_days: Number(row.total_days),
    status: row.status,
    manager_comments: row.manager_comments || null,
    created_at: row.created_at,
  };
}

function serializePayrollRecord(row) {
  return {
    id: row.id,
    employee_id: row.employee_id,
    employee_name: row.employee_name || null,
    month: Number(row.month),
    year: Number(row.year),
    gross_pay: toNumber(row.gross_pay),
    unpaid_leave_days: Number(row.unpaid_leave_days),
    tax: toNumber(row.tax),
    social_security: toNumber(row.social_security),
    net_pay: toNumber(row.net_pay),
    created_at: row.created_at,
  };
}

module.exports = {
  serializeEmployee,
  serializeLeaveRequest,
  serializePayrollRecord,
  toNumber,
};
