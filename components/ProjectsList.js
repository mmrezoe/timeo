import { useState } from "react";

const ProjectsList = ({
  projects = [],
  onUpdate,
  showProjectActions = false,
  onDeleteProject,
  onEditProject,
}) => {
  const [expandedProjects, setExpandedProjects] = useState({});
  const [editingEntry, setEditingEntry] = useState(null);
  const [editFormData, setEditFormData] = useState({
    startTime: "",
    endTime: "",
    description: "",
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState(null);
  const [deletingProjectId, setDeletingProjectId] = useState(null);

  const toggleProject = (projectId) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTimeDetailed = (start, end) => {
    if (!start || !end) return "—";
    const startTime = new Date(start).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endTime = new Date(end).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${startTime} - ${endTime}`;
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const duration = Math.floor((new Date(end) - new Date(start)) / 1000);
    return formatTime(duration);
  };

  const getProjectColor = (project) => {
    const color = project.color || "#6366f1";
    return color;
  };

  const lightenColor = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const lighten = (c) => Math.min(255, Math.floor(c + (255 - c) * 0.3));

    return `#${lighten(r).toString(16).padStart(2, "0")}${lighten(g).toString(16).padStart(2, "0")}${lighten(b).toString(16).padStart(2, "0")}`;
  };

  const formatDateTimeLocal = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleEditClick = (entry) => {
    setEditingEntry(entry);
    setEditFormData({
      startTime: formatDateTimeLocal(entry.startTime),
      endTime: formatDateTimeLocal(entry.endTime),
      description: entry.description || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;

    try {
      const response = await fetch(`/api/entries/${editingEntry.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start: editFormData.startTime,
          end: editFormData.endTime,
          note: editFormData.description,
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingEntry(null);
        if (onUpdate) onUpdate();
      } else {
        alert("Failed to update entry");
      }
    } catch (error) {
      console.error("Error updating entry:", error);
      alert("Error updating entry");
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    setDeletingEntryId(entryId);
    try {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        if (onUpdate) onUpdate();
      } else {
        alert("Failed to delete entry");
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      alert("Error deleting entry");
    } finally {
      setDeletingEntryId(null);
    }
  };

  const handleDeleteProject = async (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    const projectName = project?.name || "this project";

    if (
      !confirm(
        `⚠️ Delete "${projectName}"?\n\nThis will permanently delete:\n• All time entries\n• All goals\n• All goal progress data\n\nThis action cannot be undone!`,
      )
    )
      return;

    setDeletingProjectId(projectId);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        if (onDeleteProject) onDeleteProject(projectId);
        if (onUpdate) onUpdate();
      } else {
        alert("Failed to delete project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Error deleting project");
    } finally {
      setDeletingProjectId(null);
    }
  };

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
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
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          No projects yet
        </h3>
        <p className="text-text-secondary text-center max-w-sm">
          Start tracking time on your projects to see them appear here
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface rounded-2xl border border-dark-border shadow-premium max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-text-primary">
                  Edit Time Entry
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEntry(null);
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
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editFormData.startTime}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        startTime: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editFormData.endTime}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        endTime: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Description
                  </label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg text-text-primary focus:outline-none focus:border-primary transition-colors resize-none"
                    placeholder="What are you working on?"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleUpdateEntry}
                  className="btn-primary flex-1"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEntry(null);
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

      <div className="space-y-3">
        {projects.map((project, index) => {
          const isExpanded = expandedProjects[project.id];
          const hasEntries = project.entries && project.entries.length > 0;
          const projectColor = getProjectColor(project);
          const projectColorLight = lightenColor(projectColor);

          return (
            <div
              key={project.id}
              className="animate-smooth-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Project Summary Row */}
              <div
                className={`
                  group relative bg-dark-surface rounded-xl border border-dark-border
                  transition-all duration-300 ease-smooth
                  ${hasEntries ? "hover:border-dark-border-light hover:shadow-premium" : ""}
                  ${isExpanded ? "border-dark-border-light shadow-premium" : ""}
                  ${deletingProjectId === project.id ? "opacity-50" : ""}
                `}
              >
                <div className="flex items-center justify-between p-5">
                  <div
                    className="flex items-center space-x-4 flex-1 min-w-0 cursor-pointer"
                    onClick={() => hasEntries && toggleProject(project.id)}
                  >
                    {/* Project Color Indicator */}
                    <div
                      className={`
                        w-1 h-12 rounded-full
                        transform transition-all duration-300 ease-smooth
                        ${isExpanded ? "h-16" : "group-hover:h-14"}
                      `}
                      style={{
                        background: `linear-gradient(to bottom, ${projectColor}, ${projectColorLight})`,
                      }}
                    />

                    {/* Project Icon */}
                    <div
                      className={`
                        w-12 h-12 rounded-xl
                        flex items-center justify-center flex-shrink-0
                        transform transition-all duration-300 ease-smooth
                        ${hasEntries ? "group-hover:scale-110 group-hover:shadow-glow-md" : ""}
                      `}
                      style={{
                        background: `linear-gradient(to bottom right, ${projectColor}, ${projectColorLight})`,
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

                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-text-primary mb-1 truncate">
                        {project.name}
                      </h3>
                      {hasEntries && (
                        <p className="text-sm text-text-secondary">
                          {project.entries.length}{" "}
                          {project.entries.length === 1 ? "entry" : "entries"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Total Time and Actions */}
                  <div className="flex items-center space-x-4">
                    {showProjectActions && (
                      <div className="flex items-center space-x-2 mr-2">
                        {/* Edit Project Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEditProject) onEditProject(project);
                          }}
                          className="w-9 h-9 rounded-lg bg-dark-elevated border border-dark-border flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary transition-all opacity-0 group-hover:opacity-100"
                          title="Edit project"
                          disabled={deletingProjectId === project.id}
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>

                        {/* Delete Project Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id);
                          }}
                          className="w-9 h-9 rounded-lg bg-dark-elevated border border-dark-border flex items-center justify-center text-text-secondary hover:text-red-500 hover:border-red-500 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete project"
                          disabled={deletingProjectId === project.id}
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    )}

                    <div className="text-right">
                      <div className="text-2xl font-bold text-text-primary font-mono">
                        {formatTime(project.totalTime || 0)}
                      </div>
                      <div className="text-xs text-text-tertiary mt-1">
                        Total today
                      </div>
                    </div>

                    {/* Expand/Collapse Icon */}
                    {hasEntries && (
                      <div
                        className={`
                          w-8 h-8 rounded-lg bg-dark-elevated flex items-center justify-center
                          text-text-secondary transition-all duration-300 ease-smooth
                          ${isExpanded ? "rotate-180 bg-dark-surface-hover" : "group-hover:bg-dark-surface-hover"}
                        `}
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
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Entries */}
                {hasEntries && (
                  <div
                    className={`
                      overflow-hidden transition-all duration-300 ease-smooth
                      ${isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}
                    `}
                  >
                    <div className="px-5 pb-5 pt-2">
                      {/* Divider */}
                      <div className="h-px bg-dark-border mb-4" />

                      {/* Entries List */}
                      <div className="space-y-2">
                        {project.entries.map((entry, entryIndex) => (
                          <div
                            key={entry.id}
                            className={`
                              bg-dark-elevated rounded-lg p-4 border border-dark-border
                              transform transition-all duration-300 ease-smooth
                              hover:border-dark-border-light hover:bg-dark-surface-hover
                              ${isExpanded ? "animate-smooth-slide-down" : ""}
                              ${deletingEntryId === entry.id ? "opacity-50" : ""}
                            `}
                            style={{
                              animationDelay: `${entryIndex * 50}ms`,
                            }}
                          >
                            <div className="flex items-center justify-between">
                              {/* Entry Details */}
                              <div className="flex items-center space-x-4 flex-1 min-w-0">
                                {/* Time Icon */}
                                <div className="w-10 h-10 rounded-lg bg-dark-surface flex items-center justify-center text-text-secondary flex-shrink-0">
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
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                </div>

                                {/* Time Range */}
                                <div className="flex-1 min-w-0">
                                  <div className="text-text-primary font-medium">
                                    {formatTimeDetailed(
                                      entry.startTime,
                                      entry.endTime,
                                    )}
                                  </div>
                                  {entry.description && (
                                    <div className="text-sm text-text-secondary mt-1 truncate">
                                      {entry.description}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Duration Badge and Actions */}
                              <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                                <div
                                  className="px-4 py-2 rounded-lg text-white font-mono font-semibold text-sm shadow-glow-sm"
                                  style={{
                                    background: `linear-gradient(to bottom right, ${projectColor}, ${projectColorLight})`,
                                  }}
                                >
                                  {calculateDuration(
                                    entry.startTime,
                                    entry.endTime,
                                  )}
                                </div>

                                {/* Edit Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(entry);
                                  }}
                                  className="w-9 h-9 rounded-lg bg-dark-surface border border-dark-border flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary transition-all"
                                  title="Edit entry"
                                  disabled={deletingEntryId === entry.id}
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
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>

                                {/* Delete Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteEntry(entry.id);
                                  }}
                                  className="w-9 h-9 rounded-lg bg-dark-surface border border-dark-border flex items-center justify-center text-text-secondary hover:text-red-500 hover:border-red-500 transition-all"
                                  title="Delete entry"
                                  disabled={deletingEntryId === entry.id}
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
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default ProjectsList;
