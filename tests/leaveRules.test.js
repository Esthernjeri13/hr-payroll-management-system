const {
  calculateLeaveDays,
  hasMinimumNotice,
  isLeaveCoverageAllowed,
} = require('../backend/utils/leaveRules');
const { overlapDays } = require('../backend/utils/dateUtils');

describe('leave rules', () => {
  test('counts leave days inclusively', () => {
    expect(calculateLeaveDays('2026-07-01', '2026-07-03')).toBe(3);
  });

  test('enforces three-day notice', () => {
    expect(hasMinimumNotice('2026-07-01', '2026-07-04')).toBe(true);
    expect(hasMinimumNotice('2026-07-01', '2026-07-03')).toBe(false);
  });

  test('detects overlapping leave periods', () => {
    expect(overlapDays('2026-07-01', '2026-07-05', '2026-07-04', '2026-07-10')).toBe(2);
    expect(overlapDays('2026-07-01', '2026-07-05', '2026-07-06', '2026-07-09')).toBe(0);
  });

  test('blocks coverage above fifty percent', () => {
    expect(isLeaveCoverageAllowed(3, 2)).toBe(false);
    expect(isLeaveCoverageAllowed(2, 1)).toBe(true);
    expect(isLeaveCoverageAllowed(4, 2)).toBe(true);
  });
});
