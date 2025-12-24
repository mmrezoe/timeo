const prisma = require("../../../lib/prisma");
const { dayRangeFromDate } = require("../../../lib/dates");
const { computeGoalDayMinutes, computeStreak } = require("../../../lib/goals");

function minutesOverlap(entryStart, entryEnd, dayStart, dayEnd) {
  const s = entryStart instanceof Date ? entryStart : new Date(entryStart);
  const e = entryEnd
    ? entryEnd instanceof Date
      ? entryEnd
      : new Date(entryEnd)
    : new Date();
  const overlapStart = s > dayStart ? s : dayStart;
  const overlapEnd = e < dayEnd ? e : dayEnd;
  if (overlapEnd > overlapStart)
    return Math.round((overlapEnd - overlapStart) / 60000);
  return 0;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end();
  }

  const { start, end } = dayRangeFromDate(new Date());

  // fetch entries that overlap today
  const entries = await prisma.timeEntry.findMany({
    where: {
      start: { lt: end },
      OR: [{ end: { gt: start } }, { end: null }],
    },
    include: { project: true },
    orderBy: { start: "asc" },
  });

  // compute per-entry minutes within today and per-project totals
  const projectTotalsMap = new Map();
  const entriesOut = entries.map((e) => {
    const mins = minutesOverlap(e.start, e.end, start, end);
    const pid = e.projectId;
    const pname = e.project?.name || "Unknown";
    const pcolor = e.project?.color || "#6366f1";
    projectTotalsMap.set(pid, (projectTotalsMap.get(pid) || 0) + mins);
    return {
      id: e.id,
      projectId: pid,
      projectName: pname,
      projectColor: pcolor,
      start: e.start,
      end: e.end,
      minutes: mins,
      note: e.note || null,
    };
  });

  const projectTotals = Array.from(projectTotalsMap.entries()).map(
    ([projectId, minutes]) => ({ projectId, minutes }),
  );

  // goals statuses for today
  const goals = await prisma.goal.findMany({ include: { project: true } });
  const goalsOut = [];
  for (const g of goals) {
    const minutes = await computeGoalDayMinutes(g.id, start, end);
    const streak = await computeStreak(g.id);
    let status = "PENDING";
    let emoji = "🪵";
    if (minutes >= g.minMinutesPerDay) {
      status = "COMPLETED";
      emoji = "🔥";
    } else if (minutes > 0) {
      status = "IN_PROGRESS";
      emoji = "🪵";
    }
    goalsOut.push({
      id: g.id,
      name: g.project.name,
      minMinutesPerDay: g.minMinutesPerDay,
      minutes,
      status,
      emoji,
      streak,
    });
  }

  return res.json({
    date: start,
    entries: entriesOut,
    projectTotals,
    goals: goalsOut,
  });
}
