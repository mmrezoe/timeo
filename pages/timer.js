import { useEffect, useState } from "react";
import ProjectsList from "../components/ProjectsList";

export default function Timer() {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [description, setDescription] = useState("");
  const [projects, setProjects] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [todayProjects, setTodayProjects] = useState([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [projectColor, setProjectColor] = useState("#6366f1");

  useEffect(() => {
    fetchProjects();
    fetchTodayProjects();
  }, []);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchTodayProjects = async () => {
    try {
      const response = await fetch("/api/review/today");
      const data = await response.json();

      // Group entries by project
      const projectsMap = {};

      if (data.entries) {
        data.entries.forEach((entry) => {
          if (!projectsMap[entry.projectId]) {
            projectsMap[entry.projectId] = {
              id: entry.projectId,
              name: entry.projectName,
              color: entry.projectColor,
              totalTime: 0,
              entries: [],
            };
          }

          projectsMap[entry.projectId].totalTime += entry.minutes * 60;
          projectsMap[entry.projectId].entries.push({
            id: entry.id,
            startTime: entry.start,
            endTime: entry.end,
            description: entry.note || "",
          });
        });
      }

      setTodayProjects(Object.values(projectsMap));
    } catch (error) {
      console.error("Error fetching today projects:", error);
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = () => {
    if (!selectedProject) {
      alert("Please select a project first");
      return;
    }
    setIsRunning(true);
    setStartTime(new Date());
  };

  const handleStop = async () => {
    if (time === 0) {
      alert("Timer must be greater than 0");
      return;
    }

    if (!selectedProject) {
      alert("Please select a project");
      return;
    }

    try {
      setIsRunning(false);

      // Calculate actual start and end times
      const endTime = new Date();
      const calculatedStartTime = new Date(endTime.getTime() - time * 1000);

      // Create the time entry
      const createResponse = await fetch("/api/timer/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject,
          note: description || "",
        }),
      });

      if (!createResponse.ok) {
        throw new Error("Failed to create time entry");
      }

      const entry = await createResponse.json();

      // Stop the timer immediately
      const stopResponse = await fetch("/api/timer/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: entry.id,
        }),
      });

      if (!stopResponse.ok) {
        throw new Error("Failed to stop time entry");
      }

      // Reset everything
      setTime(0);
      setDescription("");
      setStartTime(null);

      // Refresh today's projects
      fetchTodayProjects();
    } catch (error) {
      console.error("Error saving entry:", error);
      alert("Error saving time entry. Please try again.");
      setIsRunning(false);
    }
  };

  const handleAddProject = async () => {
    if (!projectName.trim()) {
      alert("Please enter a project name");
      return;
    }

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, color: projectColor }),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      const newProject = await response.json();
      setProjects([...projects, newProject]);
      setProjectName("");
      setProjectColor("#6366f1");
      setShowProjectModal(false);
      setSelectedProject(newProject.id.toString());
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Error creating project. Please try again.");
    }
  };

  const handleEditProject = async () => {
    if (!projectName.trim()) {
      alert("Please enter a project name");
      return;
    }

    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, color: projectColor }),
      });

      if (!response.ok) {
        throw new Error("Failed to update project");
      }

      setProjects(
        projects.map((p) =>
          p.id === editingProject.id
            ? { ...p, name: projectName, color: projectColor }
            : p,
        ),
      );
      setProjectName("");
      setProjectColor("#6366f1");
      setEditingProject(null);
      setShowProjectModal(false);
    } catch (error) {
      console.error("Error updating project:", error);
      alert("Error updating project. Please try again.");
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm("Delete this project? This cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete project");
      }

      setProjects(projects.filter((p) => p.id !== projectId));
      if (selectedProject === projectId.toString()) {
        setSelectedProject("");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Error deleting project. Please try again.");
    }
  };

  const openAddProjectModal = () => {
    setEditingProject(null);
    setProjectName("");
    setProjectColor("#6366f1");
    setShowProjectModal(true);
  };

  const openEditProjectModal = (project) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectColor(project.color || "#6366f1");
    setShowProjectModal(true);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-text-primary mb-3">Timer</h1>
        <p className="text-text-secondary text-lg">
          Track your time with precision
        </p>
      </div>

      {/* Main Timer Card */}
      <div className="max-w-3xl mx-auto">
        <div className="card-premium hover-glow">
          {/* Timer Display */}
          <div className="text-center mb-8">
            <div
              className={`
                text-7xl font-bold font-mono mb-4 transition-all duration-300
                ${isRunning ? "text-gradient-primary animate-pulse" : "text-text-primary"}
              `}
            >
              {formatTime(time)}
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div
                className={`
                  w-3 h-3 rounded-full transition-all duration-300
                  ${isRunning ? "bg-accent-secondary animate-pulse shadow-glow-md" : "bg-text-tertiary"}
                `}
              />
              <span className="text-text-secondary text-sm font-medium">
                {isRunning ? "Running" : "Stopped"}
              </span>
            </div>
          </div>

          {/* Project Selection */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-text-secondary text-sm font-medium">
                Select Project
              </label>
              <button
                onClick={openAddProjectModal}
                disabled={isRunning}
                className="text-accent-primary hover:text-accent-primary-hover transition-colors text-sm font-medium flex items-center space-x-1"
              >
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>New Project</span>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="input-premium flex-1"
                disabled={isRunning}
              >
                <option value="">Choose a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {selectedProject && !isRunning && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() =>
                      openEditProjectModal(
                        projects.find(
                          (p) => p.id === parseInt(selectedProject),
                        ),
                      )
                    }
                    className="icon-btn text-text-secondary hover:text-accent-primary"
                    title="Edit project"
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
                    onClick={() =>
                      handleDeleteProject(parseInt(selectedProject))
                    }
                    className="icon-btn text-text-secondary hover:text-accent-danger"
                    title="Delete project"
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
              )}
            </div>
          </div>

          {/* Description Input */}
          <div className="space-y-4 mb-8">
            <label className="block text-text-secondary text-sm font-medium mb-2">
              What are you working on?
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description..."
              className="input-premium"
              disabled={isRunning}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center space-x-4">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="btn-base px-12 py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-accent-primary to-accent-primary-hover text-white hover:shadow-glow-lg transform transition-all duration-300"
              >
                <div className="flex items-center space-x-3">
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Start</span>
                </div>
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="btn-base px-12 py-4 text-lg font-semibold rounded-xl bg-accent-danger hover:bg-accent-danger-hover text-white hover:shadow-glow-md transform transition-all duration-300"
              >
                <div className="flex items-center space-x-3">
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 6h12v12H6z" />
                  </svg>
                  <span>Stop</span>
                </div>
              </button>
            )}
          </div>

          {/* Info Text */}
          {isRunning && (
            <div className="mt-6 text-center">
              <p className="text-text-secondary text-sm">
                Click "Stop" to complete and save this time entry
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-smooth-fade">
          <div className="bg-dark-surface border border-dark-border-light rounded-2xl p-8 max-w-md w-full mx-4 shadow-premium-hover animate-smooth-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary">
                {editingProject ? "Edit Project" : "New Project"}
              </h2>
              <button
                onClick={() => {
                  setShowProjectModal(false);
                  setEditingProject(null);
                  setProjectName("");
                  setProjectColor("#6366f1");
                }}
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
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Website Redesign"
                  className="input-premium"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      editingProject ? handleEditProject() : handleAddProject();
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-2">
                  Project Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={projectColor}
                    onChange={(e) => setProjectColor(e.target.value)}
                    className="w-16 h-16 rounded-lg cursor-pointer border-2 border-dark-border hover:border-dark-border-light transition-colors"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={projectColor}
                      onChange={(e) => setProjectColor(e.target.value)}
                      placeholder="#6366f1"
                      className="input-premium font-mono"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    "#6366f1",
                    "#10b981",
                    "#f59e0b",
                    "#ef4444",
                    "#8b5cf6",
                    "#ec4899",
                    "#06b6d4",
                    "#84cc16",
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={() => setProjectColor(color)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        projectColor === color
                          ? "border-white scale-110"
                          : "border-dark-border hover:border-dark-border-light"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={
                    editingProject ? handleEditProject : handleAddProject
                  }
                  className="btn-primary flex-1"
                  disabled={!projectName.trim()}
                >
                  {editingProject ? "Save Changes" : "Create Project"}
                </button>
                <button
                  onClick={() => {
                    setShowProjectModal(false);
                    setEditingProject(null);
                    setProjectName("");
                    setProjectColor("#6366f1");
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Projects */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-text-primary">Today</h2>
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {todayProjects.length === 0 ? (
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
                No time tracked today
              </h3>
              <p className="text-text-secondary text-center">
                Start the timer to track your first entry of the day
              </p>
            </div>
          </div>
        ) : (
          <ProjectsList
            projects={todayProjects}
            onUpdate={fetchTodayProjects}
          />
        )}
      </div>
    </div>
  );
}
