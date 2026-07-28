CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  team TEXT NOT NULL,
  manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  salary NUMERIC(12, 2) NOT NULL CHECK (salary > 0),
  employment_type TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  deactivated_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Employee', 'HR')),
  employee_id INTEGER UNIQUE REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL CHECK (total_days > 0),
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  manager_comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS payroll (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  gross_pay NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unpaid_leave_days INTEGER NOT NULL DEFAULT 0,
  tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
  social_security NUMERIC(12, 2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_status_dates
  ON leave_requests (status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_dates
  ON leave_requests (employee_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_payroll_period
  ON payroll (year, month);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications (created_at DESC);
