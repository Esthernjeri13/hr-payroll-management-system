# HR & Payroll Management System

A lightweight internal HR and Payroll Management System built as part of the Software Engineer Practical Test.

## Overview

This application is designed to help growing teams manage employee records, leave requests, and payroll through a centralized web application instead of spreadsheets and messaging platforms.

## Planned Tech Stack

- **Backend:** Flask
- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Database:** PostgreSQL

## Planned Features

- Employee records and organizational hierarchy
- Leave request and approval workflow
- Monthly payroll generation and payslips
- Dashboard with approvals, leave balances, and payroll information

Simple HR and payroll tool built for a coding assessment using Node.js, Express, PostgreSQL, HTML, CSS, and vanilla JavaScript.

## Project Overview

This app covers the core internal workflows that usually get handled in spreadsheets:

- Employee records with soft delete
- Leave requests with business rule validation
- Monthly payroll generation with pro-rating and deductions
- Simple login and registration
- Role-based access for HR actions
- Notifications when leave is submitted, with unread counts and quick open links
- A dashboard for pending leave, current leave, leave balances, and payroll history

I prioritized the parts that matter most in an interview:

- Business logic correctness
- Readable code with small functions
- A clean but minimal UI
- Plain SQL with `pg` instead of an ORM

## Folder Structure

```text
backend/
frontend/
database/
tests/
README.md
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create PostgreSQL database

Create a database and set these environment variables:

```bash
PORT=3000
PGHOST=localhost
PGPORT=5432
PGDATABASE=hr_payroll
PGUSER=postgres
PGPASSWORD=your_password
```

### 3. Create tables

Run the schema:

```bash
psql -U postgres -d hr_payroll -f database/schema.sql
```

### 4. Load sample data

```bash
psql -U postgres -d hr_payroll -f database/seed.sql
```

### Sample logins

The seed file includes example accounts:

- HR: `hr@company.com` / `Password123!`
- Employee: `john@company.com` / `Password123!`

### 5. Start the app

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Frontend Pages

- `Login` - sign in with email and password
- `Register` - create a user account
- `Dashboard` - pending leave, current leave, leave balances, payroll history
- `Employees` - create, edit, view, and deactivate employees
- `Leave` - submit leave requests
- `Payroll` - generate payroll and view payslips
- `Notifications` - view and mark notifications as read

## API Routes

The API is mounted under `/api`.

### Employees

- `GET /api/employees`
- `GET /api/employees/:id`
- `POST /api/employees`
- `PUT /api/employees/:id`
- `DELETE /api/employees/:id`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Leave

- `GET /api/leave`
- `POST /api/leave`
- `PUT /api/leave/:id/approve`
- `PUT /api/leave/:id/reject`

### Payroll

- `GET /api/payroll`
- `POST /api/payroll/generate`

### Dashboard

- `GET /api/dashboard`

### Notifications

- `GET /api/notifications`
- `PUT /api/notifications/:id/read`
- Clicking a notification marks it as read and opens the related page when one exists.

## Business Rules

### Authentication

- Users register with full name, email, password, confirmation password, and role.
- Passwords are hashed with bcrypt before storage.
- Login stores only `id`, `name`, and `role` in `localStorage`.
- Requests send those values back to the server in headers so the backend can verify the current user.
- When a user registers as an Employee, the system automatically links them to an employee record if one already exists with the same name, or creates a minimal employee record if needed.

### Roles

- `HR` can approve leave, reject leave, create employees, edit employees, deactivate employees, and generate payroll.
- `Employee` can submit leave and view the dashboard, payroll, and notifications.
- The backend returns `403 Forbidden` if an employee calls an HR-only API directly.

### Employees

- Employees are never deleted from the database.
- `DELETE` only deactivates the employee.
- Manager names are shown through a self-referencing `manager_id`.

### Leave Rules

1. Leave cannot be requested in the past.
2. Leave cannot overlap another approved leave for the same employee.
3. Leave requests require at least 3 days notice.
4. A manager cannot approve a request if approving it would make more than 50% of active employees in the team be on leave during the same period.
5. Pending requests appear on the dashboard.
6. Approved unpaid leave reduces payroll.
7. Every leave request creates a notification.
8. Leave dates are validated before formatting, so invalid or missing dates return a clear `400` error instead of `Invalid time value`.

### Payroll Rules

- Payroll is generated for a selected month and year.
- Salary is pro-rated for joiners.
- Unpaid leave reduces gross pay using a daily rate.
- Tax is progressive.
- Social security is a flat 5%.
- Net pay = Gross - Tax - Social Security
- Duplicate payroll records for the same employee, month, and year are skipped instead of inserted again.
- The payroll list filters by the selected month and year.

## Payroll Formula

### Gross Pay

For the selected month:

- Start with monthly salary
- Pro-rate for the number of employment days in that month
- Subtract unpaid leave days using:

```text
daily rate = monthly salary / days in month
gross pay = pro-rated salary - (daily rate * unpaid leave days)
```

### Tax

Progressive brackets:

- `0 - 1000` => `0%`
- `1001 - 3000` => `10%` on the amount above `1000`
- `Above 3000` => `20%` on the amount above `3000`

Examples:

- `1000` => `0`
- `3000` => `200`
- `4000` => `400`

### Social Security

- Flat `5%` of gross pay

## Leave Balance Assumption

Leave balance is based on an assumed annual entitlement of `20 days`.

```text
balance = 20 - approved leave days used in the current year
```

This keeps the dashboard useful without adding extra balance tables or a more complex accrual engine.

## Validation

The backend validates:

- Required fields
- Valid dates
- Salary greater than zero
- Manager exists and is active
- Employee is active for leave requests

## Tests

Business-logic tests are included with Jest for:

- Login and registration
- HR role restrictions
- Notifications after leave submission
- Duplicate payroll prevention
- Progressive tax
- Payroll pro-rating
- Zero-tax edge cases
- Leave overlap
- 3-day notice
- 50% team coverage rule

Run them with:

```bash
npm test
```

## What I Prioritized

I focused on:

1. Leave approval rules
2. Payroll math
3. Authentication and role checks
4. A working end-to-end flow
5. Readable code that is easy to explain in an interview

I did not add unnecessary abstractions, frontend frameworks, or advanced auth libraries.

## Assumptions

- Leave dates are calendar days and inclusive.
- HR approvals are handled by the authenticated user role, not by a separate manager login.
- Leave submission uses the logged-in employee account linked to the user record.
- If a user does not yet have an employee link, the system creates one automatically so leave submission still works.
- Unpaid leave is represented by `leave_type = 'Unpaid'`.
- Payroll is generated for employees who were employed during the selected month.
- The dashboard leave balance uses a simple annual entitlement assumption.
- Date values are expected as `YYYY-MM-DD` and are validated before leave submission or notification formatting.

## Future Improvements

- Store leave accruals and carry-over rules
- Add a termination date for employees
- Add PDF exports for payslips
- Add API-level automated tests
- Improve frontend filtering and search
