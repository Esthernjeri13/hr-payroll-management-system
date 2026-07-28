const {
  calculatePayrollForPeriod,
  calculateProgressiveTax,
  calculateSocialSecurity,
} = require('../backend/utils/payrollRules');

describe('payroll rules', () => {
  test('calculates progressive tax across brackets', () => {
    expect(calculateProgressiveTax(1000)).toBe(0);
    expect(calculateProgressiveTax(3000)).toBe(200);
    expect(calculateProgressiveTax(4000)).toBe(400);
  });

  test('calculates social security at 5 percent', () => {
    expect(calculateSocialSecurity(2500)).toBe(125);
  });

  test('pro-rates salary for a mid-month joiner', () => {
    const result = calculatePayrollForPeriod({
      salary: 3000,
      month: 7,
      year: 2026,
      startDate: '2026-07-16',
      unpaidLeaveDays: 0,
    });

    expect(result.grossPay).toBe(1500);
    expect(result.tax).toBe(50);
    expect(result.socialSecurity).toBe(75);
    expect(result.netPay).toBe(1375);
  });

  test('handles zero tax and full month unpaid leave', () => {
    const zeroTax = calculatePayrollForPeriod({
      salary: 1000,
      month: 7,
      year: 2026,
      startDate: '2026-07-01',
      unpaidLeaveDays: 0,
    });

    expect(zeroTax.tax).toBe(0);
    expect(zeroTax.socialSecurity).toBe(50);
    expect(zeroTax.netPay).toBe(950);

    const unpaid = calculatePayrollForPeriod({
      salary: 3000,
      month: 7,
      year: 2026,
      startDate: '2026-07-01',
      unpaidLeaveDays: 31,
    });

    expect(unpaid.grossPay).toBe(0);
    expect(unpaid.tax).toBe(0);
    expect(unpaid.socialSecurity).toBe(0);
    expect(unpaid.netPay).toBe(0);
  });
});
