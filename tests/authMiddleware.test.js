const { requireRole } = require('../backend/middleware/authMiddleware');

describe('auth middleware', () => {
  test('forbids employees from HR actions', () => {
    const req = { user: { role: 'Employee' } };
    const res = {};
    const next = jest.fn();

    requireRole('HR')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeDefined();
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  test('allows HR users through', () => {
    const req = { user: { role: 'HR' } };
    const res = {};
    const next = jest.fn();

    requireRole('HR')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0].length).toBe(0);
  });
});
