import { useEffect, useState } from "react";
import Link from "next/link";
import ProjectsList from "../components/ProjectsList";

export default function Home() {
  const [stats, setStats] = useState({
    todayHours: 0,
    weekHours: 0,
    activeProjects: 0,
    totalEntries: 0,
  });
  const [weekHistory, setWeekHistory] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch stats
      const statsResponse = await fetch("/api/review/today");
      const statsData = await statsResponse.json();

      setStats({
        todayHours: (statsData.totalMinutes || 0) / 60,
        weekHours: 24.75,
        activeProjects: statsData.goals?.length || 0,
        totalEntries: statsData.entries?.length || 0,
      });

      // Fetch goals
      const goalsResponse = await fetch("/api/goals");
      const goalsData = await goalsResponse.json();
      setGoals(goalsData);

      // Fetch 10 days history with test data
      await fetch10DaysHistory();
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetch10DaysHistory = async () => {
    try {
      const historyData = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get last 10 days from database
      for (let i = 0; i < 10; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        // Fetch entries for this specific date
        const response = await fetch(
          `/api/entries?startDate=${date.toISOString()}&endDate=${nextDay.toISOString()}`,
        );

        if (!response.ok) {
          continue;
        }

        const entries = await response.json();

        if (entries.length > 0) {
          // Group by project
          const projectsMap = {};

          entries.forEach((entry) => {
            if (!projectsMap[entry.projectId]) {
              projectsMap[entry.projectId] = {
                id: entry.projectId,
                name: entry.project?.name || "Unknown Project",
                color: entry.project?.color || "#6366f1",
                totalTime: 0,
                entries: [],
              };
            }

            // Calculate duration from start and end times
            let duration = 0;
            if (entry.start && entry.end) {
              const startTime = new Date(entry.start);
              const endTime = new Date(entry.end);
              duration = Math.floor((endTime.getTime() - startTime.getTime()) / 60000); // duration in minutes
            } else if (entry.duration) {
              duration = entry.duration;
            }
            
            projectsMap[entry.projectId].totalTime += duration * 60; // convert to seconds
            projectsMap[entry.projectId].entries.push({
              id: entry.id,
              startTime: entry.start,
              endTime: entry.end,
              description: entry.note || "",
            });
          });

          historyData.push({
            date: date,
            dateLabel: getDateLabel(date),
            projects: Object.values(projectsMap),
          });
        }
      }

      setWeekHistory(historyData);
    } catch (error) {
      console.error("Error fetching week history:", error);
    }
  };

  const getDateLabel = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const inputDate = new Date(date);
    inputDate.setHours(0, 0, 0, 0);

    if (inputDate.getTime() === today.getTime()) {
      return "Today";
    } else if (inputDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      return inputDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }
  };

  const calculateStreak = (dayStatuses) => {
    if (!dayStatuses || dayStatuses.length === 0) return 0;

    const sortedDays = [...dayStatuses].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );

    let streak = 0;
    let skippedFirst = false;

    for (const day of sortedDays) {
      if (day.status === "completed") {
        streak++;
      } else {
        // If the first day (today) is not completed, skip it and continue
        // This shows the "provisional" streak from previous days
        if (!skippedFirst) {
          skippedFirst = true;
          continue;
        }
        break;
      }
    }

    return streak;
  };

  return (
    <div className="space-y-8">
      {/* Goals & Streaks Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-text-primary mb-2">
              Goals & Streaks 🔥
            </h2>
            <p className="text-text-secondary">
              Keep the momentum going! Track your daily progress and build
              lasting habits.
            </p>
          </div>
          <Link href="/goals">
            <button className="btn-primary">
              <div className="flex items-center space-x-2">
                <span>Manage Goals</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          </Link>
        </div>

        {goals.length === 0 ? (
          <div className="card-premium">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-warning to-amber-400 flex items-center justify-center mb-6 shadow-glow-lg animate-bounce-slow">
                <span className="text-5xl">🎯</span>
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-3">
                Start Your Journey
              </h3>
              <p className="text-text-secondary text-center mb-6 max-w-md">
                Set daily goals to stay motivated and track your progress. Build
                streaks and watch your productivity soar!
              </p>
              <Link href="/goals">
                <button className="btn-primary px-8 py-4 text-lg">
                  Create Your First Goal
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal, index) => {
              const completedDays = (goal.dayStatuses || []).filter(
                (s) => s.status === "completed",
              ).length;
              const currentStreak = calculateStreak(goal.dayStatuses || []);
              const totalDays = (goal.dayStatuses || []).length;
              const completionRate =
                totalDays > 0
                  ? Math.round((completedDays / totalDays) * 100)
                  : 0;
              const projectColor = goal.project?.color || "#6366f1";

              // Check if today is completed
              const sortedDays = [...(goal.dayStatuses || [])].sort(
                (a, b) => new Date(b.date) - new Date(a.date),
              );
              const isTodayCompleted =
                sortedDays.length > 0 && sortedDays[0].status === "completed";

              return (
                <div
                  key={goal.id}
                  className="card-premium group animate-smooth-slide-up relative overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Background gradient effect */}
                  <div
                    className="absolute inset-0 opacity-5"
                    style={{
                      background: `radial-gradient(circle at top right, ${projectColor}, transparent 70%)`,
                    }}
                  />

                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-text-primary mb-2">
                          {goal.project?.name || "Project"}
                        </h3>
                        <div className="flex items-center space-x-2 text-text-secondary text-sm">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>{goal.minMinutesPerDay} min/day goal</span>
                        </div>
                      </div>
                      <div className="text-5xl animate-bounce-slow">
                        {currentStreak > 0 && isTodayCompleted ? "🔥" : "🪵"}
                      </div>
                    </div>

                    {/* Current Streak - Big and Bold */}
                    <div className="mb-6 text-center py-6 rounded-xl bg-dark-elevated border border-dark-border">
                      <div className="text-text-tertiary text-sm mb-2 uppercase tracking-wide">
                        Current Streak
                      </div>
                      <div className="flex items-center justify-center space-x-3">
                        <div
                          className="text-5xl font-bold font-mono"
                          style={{
                            color: currentStreak > 0 ? projectColor : "#6b7280",
                          }}
                        >
                          {currentStreak}
                        </div>
                        <div className="text-2xl text-text-secondary">days</div>
                      </div>
                      {currentStreak > 0 && !isTodayCompleted && (
                        <div className="mt-2 text-white text-xs font-medium flex items-center justify-center space-x-1">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>Provisional • Complete today to keep it!</span>
                        </div>
                      )}
                      {currentStreak > 0 && isTodayCompleted && (
                        <div className="mt-2 text-white text-sm font-medium">
                          Keep it going! 💪
                        </div>
                      )}
                    </div>

                    {/* 14-Day Visual Streak */}
                    <div className="space-y-3">
                      <div className="text-text-secondary text-xs uppercase tracking-wide">
                        Last 14 Days
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {(goal.dayStatuses || [])
                          .slice(0, 14)
                          .reverse()
                          .map((s, idx) => {
                            const isCompleted = s.status === "completed";
                            const date = new Date(s.date);
                            const dayLetter = date
                              .toLocaleDateString("en-US", { weekday: "short" })
                              .substring(0, 1);

                            return (
                              <div
                                key={s.id || idx}
                                className="flex flex-col items-center group/day relative"
                              >
                                <div
                                  className={`w-full aspect-square rounded-lg transition-all duration-300 flex items-center justify-center ${
                                    isCompleted
                                      ? "shadow-glow-sm transform hover:scale-110"
                                      : "bg-dark-elevated border border-dark-border hover:border-dark-border-light"
                                  }`}
                                  style={{
                                    backgroundColor: isCompleted
                                      ? projectColor
                                      : undefined,
                                  }}
                                >
                                  {isCompleted && (
                                    <span className="text-white text-sm animate-bounce-slow">
                                      🔥
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-text-tertiary mt-1">
                                  {dayLetter}
                                </span>

                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 hidden group-hover/day:block z-10">
                                  <div className="bg-dark-elevated border border-dark-border-light rounded-lg px-3 py-2 text-xs text-text-primary whitespace-nowrap shadow-premium">
                                    {date.toLocaleDateString()}
                                    <br />
                                    {isCompleted
                                      ? `✅ ${s.minutes} min`
                                      : "⚪ Not completed"}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Motivational message */}
                    {currentStreak >= 7 && (
                      <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-accent-secondary/20 to-emerald-400/20 border border-accent-secondary/30">
                        <div className="flex items-center space-x-2 text-accent-secondary text-sm">
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="font-medium">
                            Amazing! {currentStreak} day streak! 🎉
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 10-Day History */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-text-primary">
            Last 10 Days
          </h2>
          <Link href="/projects">
            <button className="text-accent-primary hover:text-accent-primary-hover transition-colors text-sm font-medium">
              View all →
            </button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-6 bg-dark-surface rounded w-48 animate-pulse" />
                <div className="bg-dark-surface rounded-xl border border-dark-border p-5 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-dark-elevated rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-dark-elevated rounded w-1/3" />
                      <div className="h-4 bg-dark-elevated rounded w-1/4" />
                    </div>
                    <div className="w-20 h-8 bg-dark-elevated rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : weekHistory.length === 0 ? (
          <div className="card-premium">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-dark-elevated flex items-center justify-center mb-6">
                <svg
                  className="w-10 h-10 text-text-tertiary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                No activity yet
              </h3>
              <p className="text-text-secondary text-center mb-6">
                Start tracking time to see your activity here
              </p>
              <Link href="/timer">
                <button className="btn-primary">Start Timer</button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {weekHistory.map((day, dayIndex) => (
              <div
                key={day.date.toISOString()}
                className="space-y-4 animate-smooth-slide-up"
                style={{ animationDelay: `${dayIndex * 100}ms` }}
              >
                {/* Date Header */}
                <div className="flex items-center space-x-3">
                  <h3 className="text-xl font-semibold text-text-primary">
                    {day.dateLabel}
                  </h3>
                  {day.dateLabel !== "Today" &&
                    day.dateLabel !== "Yesterday" && (
                      <span className="text-text-tertiary text-sm">
                        {day.date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  <div className="flex-1 h-px bg-dark-border" />
                </div>

                {/* Projects List */}
                <ProjectsList projects={day.projects} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
