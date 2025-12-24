const prisma = require("./prisma");
const { dayRangeFromDate } = require("./dates");

async function computeGoalDayMinutes(goalId, dayStart, dayEnd) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { project: true },
  });
  if (!goal) return 0;
  const projectId = goal.projectId;

  const entries = await prisma.timeEntry.findMany({
    where: {
      projectId: projectId,
      start: { lt: dayEnd },
      OR: [{ end: { gt: dayStart } }, { end: null }],
    },
  });

  let minutes = 0;
  const now = new Date();
  for (const e of entries) {
    const s = e.start instanceof Date ? e.start : new Date(e.start);
    const eEnd = e.end
      ? e.end instanceof Date
        ? e.end
        : new Date(e.end)
      : now;
    const overlapStart = s > dayStart ? s : dayStart;
    const overlapEnd = eEnd < dayEnd ? eEnd : dayEnd;
    if (overlapEnd > overlapStart) {
      minutes += Math.round((overlapEnd - overlapStart) / 60000);
    }
  }
  return minutes;
}

async function initializeGoalStatuses(goalId, daysBack = 90) {
  const now = new Date();
  for (let i = 0; i < daysBack; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const { start, end } = dayRangeFromDate(date);
    const minutes = await computeGoalDayMinutes(goalId, start, end);
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    const status = minutes >= goal.minMinutesPerDay ? "COMPLETED" : "PENDING";
    try {
      await prisma.goalDayStatus.upsert({
        where: { goalId_date: { goalId, date: start } },
        update: { status, minutes },
        create: { goalId, date: start, status, minutes },
      });
    } catch (e) {
      // ignore upsert race or other transient errors for initialization
    }
  }
}

async function getGoalStreak(goalId, daysBack = 90) {
  const now = new Date();
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) return [];
  const results = [];
  for (let i = 0; i < daysBack; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const { start, end } = dayRangeFromDate(date);
    const minutes = await computeGoalDayMinutes(goalId, start, end);

    let status = "pending";
    if (minutes >= goal.minMinutesPerDay) status = "completed";
    else if (minutes > 0) status = "in_progress";

    // upsert status record (store UTC midnight as date)
    try {
      await prisma.goalDayStatus.upsert({
        where: { goalId_date: { goalId, date: start } },
        update: { status, minutes },
        create: { goalId, date: start, status, minutes },
      });
    } catch (e) {
      // ignore transient errors
    }

    results.push({ date: start, minutes, status });
  }
  // return newest-first (optional)
  return results;
}

async function computeStreak(goalId) {
  const results = await getGoalStreak(goalId, 90);
  let streak = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "completed") {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

module.exports = {
  computeGoalDayMinutes,
  initializeGoalStatuses,
  getGoalStreak,
  computeStreak,
};
