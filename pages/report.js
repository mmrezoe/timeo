import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function Report() {
  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [totalTime, setTotalTime] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState(7);

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const days = selectedPeriod;

      // Fetch data for the last N days
      const historyData = [];
      const projectsMap = {};
      let totalMinutes = 0;

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const response = await fetch(
          `/api/entries?startDate=${date.toISOString()}&endDate=${nextDay.toISOString()}`,
        );
        const entries = await response.json();

        let dayTotal = 0;
        const dayProjects = {};

        entries.forEach((entry) => {
          const duration = entry.duration || 0;
          dayTotal += duration;
          totalMinutes += duration;

          if (!projectsMap[entry.projectId]) {
            projectsMap[entry.projectId] = {
              id: entry.projectId,
              name: entry.project?.name || `Project ${entry.projectId}`,
              color: entry.project?.color || "#6366f1",
              totalMinutes: 0,
              entries: 0,
            };
          }

          projectsMap[entry.projectId].totalMinutes += duration;
          projectsMap[entry.projectId].entries += 1;

          if (!dayProjects[entry.projectId]) {
            dayProjects[entry.projectId] = 0;
          }
          dayProjects[entry.projectId] += duration;
        });

        historyData.push({
          date: date.toISOString().split("T")[0],
          displayDate: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          totalHours: Number((dayTotal / 60).toFixed(2)),
          totalMinutes: dayTotal,
          projects: dayProjects,
        });
      }

      setWeekData(historyData);
      setProjects(
        Object.values(projectsMap).sort(
          (a, b) => b.totalMinutes - a.totalMinutes,
        ),
      );
      setTotalTime(totalMinutes);
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-surface border border-dark-border rounded-lg p-4 shadow-premium">
          <p className="text-text-primary font-semibold mb-2">
            {payload[0].payload.displayDate}
          </p>
          <p className="text-accent-primary font-mono">
            {payload[0].value} hours
          </p>
        </div>
      );
    }
    return null;
  };

  const periodOptions = [
    { value: 7, label: "7 Days" },
    { value: 30, label: "30 Days" },
    { value: 90, label: "90 Days" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-text-primary mb-2">
            Reports & Analytics
          </h1>
          <p className="text-text-secondary">
            Track your productivity and time allocation
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center space-x-2">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedPeriod(option.value)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                selectedPeriod === option.value
                  ? "bg-accent-primary text-white shadow-glow-sm"
                  : "bg-dark-surface text-text-secondary hover:bg-dark-surface-hover border border-dark-border"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {/* Loading Skeleton */}
          <div className="card-premium animate-pulse">
            <div className="h-8 bg-dark-elevated rounded w-1/4 mb-6"></div>
            <div className="h-80 bg-dark-elevated rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-premium animate-pulse">
                <div className="h-6 bg-dark-elevated rounded w-2/3 mb-4"></div>
                <div className="h-4 bg-dark-elevated rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-premium hover-glow">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-primary to-accent-primary-hover flex items-center justify-center shadow-glow-md">
                  <svg
                    className="w-7 h-7 text-white"
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
                <div>
                  <div className="text-3xl font-bold text-text-primary font-mono">
                    {formatTime(totalTime)}
                  </div>
                  <div className="text-text-secondary text-sm">Total Time</div>
                </div>
              </div>
            </div>

            <div className="card-premium hover-glow">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-secondary to-emerald-400 flex items-center justify-center shadow-glow-md">
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-3xl font-bold text-text-primary font-mono">
                    {(totalTime / weekData.length || 0).toFixed(0)}m
                  </div>
                  <div className="text-text-secondary text-sm">
                    Daily Average
                  </div>
                </div>
              </div>
            </div>

            <div className="card-premium hover-glow">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-warning to-amber-400 flex items-center justify-center shadow-glow-md">
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-3xl font-bold text-text-primary">
                    {projects.length}
                  </div>
                  <div className="text-text-secondary text-sm">
                    Active Projects
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Total Time Line Chart */}
          <div className="card-premium">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-1 h-8 bg-gradient-to-b from-accent-primary to-accent-primary-hover rounded-full"></div>
              <h2 className="text-2xl font-bold text-text-primary">
                Time Tracking Overview
              </h2>
            </div>

            {weekData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={weekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3c" />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#8b8b9a"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    stroke="#8b8b9a"
                    style={{ fontSize: "12px" }}
                    label={{
                      value: "Hours",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: "#8b8b9a" },
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="totalHours"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ fill: "#6366f1", strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-dark-elevated flex items-center justify-center mb-4">
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <p className="text-text-secondary">
                  No data available for this period
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Projects Breakdown */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-1 h-8 bg-gradient-to-b from-accent-secondary to-emerald-400 rounded-full"></div>
              <h2 className="text-2xl font-bold text-text-primary">
                Projects Breakdown
              </h2>
            </div>

            {projects.length > 0 ? (
              <div className="space-y-4">
                {projects.map((project, index) => {
                  const percentage =
                    totalTime > 0
                      ? ((project.totalMinutes / totalTime) * 100).toFixed(1)
                      : 0;

                  return (
                    <div
                      key={project.id}
                      className="card-premium group hover-glow animate-smooth-slide-up relative overflow-hidden"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Background gradient */}
                      <div
                        className="absolute inset-0 opacity-5"
                        style={{
                          background: `radial-gradient(circle at top right, ${project.color}, transparent 70%)`,
                        }}
                      />

                      <div className="relative z-10">
                        <div className="flex items-center justify-between">
                          {/* Left Side: Project Info */}
                          <div className="flex items-center space-x-5 flex-1">
                            {/* Color Bar */}
                            <div
                              className="w-1.5 h-20 rounded-full transform transition-all duration-300 group-hover:h-24"
                              style={{
                                background: `linear-gradient(to bottom, ${project.color}, ${project.color}dd)`,
                              }}
                            />

                            {/* Project Icon */}
                            <div
                              className="w-14 h-14 rounded-xl flex items-center justify-center shadow-glow-sm transform transition-transform duration-300 group-hover:scale-110 flex-shrink-0"
                              style={{
                                background: `linear-gradient(to bottom right, ${project.color}, ${project.color}dd)`,
                              }}
                            >
                              <svg
                                className="w-7 h-7 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                />
                              </svg>
                            </div>

                            {/* Project Details */}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xl font-bold text-text-primary mb-1 truncate">
                                {project.name}
                              </h3>
                              <div className="flex items-center space-x-4 text-sm text-text-secondary">
                                <span className="flex items-center space-x-1">
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
                                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                    />
                                  </svg>
                                  <span>
                                    {project.entries}{" "}
                                    {project.entries === 1
                                      ? "entry"
                                      : "entries"}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Center: Stats Grid */}
                          <div className="hidden md:grid grid-cols-3 gap-6 mx-8">
                            <div className="text-center">
                              <div className="text-text-tertiary text-xs mb-1">
                                Total Time
                              </div>
                              <div
                                className="text-2xl font-bold font-mono"
                                style={{ color: project.color }}
                              >
                                {formatTime(project.totalMinutes)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-text-tertiary text-xs mb-1">
                                Daily Avg
                              </div>
                              <div className="text-2xl font-bold font-mono text-text-primary">
                                {formatTime(
                                  Math.round(
                                    project.totalMinutes / weekData.length,
                                  ),
                                )}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-text-tertiary text-xs mb-1">
                                Share
                              </div>
                              <div
                                className="text-2xl font-bold font-mono"
                                style={{ color: project.color }}
                              >
                                {percentage}%
                              </div>
                            </div>
                          </div>

                          {/* Right: Progress Circle */}
                          <div className="flex-shrink-0">
                            <div className="relative w-24 h-24">
                              <svg className="w-24 h-24 transform -rotate-90">
                                <circle
                                  cx="48"
                                  cy="48"
                                  r="40"
                                  stroke="currentColor"
                                  strokeWidth="8"
                                  fill="none"
                                  className="text-dark-elevated"
                                />
                                <circle
                                  cx="48"
                                  cy="48"
                                  r="40"
                                  stroke={project.color}
                                  strokeWidth="8"
                                  fill="none"
                                  strokeDasharray={`${2 * Math.PI * 40}`}
                                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - percentage / 100)}`}
                                  className="transition-all duration-500"
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span
                                  className="text-xl font-bold"
                                  style={{ color: project.color }}
                                >
                                  {percentage}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Mobile Stats - Show on small screens */}
                        <div className="md:hidden mt-4 pt-4 border-t border-dark-border grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-text-tertiary text-xs mb-1">
                              Total
                            </div>
                            <div
                              className="text-lg font-bold font-mono"
                              style={{ color: project.color }}
                            >
                              {formatTime(project.totalMinutes)}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-text-tertiary text-xs mb-1">
                              Daily
                            </div>
                            <div className="text-lg font-bold font-mono text-text-primary">
                              {formatTime(
                                Math.round(
                                  project.totalMinutes / weekData.length,
                                ),
                              )}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-text-tertiary text-xs mb-1">
                              Share
                            </div>
                            <div
                              className="text-lg font-bold font-mono"
                              style={{ color: project.color }}
                            >
                              {percentage}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card-premium">
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 rounded-2xl bg-dark-elevated flex items-center justify-center mb-4">
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
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    No projects tracked
                  </h3>
                  <p className="text-text-secondary text-center">
                    Start tracking time on your projects to see analytics here
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
