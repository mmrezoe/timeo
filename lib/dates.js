const { startOfDay, addDays } = require('date-fns');

function dayRangeFromDate(d) {
  // d can be a Date or YYYY-MM-DD string
  const date = typeof d === 'string' ? new Date(d) : d || new Date();
  const start = startOfDay(date);
  const end = addDays(start, 1);
  return { start, end };
}

module.exports = { dayRangeFromDate };
