jest.mock('../backend/db/pool', () => ({
  query: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const pool = require('../backend/db/pool');
const bcrypt = require('bcryptjs');
const authService = require('../backend/services/authService');

describe('auth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registers a user, hashes the password, and creates a linked employee record', async () => {
    pool.query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 99 }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 10,
            full_name: 'HR Admin',
            email: 'hr@company.com',
            role: 'HR',
            employee_id: 99,
            created_at: '2026-07-28T00:00:00Z',
          },
        ],
      });

    bcrypt.hash.mockResolvedValueOnce('hashed-password');

    const user = await authService.registerUser({
      full_name: 'HR Admin',
      email: 'hr@company.com',
      password: 'Password123!',
      confirm_password: 'Password123!',
      role: 'HR',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
    expect(user.email).toBe('hr@company.com');
    expect(user.role).toBe('HR');
    expect(user.employee_id).toBe(99);
  });

  test('rejects duplicate registration emails', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });

    await expect(
      authService.registerUser({
        full_name: 'John Doe',
        email: 'john@company.com',
        password: 'Password123!',
        confirm_password: 'Password123!',
        role: 'Employee',
      })
    ).rejects.toThrow('Email is already registered.');
  });

  test('logs in with a matching password', async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: 2,
          full_name: 'John Mwangi',
          email: 'john@company.com',
          password: 'stored-hash',
          role: 'Employee',
          employee_id: 2,
        },
      ],
    });

    bcrypt.compare.mockResolvedValueOnce(true);

    const user = await authService.loginUser({
      email: 'john@company.com',
      password: 'Password123!',
    });

    expect(bcrypt.compare).toHaveBeenCalledWith('Password123!', 'stored-hash');
    expect(user).toMatchObject({
      id: 2,
      full_name: 'John Mwangi',
      role: 'Employee',
    });
  });
});
