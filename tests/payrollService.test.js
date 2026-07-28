jest.mock('../backend/db/pool', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

const pool = require('../backend/db/pool');
const payrollService = require('../backend/services/payrollService');

describe('payroll service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('prevents duplicate payroll rows for the same employee and period', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };

    pool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            full_name: 'John Mwangi',
            start_date: '2025-03-01',
            salary: 3200,
            deactivated_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    pool.connect.mockResolvedValueOnce(client);
    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] })
      .mockResolvedValueOnce({});

    const result = await payrollService.generatePayroll({ month: 7, year: 2026 });

    expect(result.generated_count).toBe(0);
    expect(result.skipped_count).toBe(1);
    expect(result.message).toBe('Payroll has already been generated for this employee for this period.');
    expect(client.query.mock.calls.some((call) => String(call[0]).includes('INSERT INTO payroll'))).toBe(false);
  });

  test('filters payroll records by month and year', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          employee_name: 'John Mwangi',
          employee_id: 2,
          month: 7,
          year: 2026,
          gross_pay: 3000,
          unpaid_leave_days: 0,
          tax: 200,
          social_security: 150,
          net_pay: 2650,
          created_at: '2026-07-25T12:00:00Z',
        },
      ],
    });

    const records = await payrollService.getPayrollRecords({ month: '7', year: '2026' });

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE p.month = $1 AND p.year = $2'),
      [7, 2026]
    );
    expect(records).toHaveLength(1);
    expect(records[0].month).toBe(7);
    expect(records[0].year).toBe(2026);
  });
});
