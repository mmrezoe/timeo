const { startOfDay, addDays } = require('date-fns');

function dayRangeFromDate(d) {
  // d can be a Date or YYYY-MM-DD string
  const date = typeof d === 'string' ? new Date(d) : d || new Date();
  const start = startOfDay(date);
  const end = addDays(start, 1);
  return { start, end };
}

// Get local date string in YYYY-MM-DD format for consistent date comparison
function getLocalDateString(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Normalize date to local midnight (not UTC) for consistent day comparison
function normalizeToLocalMidnight(date) {
  const d = date instanceof Date ? date : new Date(date);
  const normalized = new Date(d);
  normalized.setHours(0, 0, 0, 0);
  normalized.setMinutes(0, 0, 0);
  return normalized;
}

module.exports = { dayRangeFromDate, getLocalDateString, normalizeToLocalMidnight };
