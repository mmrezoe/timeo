/**
 * Centralized date utilities for timezone-independent operations.
 *
 * CRITICAL: All "day" logic uses LOGICAL DAY (YYYY-MM-DD) in a single timezone (app or passed-in).
 * - Timestamps are stored in UTC (instant).
 * - "Today", "yesterday", day ranges and streak are derived from logical day only.
 * - Never use server/browser local getDate()/setDate() for "current day" or "n days ago".
 *
 * On the server: optional tz defaults to process.env.APP_TIMEZONE || 'UTC'.
 * On the client: APP_TIMEZONE is not available; callers MUST pass tz from /api/timezone or /api/review/today.
 */

let zonedTimeToUtc, utcToZonedTime;
try {
  ({ zonedTimeToUtc, utcToZonedTime } = require('date-fns-tz'));
} catch (e) {
  zonedTimeToUtc = (date, _tz) => new Date(date);
  utcToZonedTime = (date, _tz) => new Date(date);
}

const pad2 = (n) => String(n).padStart(2, '0');

function getAppTimeZone() {
  return process.env.APP_TIMEZONE || 'UTC';
}

/**
 * Resolve timezone: use provided tz or (server-only) APP_TIMEZONE.
 * @param {string} [tz] - Optional timezone (e.g. 'Asia/Tehran'). Required on client.
 */
function resolveTz(tz) {
  return tz != null && tz !== '' ? tz : getAppTimeZone();
}

function getNowUTC() {
  return new Date();
}

function toUTC(date) {
  if (!date) return getNowUTC();
  if (date instanceof Date) return new Date(date.getTime());
  return new Date(date);
}

// ---------- Logical day (YYYY-MM-DD) ----------

/**
 * Get the current logical day in the given timezone.
 * @param {string} [tz] - Timezone (required on client).
 * @returns {string} YYYY-MM-DD
 */
function getCurrentLogicalDay(tz) {
  const resolved = resolveTz(tz);
  const zoned = utcToZonedTime(getNowUTC(), resolved);
  return `${zoned.getFullYear()}-${pad2(zoned.getMonth() + 1)}-${pad2(zoned.getDate())}`;
}

/**
 * Get the logical day (YYYY-MM-DD) for a UTC instant in the given timezone.
 * @param {Date|string|number} instant - UTC instant
 * @param {string} [tz] - Timezone
 * @returns {string} YYYY-MM-DD
 */
function getLogicalDayFromUTC(instant, tz) {
  const resolved = resolveTz(tz);
  const d = toUTC(instant);
  const zoned = utcToZonedTime(d, resolved);
  return `${zoned.getFullYear()}-${pad2(zoned.getMonth() + 1)}-${pad2(zoned.getDate())}`;
}

/**
 * Start of logical day in the given timezone, as UTC Date.
 * @param {string} day - YYYY-MM-DD
 * @param {string} [tz] - Timezone
 * @returns {Date} UTC instant of midnight that day in tz
 */
function getStartOfLogicalDayUTC(day, tz) {
  const resolved = resolveTz(tz);
  return zonedTimeToUtc(`${day}T00:00:00`, resolved);
}

/**
 * End of logical day = start of next day (exclusive).
 * @param {string} day - YYYY-MM-DD
 * @param {string} [tz] - Timezone
 * @returns {Date} UTC instant of midnight of the NEXT day in tz
 */
function getEndOfLogicalDayUTC(day, tz) {
  const nextDay = addLogicalDays(day, 1, tz);
  return getStartOfLogicalDayUTC(nextDay, tz);
}

/**
 * Add n days to a logical day (calendar arithmetic in the given timezone).
 * @param {string} day - YYYY-MM-DD
 * @param {number} n - Number of days to add (can be negative)
 * @param {string} [tz] - Timezone (used for DST-safe arithmetic)
 */
function addLogicalDays(day, n, tz) {
  const resolved = resolveTz(tz);
  const start = getStartOfLogicalDayUTC(day, resolved);
  const zoned = utcToZonedTime(start, resolved);
  zoned.setDate(zoned.getDate() + n);
  return getLogicalDayFromUTC(zoned, resolved);
}

/**
 * Subtract n days from a logical day.
 * @param {string} day - YYYY-MM-DD
 * @param {number} n - Number of days to subtract
 * @param {string} [tz] - Timezone
 * @returns {string} YYYY-MM-DD
 */
function subtractLogicalDays(day, n, tz) {
  return addLogicalDays(day, -n, tz);
}

/**
 * Whether currentDay is the calendar day immediately after prevDay.
 * @param {string} prevDay - YYYY-MM-DD
 * @param {string} currentDay - YYYY-MM-DD
 * @returns {boolean}
 */
function isNextLogicalDay(prevDay, currentDay) {
  return addLogicalDays(prevDay, 1, 'UTC') === currentDay;
}

// ---------- Day range from instant ----------

/**
 * Get UTC start/end for the logical day that contains the given instant.
 * @param {Date|string} d - Any instant
 * @param {string} [tz] - Timezone (required on client)
 * @returns {{ start: Date, end: Date }}
 */
function dayRangeFromDate(d, tz) {
  const resolved = resolveTz(tz);
  const instant = toUTC(d);
  const day = getLogicalDayFromUTC(instant, resolved);
  return {
    start: getStartOfLogicalDayUTC(day, resolved),
    end: getEndOfLogicalDayUTC(day, resolved),
  };
}

/**
 * Get midnight (start of logical day) for the given instant in tz.
 * Returns UTC Date of that midnight.
 * @param {Date|string} date - Instant
 * @param {string} [tz] - Timezone
 * @returns {Date}
 */
function normalizeToUTCMidnight(date, tz) {
  const resolved = resolveTz(tz);
  const instant = toUTC(date);
  const day = getLogicalDayFromUTC(instant, resolved);
  return getStartOfLogicalDayUTC(day, resolved);
}

/**
 * Date string YYYY-MM-DD for the given instant in the app/passed timezone.
 * @param {Date|string} date - Instant
 * @param {string} [tz] - Timezone
 * @returns {string} YYYY-MM-DD
 */
function getUTCDateString(date, tz) {
  const instant = toUTC(date);
  return getLogicalDayFromUTC(instant, resolveTz(tz));
}

function getLocalDateString(date, tz) {
  return getUTCDateString(date, tz);
}

function parseUTC(dateString) {
  if (!dateString) return getNowUTC();
  if (dateString instanceof Date) return dateString;
  return new Date(dateString);
}

function toISOStringUTC(date) {
  return toUTC(date).toISOString();
}

module.exports = {
  getAppTimeZone,
  resolveTz,
  getNowUTC,
  toUTC,
  getCurrentLogicalDay,
  getLogicalDayFromUTC,
  getStartOfLogicalDayUTC,
  getEndOfLogicalDayUTC,
  addLogicalDays,
  subtractLogicalDays,
  isNextLogicalDay,
  dayRangeFromDate,
  normalizeToUTCMidnight,
  getUTCDateString,
  getLocalDateString,
  parseUTC,
  toISOStringUTC,
  normalizeToLocalMidnight: normalizeToUTCMidnight,
};
