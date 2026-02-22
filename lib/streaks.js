/**
 * Advanced streak logic: freeze days, grace period, weekly habits.
 * All comparisons use logical day (YYYY-MM-DD). Timezone-safe.
 */

const {
  getLogicalDayFromUTC,
  getCurrentLogicalDay,
  subtractLogicalDays,
  addLogicalDays,
  getStartOfLogicalDayUTC,
} = require("./dates");

/**
 * Get logical day for a status (from DB date instant).
 * @param {{ date: Date }} status
 * @param {string} [tz]
 * @returns {string} YYYY-MM-DD
 */
function statusLogicalDay(status, tz) {
  return getLogicalDayFromUTC(status.date, tz);
}

/**
 * Deduplicate day statuses by logical day (keep higher minutes).
 * @param {Array<{ date: Date, minutes: number, status: string }>} dayStatuses
 * @param {string} [tz]
 * @returns {Map<string, { date: Date, minutes: number, status: string, logicalDay: string }>}
 */
function uniqueByLogicalDay(dayStatuses, tz) {
  const map = new Map();
  for (const s of dayStatuses || []) {
    const logicalDay = statusLogicalDay(s, tz);
    const completed =
      s.status === "COMPLETED" || s.status === "completed";
    if (
      !map.has(logicalDay) ||
      s.minutes > map.get(logicalDay).minutes ||
      (s.minutes === map.get(logicalDay).minutes && completed)
    ) {
      map.set(logicalDay, { ...s, logicalDay });
    }
  }
  return map;
}

/**
 * Daily streak with freeze days: up to freezeDays non-completed days can be skipped.
 * Today incomplete = provisional streak (today skipped, count from yesterday).
 * @param {Array<{ date: Date, minutes: number, status: string }>} dayStatuses
 * @param {{ freezeDays?: number }} options
 * @param {string} [tz]
 * @returns {number}
 */
function computeDailyStreakWithFreeze(dayStatuses, options = {}, tz) {
  const freezeDays = Math.max(0, options.freezeDays || 0);
  const byDay = uniqueByLogicalDay(dayStatuses, tz);
  const sortedLogicalDays = Array.from(byDay.keys()).sort(
    (a, b) => (a > b ? -1 : a < b ? 1 : 0)
  );
  if (sortedLogicalDays.length === 0) return 0;

  let streak = 0;
  let skipsRemaining = freezeDays;
  let skippedFirst = false;

  for (const logicalDay of sortedLogicalDays) {
    const s = byDay.get(logicalDay);
    const completed = s.status === "COMPLETED" || s.status === "completed";

    if (completed) {
      streak++;
      skipsRemaining = freezeDays; // reset skips when we complete a day
    } else {
      if (!skippedFirst) {
        skippedFirst = true;
        continue; // today not completed = provisional
      }
      if (skipsRemaining > 0) {
        skipsRemaining--;
        continue;
      }
      break;
    }
  }

  return streak;
}

/**
 * Week key (start of week) in app timezone for a logical day.
 * Week = Monday–Sunday. Returns Monday YYYY-MM-DD of that week.
 * @param {string} logicalDay YYYY-MM-DD
 * @param {string} [tz]
 * @returns {string} YYYY-MM-DD (Monday)
 */
function getWeekStartForDay(logicalDay, tz) {
  const { utcToZonedTime } = require("date-fns-tz");
  const resolved = tz || "UTC";
  const start = getStartOfLogicalDayUTC(logicalDay, resolved);
  const zoned = utcToZonedTime(start, resolved);
  const dow = zoned.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  zoned.setDate(zoned.getDate() + mondayOffset);
  const y = zoned.getFullYear();
  const m = String(zoned.getMonth() + 1).padStart(2, "0");
  const d = String(zoned.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Weekly streak: consecutive weeks where completed days in that week >= weeklyTargetDays.
 * @param {Array<{ date: Date, minutes: number, status: string }>} dayStatuses
 * @param {number} weeklyTargetDays
 * @param {number} minMinutesPerDay
 * @param {string} [tz]
 * @returns {number} Consecutive weeks meeting target
 */
function computeWeeklyStreak(
  dayStatuses,
  weeklyTargetDays,
  minMinutesPerDay,
  tz
) {
  const byDay = uniqueByLogicalDay(dayStatuses, tz);
  const weekToCompletedDays = new Map();

  for (const [logicalDay, s] of byDay) {
    const completed =
      (s.status === "COMPLETED" || s.status === "completed") &&
      s.minutes >= minMinutesPerDay;
    if (!completed) continue;
    const weekStart = getWeekStartForDay(logicalDay, tz);
    weekToCompletedDays.set(
      weekStart,
      (weekToCompletedDays.get(weekStart) || 0) + 1
    );
  }

  const todayLogical = getCurrentLogicalDay(tz);
  const currentWeekStart = getWeekStartForDay(todayLogical, tz);

  let streak = 0;
  let weekStart = currentWeekStart;
  const maxWeeks = 52;

  for (let i = 0; i < maxWeeks; i++) {
    const count = weekToCompletedDays.get(weekStart) || 0;
    if (count < weeklyTargetDays) break;
    streak++;
    weekStart = subtractLogicalDays(weekStart, 7, tz);
  }

  return streak;
}

/**
 * Compute streak for a goal: daily (with optional freeze) or weekly.
 * @param {Array<{ date: Date, minutes: number, status: string }>} dayStatuses
 * @param {{ goalType?: string, freezeDays?: number, weeklyTargetDays?: number, minMinutesPerDay?: number }} goal
 * @param {string} [tz]
 * @returns {number}
 */
function computeStreakForGoal(dayStatuses, goal, tz) {
  const type = goal.goalType || "daily";
  if (type === "weekly" && goal.weeklyTargetDays != null) {
    return computeWeeklyStreak(
      dayStatuses,
      goal.weeklyTargetDays,
      goal.minMinutesPerDay || 0,
      tz
    );
  }
  return computeDailyStreakWithFreeze(
    dayStatuses,
    { freezeDays: goal.freezeDays || 0 },
    tz
  );
}

module.exports = {
  statusLogicalDay,
  uniqueByLogicalDay,
  computeDailyStreakWithFreeze,
  getWeekStartForDay,
  computeWeeklyStreak,
  computeStreakForGoal,
};
