const {
  daysBetween,
  getTodayDateString,
  inclusiveDaysBetween,
  overlapDays,
  compareDateStrings,
} = require('./dateUtils');

const MINIMUM_NOTICE_DAYS = 3;
const ANNUAL_LEAVE_ENTITLEMENT = 20;

function calculateLeaveDays(startDate, endDate) {
  return inclusiveDaysBetween(startDate, endDate);
}

function hasMinimumNotice(requestDate, leaveStartDate, minimumDays = MINIMUM_NOTICE_DAYS) {
  const difference = daysBetween(requestDate, leaveStartDate);
  if (difference === null) {
    return false;
  }

  return difference >= minimumDays;
}

function isPastDate(referenceDate, targetDate) {
  return compareDateStrings(targetDate, referenceDate) < 0;
}

function countLeaveBalance(approvedLeaveDays) {
  return Math.max(0, ANNUAL_LEAVE_ENTITLEMENT - Math.max(0, Number(approvedLeaveDays) || 0));
}

function isLeaveCoverageAllowed(activeEmployeeCount, employeesOnLeaveCount) {
  if (activeEmployeeCount <= 0) {
    return false;
  }

  return employeesOnLeaveCount / activeEmployeeCount <= 0.5;
}

module.exports = {
  ANNUAL_LEAVE_ENTITLEMENT,
  MINIMUM_NOTICE_DAYS,
  calculateLeaveDays,
  countLeaveBalance,
  hasMinimumNotice,
  isLeaveCoverageAllowed,
  isPastDate,
};
