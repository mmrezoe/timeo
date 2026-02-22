/**
 * Goal and GoalDayStatus logic. All day boundaries use LOGICAL DAY (YYYY-MM-DD)
 * via lib/dates.js. No server-local getDate()/setDate() for "today" or "n days ago".
 */

const prisma = require("./prisma");
const {
  getCurrentLogicalDay,
  getStartOfLogicalDayUTC,
  getEndOfLogicalDayUTC,
  subtractLogicalDays,
  getLogicalDayFromUTC,
  getNowUTC,
  toUTC,
} = require("./dates");
const { computeStreakForGoal } = require("./streaks");

/**
 * @param {number} goalId
 * @param {Date} dayStart - Start of logical day (UTC)
 * @param {Date} dayEnd - End of logical day (UTC), exclusive
 * @param {{ gracePeriodMinutes?: number }} [options] - Grace: extend dayEnd by this many minutes (activity in early next day counts for this day)
 */
async function computeGoalDayMinutes(goalId, dayStart, dayEnd, options = {}) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { project: true },
  });
  if (!goal) return 0;
  const projectId = goal.projectId;

  const graceMinutes = options.gracePeriodMinutes ?? 0;
  const effectiveEnd =
    graceMinutes > 0
      ? new Date(dayEnd.getTime() + graceMinutes * 60000)
      : dayEnd;

  const entries = await prisma.timeEntry.findMany({
    where: {
      projectId: projectId,
      start: { lt: effectiveEnd },
      OR: [{ end: { gt: dayStart } }, { end: null }],
    },
  });

  let minutes = 0;
  const now = getNowUTC();
  for (const e of entries) {
    const s = toUTC(e.start);
    const eEnd = e.end ? toUTC(e.end) : now;
    const overlapStart = s > dayStart ? s : dayStart;
    const overlapEnd = eEnd < effectiveEnd ? eEnd : effectiveEnd;
    if (overlapEnd > overlapStart) {
      minutes += Math.round((overlapEnd - overlapStart) / 60000);
    }
  }
  return minutes;
}

/**
 * Initialize GoalDayStatus for the last daysBack logical days (using app timezone).
 */
async function initializeGoalStatuses(goalId, daysBack = 90) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) return;

  const tz = undefined; // use getAppTimeZone() on server
  const todayLogical = getCurrentLogicalDay(tz);

  for (let i = 0; i < daysBack; i++) {
    const logicalDay = subtractLogicalDays(todayLogical, i, tz);
    const start = getStartOfLogicalDayUTC(logicalDay, tz);
    const end = getEndOfLogicalDayUTC(logicalDay, tz);
    const minutes = await computeGoalDayMinutes(goalId, start, end);

    let status = "PENDING";
    if (minutes >= goal.minMinutesPerDay) {
      status = "COMPLETED";
    } else if (minutes > 0) {
      status = "IN_PROGRESS";
    }

    const dateInstant = start; // UTC midnight of that logical day

    try {
      await prisma.goalDayStatus.upsert({
        where: { goalId_date: { goalId, date: dateInstant } },
        update: { status, minutes },
        create: { goalId, date: dateInstant, status, minutes },
      });
    } catch (e) {
      console.error("Error upserting goal day status:", e);
    }
  }
}

/**
 * Get day statuses for the last daysBack logical days. Uses logical day iteration (no server local date).
 */
async function getGoalStreak(goalId, daysBack = 90) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) return [];

  const tz = undefined;
  const todayLogical = getCurrentLogicalDay(tz);
  const results = [];

  for (let i = 0; i < daysBack; i++) {
    const logicalDay = subtractLogicalDays(todayLogical, i, tz);
    const start = getStartOfLogicalDayUTC(logicalDay, tz);
    const end = getEndOfLogicalDayUTC(logicalDay, tz);
    const minutes = await computeGoalDayMinutes(goalId, start, end);

    let status = "PENDING";
    if (minutes >= goal.minMinutesPerDay) {
      status = "COMPLETED";
    } else if (minutes > 0) {
      status = "IN_PROGRESS";
    }

    try {
      await prisma.goalDayStatus.upsert({
        where: { goalId_date: { goalId, date: start } },
        update: { status, minutes },
        create: { goalId, date: start, status, minutes },
      });
    } catch (e) {
      console.error("Error upserting goal day status in getGoalStreak:", e);
    }

    results.push({
      date: start,
      logicalDay,
      minutes,
      status: status.toLowerCase(),
    });
  }

  return results;
}

/**
 * Compute current streak using logical days only.
 * Uses advanced streak (freeze, weekly) when goal has those options.
 */
async function computeStreak(goalId) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) return 0;

  const dayStatuses = await prisma.goalDayStatus.findMany({
    where: { goalId },
    orderBy: { date: "desc" },
    take: 90,
  });

  if (dayStatuses.length === 0) return 0;

  const tz = undefined;
  const goalOpts = {
    goalType: "daily",
    freezeDays: 0,
    weeklyTargetDays: null,
    minMinutesPerDay: goal.minMinutesPerDay,
  };

  return computeStreakForGoal(dayStatuses, goalOpts, tz);
}

/**
 * Update today's GoalDayStatus for all goals. "Today" = current logical day in app timezone.
 */
async function updateTodayStatuses() {
  await updateRecentDayStatuses(1);
}

/**
 * Update GoalDayStatus for the last N days for all goals (ensures historical completion is shown).
 */
async function updateRecentDayStatuses(daysBack = 14) {
  const goals = await prisma.goal.findMany({ select: { id: true } });
  const tz = undefined;
  const todayLogical = getCurrentLogicalDay(tz);

  for (const goal of goals) {
    const goalData = await prisma.goal.findUnique({ where: { id: goal.id } });
    if (!goalData) continue;

    for (let i = 0; i < daysBack; i++) {
      const logicalDay = subtractLogicalDays(todayLogical, i, tz);
      const start = getStartOfLogicalDayUTC(logicalDay, tz);
      const end = getEndOfLogicalDayUTC(logicalDay, tz);
      const minutes = await computeGoalDayMinutes(goal.id, start, end);

      let status = "PENDING";
      if (minutes >= goalData.minMinutesPerDay) status = "COMPLETED";
      else if (minutes > 0) status = "IN_PROGRESS";

      try {
        await prisma.goalDayStatus.upsert({
          where: { goalId_date: { goalId: goal.id, date: start } },
          update: { status, minutes },
          create: { goalId: goal.id, date: start, status, minutes },
        });
      } catch (e) {
        console.error(`Error updating day status for goal ${goal.id}:`, e);
      }
    }
  }
}

module.exports = {
  computeGoalDayMinutes,
  initializeGoalStatuses,
  getGoalStreak,
  computeStreak,
  updateTodayStatuses,
  updateRecentDayStatuses,
};
