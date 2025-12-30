import { useEffect, useState } from "react";
import ProjectsList from "../components/ProjectsList";

export default function Timer() {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [description, setDescription] = useState("");
  const [projects, setProjects] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [runningEntryId, setRunningEntryId] = useState(null);
  const [todayProjects, setTodayProjects] = useState([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [projectColor, setProjectColor] = useState("#6366f1");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchProjects();
    fetchTodayProjects();
    checkRunningTimer();
  }, []);

  const checkRunningTimer = async () => {
    try {
      const response = await fetch("/api/timer/running");
      const running = await response.json();
      
      if (running) {
        setRunningEntryId(running.id);
        setSelectedProject(running.projectId.toString());
        setDescription(running.note || "");
        setStartTime(new Date(running.start));
        setIsRunning(true);
        setCurrentTime(new Date());
      }
    } catch (error) {
      console.error("Error checking running timer:", error);
    }
  };

  const updateRunningEntryNote = async (note) => {
    if (!runningEntryId) return;
    
    // Debounce: wait 1 second after user stops typing
    if (updateRunningEntryNote.timeout) {
      clearTimeout(updateRunningEntryNote.timeout);
    }
    
    updateRunningEntryNote.timeout = setTimeout(async () => {
      try {
        await fetch(`/api/entries/${runningEntryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note }),
        });
      } catch (error) {
        console.error("Error updating entry note:", error);
      }
    }, 1000);
  };

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setCurrentTime(new Date());
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

  const getElapsedTime = () => {
    if (!startTime) return 0;
    const now = new Date();
    return Math.floor((now.getTime() - startTime.getTime()) / 1000);
  };

  const handleStart = async () => {
    if (!selectedProject) {
      alert("Please select a project first");
      return;
    }

    try {
      const now = new Date();
      
      // Create a time entry with end=null (running entry)
      const response = await fetch("/api/timer/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject,
          note: description || "",
          start: now.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start timer");
      }

      const entry = await response.json();
      setRunningEntryId(entry.id);
      setIsRunning(true);
      setStartTime(now);
      setCurrentTime(now);
    } catch (error) {
      console.error("Error starting timer:", error);
      alert("Error starting timer. Please try again.");
    }
  };

  const handleStop = async () => {
    if (!runningEntryId) {
      alert("No running timer found");
      return;
    }

    const elapsedSeconds = getElapsedTime();
    if (elapsedSeconds <= 0) {
      alert("Timer must be greater than 0");
      return;
    }

    try {
      setIsRunning(false);

      // Stop the running entry
      const stopResponse = await fetch("/api/timer/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: runningEntryId,
        }),
      });

      if (!stopResponse.ok) {
        throw new Error("Failed to stop time entry");
      }

      // Reset everything
      setDescription("");
      setStartTime(null);
      setRunningEntryId(null);
      setCurrentTime(new Date());

      // Refresh today's projects
      fetchTodayProjects();
    } catch (error) {
      console.error("Error stopping timer:", error);
      alert("Error stopping timer. Please try again.");
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
              {formatTime(getElapsedTime())}
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
            <div className="flex items-center justify-between mb-4">
              <label className="block text-text-secondary text-sm font-medium">
                Select Project
              </label>
              <button
                onClick={openAddProjectModal}
                disabled={isRunning}
                className="text-accent-primary hover:text-accent-primary-hover transition-colors text-sm font-medium flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
            
            {/* Project Grid */}
            {projects.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-dark-border rounded-xl">
                <p className="text-text-secondary mb-4">No projects yet</p>
                <button
                  onClick={openAddProjectModal}
                  className="btn-primary"
                >
                  Create Your First Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {projects.map((project) => {
                  const isSelected = selectedProject === project.id.toString();
                  const projectColor = project.color || "#6366f1";
                  
                  return (
                    <div
                      key={project.id}
                      onClick={() => {
                        if (!isRunning) {
                          setSelectedProject(project.id.toString());
                        }
                      }}
                      className={`
                        relative group cursor-pointer rounded-xl p-4 transition-all duration-300
                        ${isSelected
                          ? "ring-2 ring-offset-2 ring-offset-dark-surface shadow-glow-md scale-105"
                          : "hover:scale-105 hover:shadow-glow-sm"
                        }
                        ${isRunning ? "opacity-50 cursor-not-allowed" : ""}
                      `}
                      style={{
                        backgroundColor: isSelected
                          ? `${projectColor}20`
                          : "transparent",
                        border: isSelected
                          ? `2px solid ${projectColor}`
                          : "1px solid transparent",
                      }}
                    >
                      {/* Background gradient effect */}
                      <div
                        className="absolute inset-0 rounded-xl opacity-10 group-hover:opacity-20 transition-opacity"
                        style={{
                          background: `linear-gradient(135deg, ${projectColor}, ${projectColor}dd)`,
                        }}
                      />
                      
                      {/* Content */}
                      <div className="relative z-10">
                        {/* Color indicator */}
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-glow-sm transition-transform group-hover:scale-110"
                          style={{
                            background: `linear-gradient(135deg, ${projectColor}, ${projectColor}dd)`,
                          }}
                        >
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
                              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                            />
                          </svg>
                        </div>
                        
                        {/* Project name */}
                        <h3
                          className="text-sm font-semibold text-text-primary truncate mb-1"
                          style={{
                            color: isSelected ? projectColor : undefined,
                          }}
                        >
                          {project.name}
                        </h3>
                        
                        {/* Selected indicator */}
                        {isSelected && (
                          <div className="flex items-center space-x-1 text-xs" style={{ color: projectColor }}>
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
                            <span>Selected</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Action buttons (on hover) */}
                      {!isRunning && (
                        <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditProjectModal(project);
                            }}
                            className="p-1.5 rounded-lg bg-dark-surface hover:bg-dark-elevated border border-dark-border transition-colors"
                            title="Edit project"
                          >
                            <svg
                              className="w-3.5 h-3.5 text-text-secondary hover:text-accent-primary"
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                            className="p-1.5 rounded-lg bg-dark-surface hover:bg-dark-elevated border border-dark-border transition-colors"
                            title="Delete project"
                          >
                            <svg
                              className="w-3.5 h-3.5 text-text-secondary hover:text-accent-danger"
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
                  );
                })}
              </div>
            )}
          </div>

          {/* Description Input */}
          <div className="space-y-4 mb-8">
            <label className="block text-text-secondary text-sm font-medium mb-2">
              What are you working on?
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (isRunning && runningEntryId) {
                  updateRunningEntryNote(e.target.value);
                }
              }}
              placeholder="Enter task description..."
              className="input-premium"
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
