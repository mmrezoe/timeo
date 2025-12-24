import { useEffect, useState } from "react";
import ProjectsList from "../components/ProjectsList";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectColor, setProjectColor] = useState("#6366f1");
  const [editingProject, setEditingProject] = useState(null);

  const colors = [
    "#6366f1", // Indigo
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#f43f5e", // Rose
    "#ef4444", // Red
    "#f97316", // Orange
    "#f59e0b", // Amber
    "#eab308", // Yellow
    "#84cc16", // Lime
    "#22c55e", // Green
    "#10b981", // Emerald
    "#14b8a6", // Teal
    "#06b6d4", // Cyan
    "#0ea5e9", // Sky
    "#3b82f6", // Blue
  ];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/projects");
      const projectsData = await response.json();

      // Store all projects
      setAllProjects(projectsData);

      // Fetch today's entries
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const entriesResponse = await fetch(
        `/api/entries?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`,
      );
      const entries = await entriesResponse.json();

      // Group entries by project
      const projectsMap = {};

      projectsData.forEach((project) => {
        projectsMap[project.id] = {
          ...project,
          totalTime: 0,
          entries: [],
        };
      });

      entries.forEach((entry) => {
        if (projectsMap[entry.projectId]) {
          const duration = entry.duration || 0;
          projectsMap[entry.projectId].totalTime += duration * 60; // convert to seconds
          projectsMap[entry.projectId].entries.push({
            id: entry.id,
            startTime: entry.start,
            endTime: entry.end,
            description: entry.note || "",
          });
        }
      });

      // Include all projects (show projects with no entries today as well)
      const enrichedData = Object.values(projectsMap);

      setProjects(enrichedData);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async () => {
    if (!projectName.trim()) return;

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, color: projectColor }),
      });

      if (response.ok) {
        setShowProjectModal(false);
        setProjectName("");
        setProjectColor("#6366f1");
        fetchProjects();
      } else {
        alert("Failed to create project");
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Error creating project");
    }
  };

  const handleEditProject = async () => {
    if (!projectName.trim() || !editingProject) return;

    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, color: projectColor }),
      });

      if (response.ok) {
        setShowProjectModal(false);
        setEditingProject(null);
        setProjectName("");
        setProjectColor("#6366f1");
        fetchProjects();
      } else {
        alert("Failed to update project");
      }
    } catch (error) {
      console.error("Error updating project:", error);
      alert("Error updating project");
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchProjects();
      } else {
        alert("Failed to delete project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Error deleting project");
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
      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-premium max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-text-primary">
                  {editingProject ? "Edit Project" : "Create New Project"}
                </h3>
                <button
                  onClick={() => {
                    setShowProjectModal(false);
                    setEditingProject(null);
                    setProjectName("");
                    setProjectColor("#6366f1");
                  }}
                  className="text-text-secondary hover:text-text-primary transition-colors"
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
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary transition-colors"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-3">
                    Project Color
                  </label>
                  <div className="grid grid-cols-5 gap-3">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setProjectColor(color)}
                        className={`w-full aspect-square rounded-lg transition-all duration-200 ${
                          projectColor === color
                            ? "ring-2 ring-offset-2 ring-offset-dark-surface ring-white scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
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

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-text-primary mb-2">
            Projects
          </h1>
          <p className="text-text-secondary">
            Manage your projects and track time efficiently
          </p>
        </div>

        {/* Add Project Button */}
        <button
          onClick={openAddProjectModal}
          className="btn-primary group flex-shrink-0"
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
            <span>New Project</span>
          </div>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </div>
            <div>
              <div className="text-3xl font-bold text-text-primary">
                {allProjects.length}
              </div>
              <div className="text-text-secondary text-sm">Total Projects</div>
            </div>
          </div>
        </div>

        <div className="card-premium hover-glow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-warning to-amber-400 flex items-center justify-center">
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
                {projects.reduce((acc, p) => acc + (p.entries?.length || 0), 0)}
              </div>
              <div className="text-text-secondary text-sm">Today's Entries</div>
            </div>
          </div>
        </div>
      </div>

      {/* All Projects List */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-1 h-8 bg-gradient-to-b from-accent-primary to-accent-primary-hover rounded-full"></div>
          <h2 className="text-2xl font-bold text-text-primary">All Projects</h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-dark-surface rounded-xl border border-dark-border p-6 animate-pulse"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-1 h-16 bg-dark-elevated rounded-full" />
                  <div className="w-14 h-14 bg-dark-elevated rounded-xl" />
                  <div className="flex-1 space-y-3">
                    <div className="h-6 bg-dark-elevated rounded w-1/3" />
                    <div className="h-4 bg-dark-elevated rounded w-1/4" />
                  </div>
                  <div className="w-24 h-10 bg-dark-elevated rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : allProjects.length === 0 ? (
          <div className="card-premium">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-dark-elevated to-dark-surface flex items-center justify-center mb-6 shadow-premium">
                <svg
                  className="w-12 h-12 text-text-tertiary"
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
              <h3 className="text-2xl font-bold text-text-primary mb-2">
                No projects yet
              </h3>
              <p className="text-text-secondary text-center mb-8 max-w-sm">
                Create your first project to start tracking your time and boost
                your productivity
              </p>
              <button
                onClick={openAddProjectModal}
                className="btn-primary px-6 py-3"
              >
                <div className="flex items-center space-x-2">
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>Create Your First Project</span>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <ProjectsList
            projects={projects}
            onUpdate={fetchProjects}
            showProjectActions={true}
            onDeleteProject={handleDeleteProject}
            onEditProject={openEditProjectModal}
          />
        )}
      </div>
    </div>
  );
}
