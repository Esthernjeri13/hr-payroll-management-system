jest.mock('../backend/db/pool', () => ({
  query: jest.fn(),
}));

jest.mock('../backend/services/notificationService', () => ({
  createNotification: jest.fn(),
}));

const pool = require('../backend/db/pool');
const notificationService = require('../backend/services/notificationService');
const leaveService = require('../backend/services/leaveService');

describe('leave service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a notification after leave submission', async () => {
    pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 2,
            full_name: 'John Mwangi',
            active: true,
            start_date: '2025-03-01',
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 11 }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 11,
            employee_id: 2,
            employee_name: 'John Mwangi',
            manager_id: 1,
            manager_name: 'Sarah Johnson',
            leave_type: 'Annual',
            start_date: new Date('2026-07-30T00:00:00.000Z'),
            end_date: new Date('2026-08-02T00:00:00.000Z'),
            total_days: 4,
            status: 'Pending',
            manager_comments: null,
            created_at: '2026-07-25T10:00:00Z',
          },
        ],
      });

    const leaveRequest = await leaveService.createLeaveRequest(
      {
        leave_type: 'Annual',
        start_date: '2026-07-30',
        end_date: '2026-08-02',
      },
      { employee_id: 2 },
      '2026-07-25'
    );

    expect(leaveRequest.id).toBe(11);
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      'Leave Request',
      'John Mwangi submitted leave from 30 Jul 2026 to 2 Aug 2026.'
    );
  });

  test('allows same-day leave requests', async () => {
    pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 2,
            full_name: 'John Mwangi',
            active: true,
            start_date: '2025-03-01',
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 15 }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 15,
            employee_id: 2,
            employee_name: 'John Mwangi',
            manager_id: 1,
            manager_name: 'Sarah Johnson',
            leave_type: 'Sick',
            start_date: '2026-07-30',
            end_date: '2026-07-30',
            total_days: 1,
            status: 'Pending',
            manager_comments: null,
            created_at: '2026-07-25T10:00:00Z',
          },
        ],
      });

    const leaveRequest = await leaveService.createLeaveRequest(
      {
        leave_type: 'Sick',
        start_date: '2026-07-30',
        end_date: '2026-07-30',
      },
      { employee_id: 2 },
      '2026-07-25'
    );

    expect(leaveRequest.total_days).toBe(1);
  });

  test('creates an employee link for users without an employee record before submitting leave', async () => {
    pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 7,
            full_name: 'HR Admin',
            role: 'HR',
            employee_id: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 20 }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 20,
            full_name: 'HR Admin',
            active: true,
            start_date: '2026-07-01',
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 21 }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 21,
            employee_id: 20,
            employee_name: 'HR Admin',
            manager_id: null,
            manager_name: null,
            leave_type: 'Annual',
            start_date: '2026-07-30',
            end_date: '2026-08-02',
            total_days: 4,
            status: 'Pending',
            manager_comments: null,
            created_at: '2026-07-25T10:00:00Z',
          },
        ],
      });

    const leaveRequest = await leaveService.createLeaveRequest(
      {
        leave_type: 'Annual',
        start_date: '2026-07-30',
        end_date: '2026-08-02',
      },
      { id: 7, employee_id: null },
      '2026-07-25'
    );

    expect(leaveRequest.id).toBe(21);
    expect(notificationService.createNotification).toHaveBeenCalled();
    expect(pool.query.mock.calls.some((call) => String(call[0]).includes('INSERT INTO employees'))).toBe(true);
  });

  test('rejects missing start date', async () => {
    await expect(
      leaveService.createLeaveRequest(
        {
          leave_type: 'Annual',
          end_date: '2026-07-30',
        },
        { employee_id: 2 },
        '2026-07-25'
      )
    ).rejects.toThrow('Valid start date is required.');

    expect(pool.query).not.toHaveBeenCalled();
  });

  test('rejects missing end date', async () => {
    await expect(
      leaveService.createLeaveRequest(
        {
          leave_type: 'Annual',
          start_date: '2026-07-30',
        },
        { employee_id: 2 },
        '2026-07-25'
      )
    ).rejects.toThrow('Valid end date is required.');

    expect(pool.query).not.toHaveBeenCalled();
  });

  test('rejects end date before start date', async () => {
    await expect(
      leaveService.createLeaveRequest(
        {
          leave_type: 'Annual',
          start_date: '2026-07-31',
          end_date: '2026-07-30',
        },
        { employee_id: 2 },
        '2026-07-25'
      )
    ).rejects.toThrow('End date cannot be before start date.');
  });

  test('rejects invalid date strings', async () => {
    await expect(
      leaveService.createLeaveRequest(
        {
          leave_type: 'Annual',
          start_date: 'not-a-date',
          end_date: '2026-07-30',
        },
        { employee_id: 2 },
        '2026-07-25'
      )
    ).rejects.toThrow('Valid start date is required.');

    await expect(
      leaveService.createLeaveRequest(
        {
          leave_type: 'Annual',
          start_date: '2026-07-30',
          end_date: 'bad-date',
        },
        { employee_id: 2 },
        '2026-07-25'
      )
    ).rejects.toThrow('Valid end date is required.');
  });
});
