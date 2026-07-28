const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad(value) {
  return String(value).padStart(2, '0');
}

function parseDateOnly(value) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDateOnly(date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
  ].join('-');
}

function getTodayDateString(referenceDate = new Date()) {
  return formatDateOnly(new Date(Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  )));
}

function compareDateStrings(left, right) {
  const leftDate = parseDateOnly(left);
  const rightDate = parseDateOnly(right);

  if (!leftDate || !rightDate) {
    return null;
  }

  if (leftDate.getTime() === rightDate.getTime()) {
    return 0;
  }

  return leftDate.getTime() < rightDate.getTime() ? -1 : 1;
}

function daysBetween(startDate, endDate) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (!start || !end) {
    return null;
  }

  return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
}

function inclusiveDaysBetween(startDate, endDate) {
  const difference = daysBetween(startDate, endDate);
  if (difference === null) {
    return null;
  }
  return difference + 1;
}

function getDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getMonthRange(year, month) {
  const monthValue = pad(month);
  const daysInMonth = getDaysInMonth(year, month);

  return {
    start: `${year}-${monthValue}-01`,
    end: `${year}-${monthValue}-${pad(daysInMonth)}`,
    daysInMonth,
  };
}

function overlapDays(startA, endA, startB, endB) {
  const leftStart = parseDateOnly(startA);
  const leftEnd = parseDateOnly(endA);
  const rightStart = parseDateOnly(startB);
  const rightEnd = parseDateOnly(endB);

  if (!leftStart || !leftEnd || !rightStart || !rightEnd) {
    return null;
  }

  const overlapStart = leftStart.getTime() > rightStart.getTime() ? leftStart : rightStart;
  const overlapEnd = leftEnd.getTime() < rightEnd.getTime() ? leftEnd : rightEnd;

  if (overlapStart.getTime() > overlapEnd.getTime()) {
    return 0;
  }

  return inclusiveDaysBetween(formatDateOnly(overlapStart), formatDateOnly(overlapEnd));
}

function maxDate(left, right) {
  return compareDateStrings(left, right) >= 0 ? left : right;
}

function minDate(left, right) {
  return compareDateStrings(left, right) <= 0 ? left : right;
}

module.exports = {
  compareDateStrings,
  daysBetween,
  formatDateOnly,
  getDaysInMonth,
  getMonthRange,
  getTodayDateString,
  inclusiveDaysBetween,
  maxDate,
  minDate,
  overlapDays,
  pad,
  parseDateOnly,
};
