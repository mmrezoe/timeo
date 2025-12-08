let currentTimerId = null;
let currentProjectName = null;
let currentTimerStartTime = null;
let reportChart = null;
let elapsedTimeInterval = null;

// Show/Hide sections
function showSection(sectionName) {
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.add("hidden");
  });
  document.getElementById(sectionName).classList.remove("hidden");

  // Load data when section is shown
  if (sectionName === "home") {
    loadHomeData();
    loadLast7DaysData();
  } else if (sectionName === "projects") {
    loadProjectsList();
  } else if (sectionName === "timer") {
    loadProjectsForTimer();
    loadCurrentActiveTimer();
    loadRecentTimers();
    // Start updating elapsed time if there's an active timer
    if (currentTimerId) {
      updateElapsedTime();
      if (elapsedTimeInterval) clearInterval(elapsedTimeInterval);
      elapsedTimeInterval = setInterval(updateElapsedTime, 1000);
    }
  } else if (sectionName === "goals") {
    loadProjectsForGoals();
    loadGoalsList();
  } else if (sectionName === "report") {
    loadProjectsForReport();
    loadReport();
  }
}

// Format time display
function formatElapsedTime(startTime) {
  const now = new Date();
  const start = new Date(startTime);
  const diffMs = now - start;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  const seconds = diffSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

// Update elapsed time display
function updateElapsedTime() {
  if (!currentTimerStartTime) return;

  const elapsedDisplay = document.getElementById("elapsed_time");
  if (elapsedDisplay) {
    elapsedDisplay.textContent = formatElapsedTime(currentTimerStartTime);
  }
}

// ========== PROJECTS ==========
async function loadProjectsList() {
  try {
    const res = await fetch("/projects");

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    const ul = document.getElementById("projects_list");
    ul.innerHTML = "";

    if (!Array.isArray(data)) {
      console.error("Invalid response format:", data);
      ul.innerHTML =
        '<li class="p-4 text-red-500">Error: Invalid response from server</li>';
      return;
    }

    if (data.length === 0) {
      ul.innerHTML =
        '<div class="p-8 text-center"><div class="text-gray-500 mb-2">📁</div><p class="text-gray-400">No projects yet. Add one above to get started!</p></div>';
      return;
    }

    data.forEach((p) => {
      const li = document.createElement("li");
      li.className =
        "p-6 flex justify-between items-center hover:bg-dark-tertiary transition-all border-b border-gray-600 last:border-b-0";
      li.innerHTML = `
                <div class="flex items-center gap-3">
                  <div class="w-3 h-3 bg-accent-purple rounded-full"></div>
                  <span class="font-medium text-white text-lg">${p.name}</span>
                </div>
                <button onclick="deleteProject(${p.id}, '${p.name.replace(/'/g, "\\'")}')"
                        class="btn-danger px-4 py-2 rounded-lg text-sm font-medium">
                    🗑️ Delete
                </button>
            `;
      ul.appendChild(li);
    });
  } catch (error) {
    console.error("Error loading projects:", error);
    const ul = document.getElementById("projects_list");
    if (ul) {
      ul.innerHTML = `<li class="p-4 text-red-500">Error: ${error.message}</li>`;
    }
    alert("Error loading projects: " + error.message);
  }
}

async function addProject() {
  const name = document.getElementById("project_name_input").value.trim();
  if (!name) {
    alert("Please enter a project name");
    return;
  }

  try {
    const res = await fetch("/projects/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = await res.json();

    if (res.ok) {
      document.getElementById("project_name_input").value = "";
      loadProjectsList();
      // Also reload project selects in other sections
      loadProjectsForTimer();
      loadProjectsForGoals();
      loadProjectsForReport();
      // Refresh home data if on home section
      if (!document.getElementById("home").classList.contains("hidden")) {
        loadHomeData();
        loadLast7DaysData();
      }
    } else {
      alert(data.error || "Error adding project");
    }
  } catch (error) {
    console.error("Error adding project:", error);
    alert("Error adding project");
  }
}

async function deleteProject(id, name) {
  if (!confirm(`Are you sure you want to delete project "${name}"?`)) {
    return;
  }

  try {
    const res = await fetch(`/projects/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (res.ok) {
      loadProjectsList();
      // Also reload project selects in other sections
      loadProjectsForTimer();
      loadProjectsForGoals();
      loadProjectsForReport();
      // Refresh home data if on home section
      if (!document.getElementById("home").classList.contains("hidden")) {
        loadHomeData();
        loadLast7DaysData();
      }
    } else {
      alert(data.error || "Error deleting project");
    }
  } catch (error) {
    console.error("Error deleting project:", error);
    alert("Error deleting project");
  }
}

// ========== TIMER ==========
async function loadProjectsForTimer() {
  try {
    const res = await fetch("/projects");

    if (!res.ok) {
      console.error("Error loading projects for timer:", res.status);
      return;
    }

    const data = await res.json();
    const select = document.getElementById("timer_project_select");
    if (!select) return;

    select.innerHTML = '<option value="">Select a project</option>';

    if (Array.isArray(data)) {
      data.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
      });
    }
  } catch (error) {
    console.error("Error loading projects for timer:", error);
  }
}

async function loadCurrentActiveTimer() {
  try {
    const res = await fetch("/timers/active");
    const data = await res.json();
    const activeProjectSpan = document.getElementById("active_project_name");
    const startBtn = document.getElementById("start_btn");
    const projectSelect = document.getElementById("timer_project_select");

    if (!Array.isArray(data) || data.length === 0) {
      // No active timer
      currentTimerId = null;
      currentProjectName = null;
      currentTimerStartTime = null;
      if (activeProjectSpan) {
        activeProjectSpan.classList.add("hidden");
        activeProjectSpan.innerHTML = "";
      }
      // Enable start button and project select
      if (startBtn) startBtn.disabled = false;
      if (projectSelect) projectSelect.disabled = false;
      // Enable stop button
      const stopBtn = document.getElementById("stop_btn");
      if (stopBtn) {
        stopBtn.disabled = false;
        stopBtn.innerHTML = "⏹️ Stop";
      }
      // Clear interval
      if (elapsedTimeInterval) {
        clearInterval(elapsedTimeInterval);
        elapsedTimeInterval = null;
      }
      return;
    }

    // Get the first active timer (should be only one)
    const activeTimer = data[0];
    currentTimerId = activeTimer.id;
    currentProjectName = activeTimer.project;
    currentTimerStartTime = activeTimer.start_time;

    // Calculate elapsed time
    const startTime = new Date(activeTimer.start_time);
    const now = new Date();
    const diffMs = now - startTime;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    if (activeProjectSpan) {
      activeProjectSpan.classList.remove("hidden");
      activeProjectSpan.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">⚡</span>
              <span class="font-bold text-xl">${activeTimer.project}</span>
            </div>
            ${activeTimer.description ? `<div class="text-sm text-green-200 mt-1">${activeTimer.description}</div>` : ""}
            <div class="text-xs text-green-200 mt-1">Started at ${startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold animate-pulse">
              <span id="elapsed_time">${timeText}</span> 🔥
            </div>
            <div class="text-sm text-green-200">Currently Running</div>
          </div>
        </div>
      `;
    }

    // Disable start button and project select
    if (startBtn) startBtn.disabled = true;
    if (projectSelect) projectSelect.disabled = false; // Keep project select enabled for visibility

    // Start updating elapsed time
    if (elapsedTimeInterval) clearInterval(elapsedTimeInterval);
    elapsedTimeInterval = setInterval(updateElapsedTime, 1000);
  } catch (error) {
    console.error("Error loading active timer:", error);
  }
}

async function startTimer() {
  const startBtn = document.getElementById("start_btn");

  // Prevent double-click by disabling button immediately
  if (startBtn) {
    if (startBtn.disabled) return; // Already starting
    startBtn.disabled = true;
    startBtn.innerHTML = "⏳ Starting...";
  }

  const project_id = document.getElementById("timer_project_select").value;
  const description = document.getElementById("timer_description").value;

  if (!project_id) {
    alert("Please select a project");
    // Re-enable button on error
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.innerHTML = "▶️ Start";
    }
    return;
  }

  try {
    const res = await fetch("/timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: parseInt(project_id), description }),
    });

    const data = await res.json();

    if (res.ok) {
      currentTimerId = data.timer_id;
      // Get project name from select
      const projectSelect = document.getElementById("timer_project_select");
      const selectedOption = projectSelect.options[projectSelect.selectedIndex];
      currentProjectName = selectedOption.textContent;
      currentTimerStartTime = new Date().toISOString();

      // Update the active timer display immediately
      setTimeout(() => {
        loadCurrentActiveTimer();
      }, 100);

      // Disable start button but keep project select enabled for visibility
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.innerHTML = "▶️ Start";
      }
      projectSelect.disabled = false;

      // Enable stop button
      const stopBtn = document.getElementById("stop_btn");
      if (stopBtn) {
        stopBtn.disabled = false;
        stopBtn.innerHTML = "⏹️ Stop";
      }

      document.getElementById("timer_description").value = "";

      // Start updating elapsed time
      if (elapsedTimeInterval) clearInterval(elapsedTimeInterval);
      elapsedTimeInterval = setInterval(updateElapsedTime, 1000);

      // Load data after a short delay to ensure backend processing is complete
      setTimeout(() => {
        loadRecentTimers();
        loadHomeData();
        loadLast7DaysData();
        loadGoalsList();
      }, 300);
    } else {
      alert(data.error || "Error starting timer");
      // Re-enable button on error
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.innerHTML = "▶️ Start";
      }
    }
  } catch (error) {
    console.error("Error starting timer:", error);
    alert("Error starting timer");
    // Re-enable button on error
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.innerHTML = "▶️ Start";
    }
  }
}

async function stopTimer() {
  if (!currentTimerId) {
    alert("No active timer to stop");
    return;
  }

  // Prevent multiple stops by disabling the button immediately
  const stopBtn = document.getElementById("stop_btn");
  if (stopBtn) {
    stopBtn.disabled = true;
    stopBtn.innerHTML = "⏳ Stopping...";
  }

  try {
    const res = await fetch("/timer/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timer_id: currentTimerId }),
    });

    const data = await res.json();

    if (res.ok) {
      currentTimerId = null;
      currentProjectName = null;
      currentTimerStartTime = null;

      // Clear interval
      if (elapsedTimeInterval) {
        clearInterval(elapsedTimeInterval);
        elapsedTimeInterval = null;
      }

      // Hide active timer display
      const activeProjectSpan = document.getElementById("active_project_name");
      if (activeProjectSpan) {
        activeProjectSpan.classList.add("hidden");
        activeProjectSpan.innerHTML = "";
      }

      // Enable start button and project select
      document.getElementById("start_btn").disabled = false;
      document.getElementById("timer_project_select").disabled = false;

      // Re-enable stop button with original text
      if (stopBtn) {
        stopBtn.disabled = false;
        stopBtn.innerHTML = "⏹️ Stop";
      }

      // Load data after a short delay to ensure backend processing is complete
      setTimeout(() => {
        loadRecentTimers();
        loadHomeData();
        loadLast7DaysData();
        loadGoalsList();
      }, 300);
    } else {
      // Don't show alerts for expected conditions
      const errorMsg = data.error || "Error stopping timer";
      if (
        !errorMsg.includes("already stopped") &&
        !data.status?.includes("already stopped")
      ) {
        console.error("Timer stop error:", errorMsg);
      }
      // Always re-enable stop button
      if (stopBtn) {
        stopBtn.disabled = false;
        stopBtn.innerHTML = "⏹️ Stop";
      }
    }
  } catch (error) {
    console.error("Network error stopping timer:", error);
    // Only show alert for actual network errors
    if (error.name === "NetworkError" || error.message.includes("fetch")) {
      alert("Network error - please check your connection");
    }
    // Re-enable stop button on error
    if (stopBtn) {
      stopBtn.disabled = false;
      stopBtn.innerHTML = "⏹️ Stop";
    }
  }
}

async function loadRecentTimers() {
  try {
    const container = document.getElementById("recent_timers");
    if (!container) return;

    container.innerHTML = "";

    // Skip active timers display in recent timers - they are shown in the top section

    // Load completed timers only (excluding active ones)
    const res = await fetch("/timers/recent");
    if (!res.ok) {
      console.error("Error loading recent timers:", res.status);
      return;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML =
        '<div class="text-center py-8"><div class="text-gray-500 mb-4 text-4xl">📝</div><p class="text-gray-400">No completed sessions today.</p><p class="text-gray-500 text-sm mt-2">Complete a timer to see your progress here!</p></div>';
      return;
    }

    // Filter out any active timers from the data
    const completedData = data.filter((dateGroup) => {
      if (!dateGroup || !dateGroup.projects) return true;

      // Filter out active timers from each project
      dateGroup.projects = dateGroup.projects
        .map((project) => {
          if (project.timers) {
            project.timers = project.timers.filter((timer) => !timer.is_active);
          }
          return project;
        })
        .filter((project) => project.timers && project.timers.length > 0);

      return dateGroup.projects.length > 0;
    });

    completedData.forEach((dateGroup) => {
      if (!dateGroup || !dateGroup.date) return;

      const dateDiv = document.createElement("div");
      dateDiv.className = "mb-8";

      const date = new Date(dateGroup.date);
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      const dateStr = date.toLocaleDateString("en-US", options);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateLabel;
      let dateIcon = "📅";
      const isToday = date.toDateString() === today.toDateString();
      const isYesterday = date.toDateString() === yesterday.toDateString();

      if (isToday) {
        dateLabel = "Today";
        dateIcon = "🌟";
      } else if (isYesterday) {
        dateLabel = "Yesterday";
        dateIcon = "🌙";
      } else {
        dateLabel = dateStr;
      }

      dateDiv.innerHTML = `<h4 class="font-bold text-xl mb-4 text-white flex items-center gap-2">${dateIcon} ${dateLabel}</h4>`;

      const projectsContainer = document.createElement("div");
      projectsContainer.className = "space-y-4";

      if (dateGroup.projects && Array.isArray(dateGroup.projects)) {
        dateGroup.projects.forEach((project) => {
          const projectDiv = document.createElement("div");
          projectDiv.className =
            "card p-6 border-l-4 border-accent-purple cursor-pointer hover:shadow-lg transition-all";

          const totalHours = project.total_hours.toFixed(2);
          const hours = Math.floor(project.total_hours);
          const minutes = Math.round((project.total_hours - hours) * 60);

          let timeDisplay = "";
          if (hours > 0) {
            timeDisplay = `${hours}h ${minutes}m`;
          } else {
            timeDisplay = `${minutes}m`;
          }

          projectDiv.innerHTML = `
                        <div class="flex justify-between items-center mb-4">
                            <h5 class="font-bold text-lg text-white">${project.project_name}</h5>
                            <span class="text-accent-purple font-semibold time-display text-xl">${timeDisplay}</span>
                        </div>
                        <div class="text-sm text-gray-400 mb-3">
                            ${project.timers.length} completed session${project.timers.length !== 1 ? "s" : ""} today • Click for details
                        </div>
                    `;

          const timersList = document.createElement("div");
          timersList.className = "timer-details space-y-3 mt-4 hidden";

          if (project.timers && Array.isArray(project.timers)) {
            project.timers.forEach((timer) => {
              // Skip active timers (additional safety check)
              if (timer.is_active) return;

              const timerItem = document.createElement("div");
              timerItem.className =
                "bg-dark-tertiary p-4 rounded-lg border border-gray-600 flex justify-between items-start";

              const timerHours = timer.duration_hours.toFixed(2);
              const tHours = Math.floor(timer.duration_hours);
              const tMinutes = Math.round((timer.duration_hours - tHours) * 60);

              let timerTimeDisplay = "";
              if (tHours > 0) {
                timerTimeDisplay = `${tHours}h ${tMinutes}m`;
              } else {
                timerTimeDisplay = `${tMinutes}m`;
              }

              const startTime = new Date(timer.start_time).toLocaleTimeString(
                "en-US",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
              );

              let endTimeText = "";
              if (timer.end_time) {
                const endTime = new Date(timer.end_time).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );
                endTimeText = ` - ${endTime}`;
              }

              timerItem.innerHTML = `
                                <div class="flex-1">
                                    <div class="font-medium text-white mb-1">${timer.description || "⚡ No description"}</div>
                                    <div class="text-xs text-gray-400">✅ Completed: ${startTime}${endTimeText}</div>
                                </div>
                                <div class="flex items-center gap-3 ml-4">
                                    <span class="text-accent-purple font-semibold time-display">${timerTimeDisplay}</span>
                                    <button onclick="deleteTimer(${timer.id})"
                                        class="btn-danger px-3 py-1 rounded text-xs">
                                        🗑️
                                    </button>
                                </div>
                            `;

              timersList.appendChild(timerItem);
            });
          }

          projectDiv.appendChild(timersList);

          // Add click event to toggle timer details
          projectDiv.addEventListener("click", (e) => {
            if (e.target.tagName === "BUTTON") return; // Don't toggle if clicking delete button

            if (timersList.classList.contains("hidden")) {
              timersList.classList.remove("hidden");
              projectDiv.classList.add("border-l-4", "border-green-400");
              projectDiv.classList.remove("border-accent-purple");
            } else {
              timersList.classList.add("hidden");
              projectDiv.classList.remove("border-green-400");
              projectDiv.classList.add("border-accent-purple");
            }
          });

          projectsContainer.appendChild(projectDiv);
        });
      }

      dateDiv.appendChild(projectsContainer);
      container.appendChild(dateDiv);
    });
  } catch (error) {
    console.error("Error loading recent timers:", error);
  }
}

async function deleteTimer(id) {
  if (!confirm("Are you sure you want to delete this timer?")) {
    return;
  }

  try {
    const res = await fetch(`/timers/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (res.ok) {
      loadRecentTimers();
      // Update goals progress and home data
      loadHomeData();
      loadLast7DaysData();
      loadGoalsList();
    } else {
      alert(data.error || "Error deleting timer");
    }
  } catch (error) {
    console.error("Error deleting timer:", error);
    alert("Error deleting timer");
  }
}

// ========== HOME ==========
async function loadHomeData() {
  try {
    const res = await fetch("/api/home");

    if (!res.ok) {
      console.error("Error loading home data:", res.status);
      return;
    }

    const data = await res.json();
    const container = document.getElementById("home_goals");
    if (!container) return;

    container.innerHTML = "";

    if (!data.goals || data.goals.length === 0) {
      container.innerHTML =
        '<div class="card p-8 text-center"><div class="text-gray-500 mb-4 text-4xl">🎯</div><p class="text-gray-400">No goals set yet.</p><p class="text-gray-500 text-sm mt-2">Create a goal to start tracking your progress!</p></div>';
      return;
    }

    data.goals.forEach((goal) => {
      const goalDiv = document.createElement("div");
      goalDiv.className =
        "bg-white rounded-lg shadow p-4 border-l-4 " +
        (goal.today_achieved ? "border-green-500" : "border-orange-500");

      const progressPercent =
        goal.target_minutes > 0
          ? Math.min((goal.today_progress / goal.target_minutes) * 100, 100)
          : 0;

      const hours = Math.floor(goal.today_progress / 60);
      const minutes = Math.round(goal.today_progress % 60);
      const progressText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      // Check if there's an active timer for this goal's project
      const hasActiveTimer =
        currentTimerId &&
        currentProjectName &&
        currentProjectName.toLowerCase() === goal.project_name.toLowerCase();

      // Determine streak emoji based on goal achievement
      let streakEmoji = goal.today_achieved ? "🔥" : "🪵";

      goalDiv.className = `goal-item card p-6 rounded-lg ${goal.today_achieved ? "" : "not-achieved"}`;

      goalDiv.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h4 class="font-bold text-xl text-white">${goal.project_name}</h4>
                        <p class="text-sm text-gray-400">Target: ${goal.target_minutes} minutes daily</p>
                    </div>
                    <div class="text-right">
                        <div class="streak-display">
                            <span class="streak-emoji text-3xl">${streakEmoji}</span>
                            <div class="text-right">
                                <div class="text-2xl font-bold ${goal.today_achieved ? "text-success" : "text-warning"}">
                                    ${goal.streak}
                                </div>
                                <div class="text-xs text-gray-400">day streak</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mt-4">
                    <div class="flex justify-between text-sm mb-2">
                        <span class="text-gray-300">Today: ${progressText} / ${goal.target_minutes}m</span>
                        <span class="${goal.today_achieved ? "status-achieved" : "text-gray-400"}">
                            ${goal.today_achieved ? "✓ Achieved!" : Math.round(progressPercent) + "%"}
                        </span>
                    </div>
                    <div class="progress-bar w-full bg-dark-tertiary rounded-full h-3">
                        <div class="progress-fill h-3 rounded-full ${goal.today_achieved ? "achieved" : "in-progress"}"
                             style="width: ${progressPercent}%"></div>
                    </div>
                </div>
            `;

      container.appendChild(goalDiv);
    });
  } catch (error) {
    console.error("Error loading home data:", error);
    const container = document.getElementById("home_goals");
    if (container) {
      container.innerHTML =
        '<p class="text-red-500">Error loading home data</p>';
    }
  }
}

// ========== LAST 7 DAYS ==========
async function loadLast7DaysData() {
  try {
    const res = await fetch("/api/last-7-days");

    if (!res.ok) {
      console.error("Error loading last 7 days data:", res.status);
      return;
    }

    const data = await res.json();
    const container = document.getElementById("last_7_days");
    if (!container) return;

    container.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML =
        '<div class="card p-8 text-center"><div class="text-gray-500 mb-4 text-4xl">📅</div><p class="text-gray-400">No activity in the last 7 days.</p><p class="text-gray-500 text-sm mt-2">Start a timer to see your progress here!</p></div>';
      return;
    }

    data.forEach((dayData) => {
      const dayDiv = document.createElement("div");
      dayDiv.className = "day-overview card p-6 mb-4";

      const date = new Date(dayData.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateLabel;
      let dateIcon = "📅";
      if (date.toDateString() === today.toDateString()) {
        dateLabel = "Today";
        dateIcon = "🌟";
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateLabel = "Yesterday";
        dateIcon = "🌙";
      } else {
        const options = { weekday: "long", month: "short", day: "numeric" };
        dateLabel = date.toLocaleDateString("en-US", options);
      }

      const totalHours = dayData.total_hours.toFixed(1);
      const hours = Math.floor(dayData.total_hours);
      const minutes = Math.round((dayData.total_hours - hours) * 60);
      const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      dayDiv.innerHTML = `
        <div class="flex justify-between items-center mb-4">
          <h4 class="text-lg font-semibold text-white flex items-center gap-2">
            ${dateIcon} ${dateLabel}
          </h4>
          <span class="text-accent-purple font-bold time-display text-xl">${timeDisplay}</span>
        </div>
        <div id="projects_${dayData.date}" class="space-y-3">
        </div>
      `;

      const projectsContainer = dayDiv.querySelector(
        `#projects_${dayData.date}`,
      );

      if (dayData.projects && Array.isArray(dayData.projects)) {
        dayData.projects.forEach((project) => {
          const projectDiv = document.createElement("div");
          projectDiv.className = "project-item p-4 rounded-lg";

          const projectHours = project.total_hours.toFixed(1);
          const pHours = Math.floor(project.total_hours);
          const pMinutes = Math.round((project.total_hours - pHours) * 60);
          const projectTimeDisplay =
            pHours > 0 ? `${pHours}h ${pMinutes}m` : `${pMinutes}m`;

          projectDiv.innerHTML = `
            <div class="flex justify-between items-center">
              <div>
                <span class="font-medium text-white text-lg">${project.project_name}</span>
                <div class="text-sm text-gray-400 mt-1">
                  ${project.timers.length} session${project.timers.length !== 1 ? "s" : ""} • Click to expand
                </div>
              </div>
              <span class="text-accent-purple font-semibold time-display text-lg">${projectTimeDisplay}</span>
            </div>
          `;

          // Add click event to show/hide timer details
          projectDiv.style.cursor = "pointer";
          projectDiv.addEventListener("click", () => {
            const existingDetails = projectDiv.querySelector(".timer-details");
            if (existingDetails) {
              existingDetails.remove();
            } else {
              const detailsDiv = document.createElement("div");
              detailsDiv.className =
                "timer-details mt-3 space-y-2 p-3 rounded-lg";

              project.timers.forEach((timer) => {
                const timerDiv = document.createElement("div");
                timerDiv.className =
                  "text-sm bg-dark-tertiary p-3 rounded-lg border border-gray-600";

                const startTime = new Date(timer.start_time);
                const startTimeStr = startTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                let endTimeStr = "";
                if (timer.end_time) {
                  const endTime = new Date(timer.end_time);
                  endTimeStr =
                    " - " +
                    endTime.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                }

                const timerHours = Math.floor(timer.duration_hours);
                const timerMinutes = Math.round(
                  (timer.duration_hours - timerHours) * 60,
                );
                const timerTimeDisplay =
                  timerHours > 0
                    ? `${timerHours}h ${timerMinutes}m`
                    : `${timerMinutes}m`;

                timerDiv.innerHTML = `
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <div class="font-medium text-white">${timer.description || "⚡ No description"}</div>
                      <div class="text-gray-400 text-xs mt-1">${startTimeStr}${endTimeStr}</div>
                    </div>
                    <span class="text-accent-purple font-semibold time-display ml-3">${timerTimeDisplay}</span>
                  </div>
                `;

                detailsDiv.appendChild(timerDiv);
              });

              projectDiv.appendChild(detailsDiv);
            }
          });

          projectsContainer.appendChild(projectDiv);
        });
      }

      container.appendChild(dayDiv);
    });
  } catch (error) {
    console.error("Error loading last 7 days data:", error);
    const container = document.getElementById("last_7_days");
    if (container) {
      container.innerHTML =
        '<p class="text-red-500">Error loading recent activity</p>';
    }
  }
}

// ========== REFRESH FUNCTIONS ==========
function refreshHomeData() {
  // Add loading state
  const homeGoalsContainer = document.getElementById("home_goals");
  const last7DaysContainer = document.getElementById("last_7_days");

  if (homeGoalsContainer) {
    homeGoalsContainer.innerHTML =
      '<p class="text-gray-500">Loading goals...</p>';
  }
  if (last7DaysContainer) {
    last7DaysContainer.innerHTML =
      '<p class="text-gray-500">Loading recent activity...</p>';
  }

  // Reload all home data
  loadHomeData();
  loadLast7DaysData();
}

// ========== GOALS ==========
async function loadProjectsForGoals() {
  try {
    const res = await fetch("/projects");

    if (!res.ok) {
      console.error("Error loading projects for goals:", res.status);
      return;
    }

    const data = await res.json();
    const select = document.getElementById("goal_project_select");
    if (!select) return;

    select.innerHTML = '<option value="">Select a project</option>';

    if (Array.isArray(data)) {
      data.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
      });
    }
  } catch (error) {
    console.error("Error loading projects for goals:", error);
  }
}

async function loadGoalsList() {
  try {
    const res = await fetch("/goals");
    const data = await res.json();
    const ul = document.getElementById("goals_list");
    ul.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
      ul.innerHTML =
        '<div class="p-8 text-center"><div class="text-gray-500 mb-2 text-4xl">🎯</div><p class="text-gray-400">No goals set yet. Add one above to start tracking!</p></div>';
      return;
    }

    data.forEach((g) => {
      const li = document.createElement("li");
      li.className = "p-4 border-b";

      const progressPercent =
        g.target_minutes > 0
          ? Math.min((g.today_progress / g.target_minutes) * 100, 100)
          : 0;

      const hours = Math.floor(g.today_progress / 60);
      const minutes = Math.round(g.today_progress % 60);
      const progressText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      // Check if there's an active timer for this goal's project
      const hasActiveTimer =
        currentTimerId &&
        currentProjectName &&
        currentProjectName.toLowerCase() === g.project_name.toLowerCase();

      // Determine streak emoji and status
      const streakEmoji = g.today_achieved ? "🔥" : "🪵";
      const streakColor = g.today_achieved
        ? "text-orange-400"
        : "text-gray-500";

      li.className = `goal-item p-6 ${g.today_achieved ? "" : "not-achieved"}`;

      li.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-3">
                            <strong class="text-xl text-white">${g.project_name || "Unknown Project"}</strong>
                            <div class="streak-display">
                                <span class="streak-emoji text-2xl">${streakEmoji}</span>
                                <span class="${streakColor} font-bold text-lg ml-1">${g.streak}</span>
                                <span class="text-xs text-gray-400 ml-1">day streak</span>
                            </div>
                        </div>
                        <p class="text-sm text-gray-400 mb-3">Target: ${g.target_minutes} minutes per day</p>
                        <div class="mb-3">
                            <div class="flex justify-between text-sm mb-2">
                                <span class="text-gray-300">Today: ${progressText} / ${g.target_minutes}m</span>
                                <span class="${g.today_achieved ? "status-achieved" : "text-gray-400"}">
                                    ${g.today_achieved ? "✅ Achieved!" : Math.round(progressPercent) + "%"}
                                </span>
                            </div>
                            <div class="progress-bar w-full bg-dark-tertiary rounded-full h-3">
                                <div class="progress-fill h-3 rounded-full ${g.today_achieved ? "achieved" : "in-progress"}"
                                     style="width: ${progressPercent}%"></div>
                            </div>
                        </div>
                        <small class="text-gray-500">Started: ${new Date(g.start_date).toLocaleDateString()}</small>
                    </div>
                    <button onclick="deleteGoal(${g.id}, '${(g.project_name || "Unknown Project").replace(/'/g, "\\'")}')"
                            class="btn-danger px-4 py-2 rounded-lg text-sm ml-4 font-medium">
                        🗑️ Delete
                    </button>
                </div>
            `;
      ul.appendChild(li);
    });
  } catch (error) {
    console.error("Error loading goals:", error);
    const ul = document.getElementById("goals_list");
    if (ul) {
      ul.innerHTML = '<li class="text-red-500 p-4">Error loading goals</li>';
    }
  }
}

async function addGoal() {
  const project_id = document.getElementById("goal_project_select").value;
  const target_minutes = document.getElementById("goal_minutes").value;

  if (!project_id) {
    alert("Please select a project");
    return;
  }

  if (!target_minutes || parseInt(target_minutes) <= 0) {
    alert("Please enter a valid target minutes (must be greater than 0)");
    return;
  }

  try {
    const res = await fetch("/goals/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: parseInt(project_id),
        target_minutes: parseInt(target_minutes),
      }),
    });

    const data = await res.json();

    if (res.ok) {
      document.getElementById("goal_minutes").value = "";
      document.getElementById("goal_project_select").value = "";
      loadGoalsList();
      loadHomeData(); // Refresh home page too
    } else {
      alert(data.error || "Error adding goal");
    }
  } catch (error) {
    console.error("Error adding goal:", error);
    alert("Error adding goal");
  }
}

async function deleteGoal(id, projectName) {
  if (
    !confirm(`Are you sure you want to delete the goal for "${projectName}"?`)
  ) {
    return;
  }

  try {
    const res = await fetch(`/goals/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (res.ok) {
      loadGoalsList();
      loadHomeData(); // Refresh home page too
    } else {
      alert(data.error || "Error deleting goal");
    }
  } catch (error) {
    console.error("Error deleting goal:", error);
    alert("Error deleting goal");
  }
}

// ========== REPORT ==========
async function loadReport() {
  try {
    const reportType = document.getElementById("reportType").value;
    const projectFilter = document.getElementById("projectFilter").value;
    const limit = document.getElementById("reportLimit").value;

    const params = new URLSearchParams({
      type: reportType,
      limit: limit,
    });

    if (projectFilter) {
      params.append("project", projectFilter);
    }

    const res = await fetch(`/report?${params}`);
    const response = await res.json();

    // Update summary cards
    updateReportSummary(response.summary, response.type);

    // Update chart
    updateReportChart(response.data, response.type);

    // Update data table
    updateReportTable(response.data, response.type);
  } catch (error) {
    console.error("Error loading report:", error);
    alert("Error loading report: " + error.message);
  }
}

async function loadProjectsForReport() {
  try {
    const res = await fetch("/api/projects-list");
    const projects = await res.json();

    const select = document.getElementById("projectFilter");
    select.innerHTML = '<option value="">All Projects</option>';

    if (Array.isArray(projects)) {
      projects.forEach((project) => {
        const option = document.createElement("option");
        option.value = project;
        option.textContent = project;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error loading projects for report:", error);
  }
}

function updateReportSummary(summary, reportType) {
  const summaryContainer = document.getElementById("reportSummary");
  summaryContainer.innerHTML = "";

  if (!summary) return;

  const cards = [];

  if (reportType === "overview") {
    cards.push(
      {
        title: "Total Projects",
        value: summary.total_projects,
        color: "purple",
        icon: "📁",
      },
      {
        title: "Total Hours",
        value: summary.total_hours.toFixed(1) + "h",
        color: "green",
        icon: "⏱️",
      },
      {
        title: "Avg per Project",
        value:
          summary.total_projects > 0
            ? (summary.total_hours / summary.total_projects).toFixed(1) + "h"
            : "0h",
        color: "blue",
        icon: "📊",
      },
    );
  } else if (reportType === "daily") {
    cards.push(
      {
        title: "Total Days",
        value: summary.total_days,
        color: "purple",
        icon: "📅",
      },
      {
        title: "Total Hours",
        value: summary.total_hours.toFixed(1) + "h",
        color: "green",
        icon: "⏱️",
      },
      {
        title: "Avg per Day",
        value: summary.avg_per_day.toFixed(1) + "h",
        color: "blue",
        icon: "📊",
      },
    );
  } else if (reportType === "weekly") {
    cards.push(
      {
        title: "Total Weeks",
        value: summary.total_weeks,
        color: "purple",
        icon: "📊",
      },
      {
        title: "Total Hours",
        value: summary.total_hours.toFixed(1) + "h",
        color: "green",
        icon: "⏱️",
      },
      {
        title: "Avg per Week",
        value: summary.avg_per_week.toFixed(1) + "h",
        color: "blue",
        icon: "📈",
      },
    );
  } else if (reportType === "monthly") {
    cards.push(
      {
        title: "Total Months",
        value: summary.total_months,
        color: "purple",
        icon: "🗓️",
      },
      {
        title: "Total Hours",
        value: summary.total_hours.toFixed(1) + "h",
        color: "green",
        icon: "⏱️",
      },
      {
        title: "Avg per Month",
        value: summary.avg_per_month.toFixed(1) + "h",
        color: "blue",
        icon: "📊",
      },
    );
  }

  cards.forEach((card) => {
    const cardEl = document.createElement("div");
    cardEl.className = `report-summary-card card p-6`;
    cardEl.innerHTML = `
            <div class="flex items-center justify-between mb-3">
              <div class="text-2xl">${card.icon}</div>
              <div class="text-right">
                <p class="text-3xl font-bold text-accent-purple time-display">${card.value}</p>
              </div>
            </div>
            <h3 class="text-sm font-medium text-gray-400">${card.title}</h3>
        `;
    summaryContainer.appendChild(cardEl);
  });
}

function updateReportChart(data, reportType) {
  const ctx = document.getElementById("reportChart");

  // Destroy existing chart if it exists
  if (reportChart) {
    reportChart.destroy();
  }

  let labels, datasets;

  if (reportType === "overview") {
    // Generate distinct colors for each project (dark theme compatible)
    const colors = [
      "rgba(168, 85, 247, 0.8)",
      "rgba(16, 185, 129, 0.8)",
      "rgba(245, 101, 101, 0.8)",
      "rgba(59, 130, 246, 0.8)",
      "rgba(251, 191, 36, 0.8)",
      "rgba(236, 72, 153, 0.8)",
      "rgba(14, 165, 233, 0.8)",
      "rgba(34, 197, 94, 0.8)",
      "rgba(239, 68, 68, 0.8)",
      "rgba(139, 92, 246, 0.8)",
      "rgba(249, 115, 22, 0.8)",
      "rgba(217, 70, 239, 0.8)",
    ];

    labels = data.map((d) => d.project_name);
    datasets = [
      {
        label: "Total Hours",
        data: data.map((d) => d.total_hours),
        backgroundColor: data.map((_, index) => colors[index % colors.length]),
        borderColor: data.map((_, index) =>
          colors[index % colors.length].replace("0.8", "1"),
        ),
        borderWidth: 2,
      },
    ];
  } else if (reportType === "daily") {
    // For daily reports, show projects as separate datasets
    const projectMap = {};
    const allProjects = new Set();

    // Collect all unique projects and dates
    data.forEach((dayData) => {
      dayData.projects.forEach((project) => {
        allProjects.add(project.project_name);
        if (!projectMap[project.project_name]) {
          projectMap[project.project_name] = {};
        }
        projectMap[project.project_name][dayData.date] = project.hours;
      });
    });

    labels = data.map((d) => new Date(d.date).toLocaleDateString());

    const colors = [
      "rgba(59, 130, 246, 0.8)",
      "rgba(16, 185, 129, 0.8)",
      "rgba(245, 101, 101, 0.8)",
      "rgba(139, 92, 246, 0.8)",
      "rgba(251, 191, 36, 0.8)",
      "rgba(236, 72, 153, 0.8)",
    ];

    datasets = Array.from(allProjects).map((projectName, index) => ({
      label: projectName,
      data: data.map((dayData) => projectMap[projectName][dayData.date] || 0),
      backgroundColor: colors[index % colors.length],
      borderColor: colors[index % colors.length].replace("0.8", "1"),
      borderWidth: 2,
      fill: false,
    }));
  } else if (reportType === "weekly") {
    labels = data.map((d) => `Week ${d.week_number}, ${d.year}`);
    datasets = [
      {
        label: "Hours per Week",
        data: data.map((d) => d.total_hours),
        backgroundColor: "rgba(139, 92, 246, 0.8)",
        borderColor: "rgba(139, 92, 246, 1)",
        borderWidth: 2,
      },
    ];
  } else if (reportType === "monthly") {
    labels = data.map((d) => `${d.month} ${d.year}`);
    datasets = [
      {
        label: "Hours per Month",
        data: data.map((d) => d.total_hours),
        backgroundColor: "rgba(245, 101, 101, 0.8)",
        borderColor: "rgba(245, 101, 101, 1)",
        borderWidth: 2,
      },
    ];
  }

  reportChart = new Chart(ctx, {
    type: reportType === "daily" ? "line" : "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        },
        legend: {
          display: true,
          position: "top",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Hours",
          },
        },
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
    },
  });
}

function updateReportTable(data, reportType) {
  const tableContainer = document.getElementById("reportTable");

  if (!data || data.length === 0) {
    tableContainer.innerHTML = '<p class="text-gray-500">No data available</p>';
    return;
  }

  let tableHTML = "";

  if (reportType === "overview") {
    // Calculate total hours for all projects
    const totalHours = data.reduce((sum, item) => sum + item.total_hours, 0);

    tableHTML += `
      <div class="mb-4">
        <h4 class="text-lg font-semibold mb-3">Project Breakdown</h4>
        <div class="space-y-3">
    `;

    data.forEach((item, index) => {
      const percentage =
        totalHours > 0 ? ((item.total_hours / totalHours) * 100).toFixed(1) : 0;
      const hours = Math.floor(item.total_hours);
      const minutes = Math.round((item.total_hours - hours) * 60);
      const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      // Color matching chart
      const colors = [
        { bg: "bg-purple-500", border: "border-purple-400" },
        { bg: "bg-emerald-500", border: "border-emerald-400" },
        { bg: "bg-red-500", border: "border-red-400" },
        { bg: "bg-blue-500", border: "border-blue-400" },
        { bg: "bg-amber-500", border: "border-amber-400" },
        { bg: "bg-pink-500", border: "border-pink-400" },
        { bg: "bg-cyan-500", border: "border-cyan-400" },
        { bg: "bg-green-500", border: "border-green-400" },
        { bg: "bg-orange-500", border: "border-orange-400" },
        { bg: "bg-indigo-500", border: "border-indigo-400" },
      ];

      const colorSet = colors[index % colors.length];

      tableHTML += `
        <div class="project-breakdown-item card p-6 hover:shadow-lg transition-all duration-300 border-l-4 ${colorSet.border}">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <div class="w-4 h-4 ${colorSet.bg} rounded-full mr-3"></div>
              <span class="font-semibold text-xl text-white">${item.project_name}</span>
            </div>
            <span class="text-2xl font-bold text-accent-purple time-display">${timeDisplay}</span>
          </div>
          <div class="flex items-center justify-between text-sm text-gray-400 mb-3">
            <span>${item.total_hours.toFixed(2)} hours total</span>
            <span>${percentage}% of total time</span>
          </div>
          <div class="progress-bar bg-dark-tertiary rounded-full h-3">
            <div class="progress-fill ${colorSet.bg} h-3 rounded-full transition-all duration-800" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    });

    tableHTML += `
        </div>
        <div class="card mt-6 p-6">
          <div class="flex justify-between items-center">
            <span class="text-lg font-semibold text-white">📊 Total Time Tracked:</span>
            <span class="text-3xl font-bold text-accent-purple time-display">${Math.floor(totalHours)}h ${Math.round((totalHours - Math.floor(totalHours)) * 60)}m</span>
          </div>
          <div class="text-sm text-gray-400 mt-2">
            Across ${data.length} project${data.length !== 1 ? "s" : ""} with consistent tracking
          </div>
        </div>
      </div>
    `;
  } else {
    // For other report types, use improved card format
    tableHTML += '<div class="space-y-4">';

    if (reportType === "daily") {
      data.forEach((item, index) => {
        const date = new Date(item.date);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let dateLabel;
        let dateIcon = "📅";
        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) {
          dateLabel = "Today";
          dateIcon = "🌟";
        } else if (isYesterday) {
          dateLabel = "Yesterday";
          dateIcon = "🌙";
        } else {
          const options = { weekday: "long", month: "short", day: "numeric" };
          dateLabel = date.toLocaleDateString("en-US", options);
        }

        const totalHours = item.total_hours.toFixed(1);
        const hours = Math.floor(item.total_hours);
        const minutes = Math.round((item.total_hours - hours) * 60);
        const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        tableHTML += `
          <div class="card p-6 border-l-4 border-accent-purple">
            <div class="flex justify-between items-center mb-4">
              <h4 class="text-lg font-semibold text-white flex items-center gap-2">
                ${dateIcon} ${dateLabel}
              </h4>
              <span class="text-2xl font-bold text-accent-purple time-display">${timeDisplay}</span>
            </div>
            <div class="space-y-2">
              ${item.projects
                .map(
                  (p) => `
                <div class="flex justify-between items-center bg-dark-tertiary p-3 rounded-lg">
                  <span class="text-white font-medium">${p.project_name}</span>
                  <span class="text-accent-purple font-semibold time-display">${p.hours.toFixed(1)}h</span>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        `;
      });
    } else if (reportType === "weekly") {
      data.forEach((item, index) => {
        const period = `${new Date(item.week_start).toLocaleDateString()} - ${new Date(item.week_end).toLocaleDateString()}`;
        const totalHours = item.total_hours.toFixed(1);
        const hours = Math.floor(item.total_hours);
        const minutes = Math.round((item.total_hours - hours) * 60);
        const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        tableHTML += `
          <div class="card p-6 border-l-4 border-accent-purple">
            <div class="flex justify-between items-center mb-4">
              <div>
                <h4 class="text-lg font-semibold text-white">📊 Week ${item.week_number}, ${item.year}</h4>
                <p class="text-sm text-gray-400">${period}</p>
              </div>
              <span class="text-2xl font-bold text-accent-purple time-display">${timeDisplay}</span>
            </div>
            <div class="space-y-2">
              ${item.projects
                .map(
                  (p) => `
                <div class="flex justify-between items-center bg-dark-tertiary p-3 rounded-lg">
                  <span class="text-white font-medium">${p.project_name}</span>
                  <span class="text-accent-purple font-semibold time-display">${p.hours.toFixed(1)}h</span>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        `;
      });
    } else if (reportType === "monthly") {
      data.forEach((item, index) => {
        const totalHours = item.total_hours.toFixed(1);
        const hours = Math.floor(item.total_hours);
        const minutes = Math.round((item.total_hours - hours) * 60);
        const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        tableHTML += `
          <div class="card p-6 border-l-4 border-accent-purple">
            <div class="flex justify-between items-center mb-4">
              <h4 class="text-lg font-semibold text-white flex items-center gap-2">
                🗓️ ${item.month} ${item.year}
              </h4>
              <span class="text-2xl font-bold text-accent-purple time-display">${timeDisplay}</span>
            </div>
            <div class="space-y-2">
              ${item.projects
                .map(
                  (p) => `
                <div class="flex justify-between items-center bg-dark-tertiary p-3 rounded-lg">
                  <span class="text-white font-medium">${p.project_name}</span>
                  <span class="text-accent-purple font-semibold time-display">${p.hours.toFixed(1)}h</span>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        `;
      });
    }

    tableHTML += "</div>";
  }

  tableContainer.innerHTML = tableHTML;
}

async function exportReport() {
  try {
    const reportType = document.getElementById("reportType").value;
    const projectFilter = document.getElementById("projectFilter").value;
    const limit = document.getElementById("reportLimit").value;

    const params = new URLSearchParams({
      type: reportType,
      limit: limit,
    });

    if (projectFilter) {
      params.append("project", projectFilter);
    }

    const res = await fetch(`/report?${params}`);
    const response = await res.json();

    // Convert data to CSV
    let csvContent = "";

    if (reportType === "overview") {
      csvContent = "Project,Total Hours\n";
      response.data.forEach((item) => {
        csvContent += `"${item.project_name}",${item.total_hours.toFixed(2)}\n`;
      });
    } else if (reportType === "daily") {
      csvContent = "Date,Projects,Total Hours\n";
      response.data.forEach((item) => {
        const projectsList = item.projects
          .map((p) => `${p.project_name} (${p.hours.toFixed(1)}h)`)
          .join("; ");
        csvContent += `"${item.date}","${projectsList}",${item.total_hours.toFixed(2)}\n`;
      });
    } else if (reportType === "weekly") {
      csvContent = "Week,Year,Period,Projects,Total Hours\n";
      response.data.forEach((item) => {
        const period = `${item.week_start} - ${item.week_end}`;
        const projectsList = item.projects
          .map((p) => `${p.project_name} (${p.hours.toFixed(1)}h)`)
          .join("; ");
        csvContent += `"Week ${item.week_number}",${item.year},"${period}","${projectsList}",${item.total_hours.toFixed(2)}\n`;
      });
    } else if (reportType === "monthly") {
      csvContent = "Month,Year,Projects,Total Hours\n";
      response.data.forEach((item) => {
        const projectsList = item.projects
          .map((p) => `${p.project_name} (${p.hours.toFixed(1)}h)`)
          .join("; ");
        csvContent += `"${item.month}",${item.year},"${projectsList}",${item.total_hours.toFixed(2)}\n`;
      });
    }

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timeo-${reportType}-report-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting report:", error);
    alert("Error exporting report: " + error.message);
  }
}

// ========== INITIALIZE ==========
document.addEventListener("DOMContentLoaded", () => {
  // Show home section by default
  showSection("home");

  // Setup timer buttons
  document.getElementById("start_btn").addEventListener("click", startTimer);
  document.getElementById("stop_btn").addEventListener("click", stopTimer);

  // Auto-refresh current active timer and recent timers every 30 seconds
  setInterval(() => {
    if (!document.getElementById("timer").classList.contains("hidden")) {
      loadCurrentActiveTimer();
      loadRecentTimers();
    }
    // Also refresh home and goals to update progress
    if (!document.getElementById("home").classList.contains("hidden")) {
      loadHomeData();
      loadLast7DaysData();
    }
    if (!document.getElementById("goals").classList.contains("hidden")) {
      loadGoalsList();
    }
  }, 30000);
});
