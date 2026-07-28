const {
  getDaysInMonth,
  getMonthRange,
  inclusiveDaysBetween,
  maxDate,
  minDate,
  overlapDays,
  pad,
  compareDateStrings,
} = require('./dateUtils');

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function calculateProgressiveTax(grossPay) {
  const amount = Math.max(0, Number(grossPay) || 0);

  if (amount <= 1000) {
    return 0;
  }

  if (amount <= 3000) {
    return roundMoney((amount - 1000) * 0.1);
  }

  return roundMoney(200 + (amount - 3000) * 0.2);
}

function calculateSocialSecurity(grossPay) {
  return roundMoney(Math.max(0, Number(grossPay) || 0) * 0.05);
}

function calculatePayrollForPeriod({
  salary,
  month,
  year,
  startDate,
  endDate = null,
  unpaidLeaveDays = 0,
}) {
  const monthlySalary = Math.max(0, Number(salary) || 0);
  const { start: monthStart, end: monthEnd, daysInMonth } = getMonthRange(Number(year), Number(month));

  const employmentStart = compareDateStrings(startDate, monthStart) > 0 ? startDate : monthStart;
  const employmentEnd = endDate && compareDateStrings(endDate, monthEnd) < 0 ? endDate : monthEnd;

  if (compareDateStrings(employmentStart, employmentEnd) > 0) {
    return {
      grossPay: 0,
      tax: 0,
      socialSecurity: 0,
      netPay: 0,
      unpaidLeaveDays: 0,
      proratedDays: 0,
      daysInMonth,
    };
  }

  const proratedDays = inclusiveDaysBetween(employmentStart, employmentEnd);
  const dailyRate = monthlySalary / daysInMonth;
  const grossBeforeLeave = roundMoney((monthlySalary * proratedDays) / daysInMonth);
  const effectiveUnpaidLeaveDays = Math.min(Math.max(0, Number(unpaidLeaveDays) || 0), proratedDays);
  const grossPay = roundMoney(Math.max(0, grossBeforeLeave - dailyRate * effectiveUnpaidLeaveDays));
  const tax = calculateProgressiveTax(grossPay);
  const socialSecurity = calculateSocialSecurity(grossPay);
  const netPay = roundMoney(Math.max(0, grossPay - tax - socialSecurity));

  return {
    grossPay,
    tax,
    socialSecurity,
    netPay,
    unpaidLeaveDays: effectiveUnpaidLeaveDays,
    proratedDays,
    daysInMonth,
  };
}

module.exports = {
  calculateProgressiveTax,
  calculatePayrollForPeriod,
  calculateSocialSecurity,
  roundMoney,
};
