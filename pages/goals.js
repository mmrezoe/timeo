import { useEffect, useState } from "react";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [todayData, setTodayData] = useState({ goals: [] });
  const [newGoal, setNewGoal] = useState({ projectId: "", minMinutes: "" });
  const [editing, setEditing] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [goalsRes, projectsRes, todayRes] = await Promise.all([
        fetch("/api/goals").then((r) => r.json()),
        fetch("/api/projects").then((r) => r.json()),
        fetch("/api/review/today").then((r) => r.json()),
      ]);
      setGoals(goalsRes);
      setProjects(projectsRes);
      setTodayData(todayRes);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  async function addGoal() {
    if (!newGoal.projectId || !newGoal.minMinutes) return;
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: parseInt(newGoal.projectId),
          minMinutesPerDay: parseInt(newGoal.minMinutes),
        }),
      });
      const goal = await res.json();
      setGoals([...goals, goal]);
      setNewGoal({ projectId: "", minMinutes: "" });
      setShowAddModal(false);
      fetchData();
    } catch (error) {
      console.error("Error adding goal:", error);
    }
  }

  async function deleteGoal(id) {
    if (confirm("Delete this goal?")) {
      try {
        const response = await fetch(`/api/goals/${id}`, { method: "DELETE" });
        if (response.ok) {
          setGoals(goals.filter((g) => g.id !== id));
          fetchData(); // Refresh data to update UI
        } else {
          alert("Failed to delete goal");
        }
      } catch (error) {
        console.error("Error deleting goal:", error);
        alert("Error deleting goal. Please try again.");
      }
    }
  }

  async function editGoal(id, projectId, minMinutes) {
    try {
      await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: parseInt(projectId),
          minMinutesPerDay: parseInt(minMinutes),
        }),
      });
      setGoals(
        goals.map((g) =>
          g.id === id
            ? {
                ...g,
                projectId: parseInt(projectId),
                minMinutesPerDay: parseInt(minMinutes),
              }
            : g,
        ),
      );
      setEditing(null);
      fetchData();
    } catch (error) {
      console.error("Error editing goal:", error);
    }
  }

  const getTodayGoal = (goalId) => {
    return (
      todayData.goals.find((g) => g.id === goalId) || {
        minutes: 0,
        emoji: "🪵",
        status: "PENDING",
      }
    );
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case "completed":
        return "🔥";
      case "PENDING":
        return "🪵";
      default:
        return "⚪";
    }
  };

  const formatMinutes = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-text-primary mb-3">Goals</h1>
          <p className="text-text-secondary text-lg">
            Track your daily goals and build streaks
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary group"
        >
          <div className="flex items-center space-x-2">
            <svg
              className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>New Goal</span>
          </div>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-premium hover-glow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary to-accent-primary-hover flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <div className="text-3xl font-bold text-text-primary">
                {goals.length}
              </div>
              <div className="text-text-secondary text-sm">Active Goals</div>
            </div>
          </div>
        </div>

        <div className="card-premium hover-glow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-warning to-amber-400 flex items-center justify-center">
              <span className="text-2xl">🔥</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-text-primary">
                {todayData.goals.filter((g) => g.status === "completed").length}
              </div>
              <div className="text-text-secondary text-sm">Completed Today</div>
            </div>
          </div>
        </div>

        <div className="card-premium hover-glow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-secondary to-emerald-400 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <div>
              <div className="text-3xl font-bold text-text-primary">
                {Math.round(
                  (todayData.goals.filter((g) => g.status === "completed")
                    .length /
                    goals.length) *
                    100 || 0,
                )}
                %
              </div>
              <div className="text-text-secondary text-sm">Success Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-smooth-fade">
          <div className="bg-dark-surface border border-dark-border-light rounded-2xl p-8 max-w-md w-full mx-4 shadow-premium-hover animate-smooth-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary">
                Add New Goal
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="icon-btn text-text-secondary hover:text-text-primary"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary text-sm font-medium mb-2">
                  Select Project
                </label>
                <select
                  value={newGoal.projectId}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, projectId: e.target.value })
                  }
                  className="input-premium"
                >
                  <option value="">Choose a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-2">
                  Daily Goal (minutes)
                </label>
                <input
                  type="number"
                  placeholder="e.g., 60"
                  value={newGoal.minMinutes}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, minMinutes: e.target.value })
                  }
                  className="input-premium"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={addGoal}
                  className="btn-primary flex-1"
                  disabled={!newGoal.projectId || !newGoal.minMinutes}
                >
                  Add Goal
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              No goals yet
            </h3>
            <p className="text-text-secondary text-center mb-6">
              Create your first goal to start building streaks
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              Create Your First Goal
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((g, index) => {
            const todayGoal = getTodayGoal(g.id);
            const progress = Math.min(
              (todayGoal.minutes / g.minMinutesPerDay) * 100,
              100,
            );
            const isCompleted = todayGoal.status === "completed";
            const projectColor = g.project?.color || "#6366f1";

            return (
              <div
                key={g.id}
                className="card-premium group animate-smooth-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {editing === g.id ? (
                  <div className="space-y-4">
                    <select
                      value={g.projectId}
                      onChange={(e) =>
                        setGoals(
                          goals.map((goal) =>
                            goal.id === g.id
                              ? { ...goal, projectId: parseInt(e.target.value) }
                              : goal,
                          ),
                        )
                      }
                      className="input-premium"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={g.minMinutesPerDay}
                      onChange={(e) =>
                        setGoals(
                          goals.map((goal) =>
                            goal.id === g.id
                              ? {
                                  ...goal,
                                  minMinutesPerDay: parseInt(e.target.value),
                                }
                              : goal,
                          ),
                        )
                      }
                      className="input-premium"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          editGoal(g.id, g.projectId, g.minMinutesPerDay)
                        }
                        className="btn-primary flex-1"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-text-primary mb-1">
                          {g.project.name}
                        </h3>
                        <p className="text-text-secondary text-sm">
                          Daily Goal: {formatMinutes(g.minMinutesPerDay)}
                        </p>
                      </div>
                      <div className="text-4xl animate-bounce-slow">
                        {getStatusEmoji(todayGoal.status)}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-text-secondary text-sm">
                          Today's Progress
                        </span>
                        <span className="text-text-primary font-semibold">
                          {formatMinutes(todayGoal.minutes)} /{" "}
                          {formatMinutes(g.minMinutesPerDay)}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-dark-elevated rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: projectColor,
                            opacity: isCompleted ? 1 : 0.7,
                          }}
                        />
                      </div>
                      <div className="text-center mt-2">
                        <span
                          className="text-sm font-medium"
                          style={{
                            color: isCompleted ? projectColor : undefined,
                          }}
                        >
                          {Math.round(progress)}% Complete
                        </span>
                      </div>
                    </div>

                    {/* Streak Display */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-text-secondary text-sm font-medium">
                          14-Day Streak
                        </span>
                        <span className="text-text-primary text-sm font-semibold">
                          {
                            (g.dayStatuses || []).filter(
                              (s) => s.status === "completed",
                            ).length
                          }{" "}
                          days
                        </span>
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {(g.dayStatuses || [])
                          .slice(0, 14)
                          .reverse()
                          .map((s, idx) => {
                            const date = new Date(s.date);
                            const dayName = date
                              .toLocaleDateString("en-US", { weekday: "short" })
                              .substring(0, 1);
                            const isCompleted = s.status === "completed";

                            return (
                              <div
                                key={s.id || idx}
                                className="flex flex-col items-center group relative"
                              >
                                <div
                                  className={`w-full aspect-square rounded-lg transition-all duration-300 ${
                                    isCompleted
                                      ? "shadow-glow-sm"
                                      : "bg-dark-elevated border border-dark-border"
                                  } hover:scale-110 cursor-pointer`}
                                  style={{
                                    backgroundColor: isCompleted ? projectColor : undefined,
                                  }}
                                  title={`${date.toDateString()}: ${s.status}`}
                                >
                                  {isCompleted && (
                                    <div className="w-full h-full flex items-center justify-center text-white text-lg animate-bounce-slow">
                                      🔥
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs text-text-tertiary mt-1">
                                  {dayName}
                                </span>

                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                                  <div className="bg-dark-elevated border border-dark-border-light rounded-lg px-3 py-2 text-xs text-text-primary whitespace-nowrap shadow-premium">
                                    {date.toLocaleDateString()}
                                    <br />
                                    {isCompleted
                                      ? "✅ Completed"
                                      : "⚪ Pending"}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-dark-border">
                      <button
                        onClick={() => setEditing(g.id)}
                        className="icon-btn text-text-secondary hover:text-accent-primary"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteGoal(g.id)}
                        className="icon-btn text-text-secondary hover:text-accent-danger"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
