TRUNCATE TABLE payroll, notifications, leave_requests, users, employees RESTART IDENTITY CASCADE;

INSERT INTO employees (id, full_name, role, team, manager_id, start_date, salary, employment_type, active, deactivated_at)
VALUES
  (1, 'Sarah Johnson', 'Operations Manager', 'Operations', NULL, '2024-01-10', 6200.00, 'Full-time', TRUE, NULL),
  (2, 'John Mwangi', 'Operations Officer', 'Operations', 1, '2025-03-01', 3200.00, 'Full-time', TRUE, NULL),
  (3, 'Mike Otieno', 'Operations Assistant', 'Operations', 1, '2025-07-15', 2400.00, 'Contract', TRUE, NULL),
  (4, 'Daniel Smith', 'Finance Manager', 'Finance', NULL, '2023-11-20', 7000.00, 'Full-time', TRUE, NULL),
  (5, 'Aisha Khan', 'Accountant', 'Finance', 4, '2025-01-05', 4500.00, 'Full-time', TRUE, NULL),
  (6, 'Peter Kimani', 'Finance Assistant', 'Finance', 4, '2026-06-10', 2100.00, 'Part-time', TRUE, NULL);

SELECT setval(pg_get_serial_sequence('employees', 'id'), 6, TRUE);

INSERT INTO users (id, full_name, email, password, role, employee_id, created_at)
VALUES
  (1, 'Sarah Johnson', 'sarah@company.com', crypt('Password123!', gen_salt('bf')), 'Employee', 1, NOW()),
  (2, 'John Mwangi', 'john@company.com', crypt('Password123!', gen_salt('bf')), 'Employee', 2, NOW()),
  (3, 'Mike Otieno', 'mike@company.com', crypt('Password123!', gen_salt('bf')), 'Employee', 3, NOW()),
  (4, 'Daniel Smith', 'daniel@company.com', crypt('Password123!', gen_salt('bf')), 'Employee', 4, NOW()),
  (5, 'Aisha Khan', 'aisha@company.com', crypt('Password123!', gen_salt('bf')), 'Employee', 5, NOW()),
  (6, 'Peter Kimani', 'peter@company.com', crypt('Password123!', gen_salt('bf')), 'Employee', 6, NOW()),
  (7, 'HR Admin', 'hr@company.com', crypt('Password123!', gen_salt('bf')), 'HR', NULL, NOW());

SELECT setval(pg_get_serial_sequence('users', 'id'), 7, TRUE);

INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, total_days, status, manager_comments, created_at)
VALUES
  (1, 2, 'Annual', '2026-07-30', '2026-08-02', 4, 'Approved', 'Approved for family travel.', '2026-07-20 09:00:00+00'),
  (2, 3, 'Unpaid', '2026-08-05', '2026-08-07', 3, 'Pending', NULL, '2026-07-25 10:00:00+00'),
  (3, 5, 'Sick', '2026-07-10', '2026-07-12', 3, 'Rejected', 'Medical certificate not provided.', '2026-07-08 08:30:00+00'),
  (4, 6, 'Unpaid', '2026-07-28', '2026-07-29', 2, 'Approved', 'Short unpaid personal leave.', '2026-07-18 11:15:00+00');

SELECT setval(pg_get_serial_sequence('leave_requests', 'id'), 4, TRUE);

INSERT INTO notifications (id, title, message, created_at, is_read)
VALUES
  (1, 'Leave Request', 'John Mwangi submitted leave from 30 Jul 2026 to 2 Aug 2026.', '2026-07-20 09:05:00+00', TRUE),
  (2, 'Leave Request', 'Mike Otieno submitted leave from 5 Aug 2026 to 7 Aug 2026.', '2026-07-25 10:05:00+00', FALSE);

SELECT setval(pg_get_serial_sequence('notifications', 'id'), 2, TRUE);

INSERT INTO payroll (id, employee_id, month, year, gross_pay, unpaid_leave_days, tax, social_security, net_pay, created_at)
VALUES
  (1, 1, 7, 2026, 6200.00, 0, 1040.00, 310.00, 4850.00, '2026-07-25 12:00:00+00'),
  (2, 2, 7, 2026, 2980.65, 4, 198.07, 149.03, 2633.55, '2026-07-25 12:05:00+00'),
  (3, 4, 7, 2026, 7000.00, 0, 1400.00, 350.00, 5250.00, '2026-07-25 12:10:00+00'),
  (4, 5, 7, 2026, 4200.00, 0, 440.00, 210.00, 3550.00, '2026-07-25 12:15:00+00');

SELECT setval(pg_get_serial_sequence('payroll', 'id'), 4, TRUE);
