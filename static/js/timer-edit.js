// Timer editing functionality
let currentEditingTimerId = null;

// Show edit timer modal
function showEditTimerModal(timerId, projectName, description, startTime, endTime) {
    currentEditingTimerId = timerId;

    // Populate modal fields
    document.getElementById('editTimerProject').textContent = projectName;
    document.getElementById('editTimerDescription').textContent = description || 'No description';

    // Convert timestamps to datetime-local format
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // Format for datetime-local input (YYYY-MM-DDTHH:MM)
    const formatDateTimeLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    document.getElementById('editStartTime').value = formatDateTimeLocal(startDate);
    document.getElementById('editEndTime').value = formatDateTimeLocal(endDate);

    // Calculate and display duration
    const durationMs = endDate - startDate;
    const durationHours = durationMs / (1000 * 60 * 60);
    const hours = Math.floor(durationHours);
    const minutes = Math.round((durationHours - hours) * 60);
    
    let durationDisplay = '';
    if (hours > 0 && minutes > 0) {
        durationDisplay = `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
        durationDisplay = `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
        durationDisplay = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    // Update duration display if element exists, otherwise add it
    let durationElement = document.getElementById('editTimerDuration');
    if (!durationElement) {
        // Create duration display element
        const descriptionDiv = document.getElementById('editTimerDescription').parentElement;
        durationElement = document.createElement('div');
        durationElement.id = 'editTimerDuration';
        durationElement.className = 'mt-2';
        descriptionDiv.appendChild(durationElement);
    }
    durationElement.innerHTML = `
        <label class="block text-sm font-medium text-gray-300 mb-2">Duration</label>
        <div class="text-white bg-dark-tertiary rounded-lg px-4 py-3 border border-gray-600">
            <span class="text-accent-purple font-semibold">${durationDisplay}</span>
            <span class="text-gray-400 text-sm ml-2">(${(durationHours).toFixed(2)} hours)</span>
        </div>
    `;

    // Add event listeners to update duration when times change
    const updateDuration = () => {
        const startInput = document.getElementById('editStartTime');
        const endInput = document.getElementById('editEndTime');
        if (startInput.value && endInput.value) {
            const newStart = new Date(startInput.value);
            const newEnd = new Date(endInput.value);
            const newDurationMs = newEnd - newStart;
            const newDurationHours = newDurationMs / (1000 * 60 * 60);
            const newHours = Math.floor(newDurationHours);
            const newMinutes = Math.round((newDurationHours - newHours) * 60);
            
            let newDurationDisplay = '';
            if (newHours > 0 && newMinutes > 0) {
                newDurationDisplay = `${newHours} hour${newHours !== 1 ? 's' : ''} ${newMinutes} minute${newMinutes !== 1 ? 's' : ''}`;
            } else if (newHours > 0) {
                newDurationDisplay = `${newHours} hour${newHours !== 1 ? 's' : ''}`;
            } else {
                newDurationDisplay = `${newMinutes} minute${newMinutes !== 1 ? 's' : ''}`;
            }
            
            durationElement.querySelector('.text-accent-purple').textContent = newDurationDisplay;
            durationElement.querySelector('.text-gray-400').textContent = `(${(newDurationHours).toFixed(2)} hours)`;
        }
    };

    // Remove old listeners if any
    const startInput = document.getElementById('editStartTime');
    const endInput = document.getElementById('editEndTime');
    startInput.removeEventListener('change', updateDuration);
    endInput.removeEventListener('change', updateDuration);
    
    // Add new listeners
    startInput.addEventListener('change', updateDuration);
    endInput.addEventListener('change', updateDuration);

    // Show modal
    document.getElementById('editTimerModal').classList.remove('hidden');
}

// Close edit timer modal
function closeEditTimerModal() {
    document.getElementById('editTimerModal').classList.add('hidden');
    currentEditingTimerId = null;
    
    // Re-enable save button if it was disabled
    const saveBtn = document.querySelector('#editTimerModal button[onclick="saveTimerChanges()"]');
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
}

// Save timer changes
async function saveTimerChanges() {
    if (!currentEditingTimerId) return;

    const startTime = document.getElementById('editStartTime').value;
    const endTime = document.getElementById('editEndTime').value;

    if (!startTime || !endTime) {
        alert('Please fill in both start and end times');
        return;
    }

    // Validate that end time is after start time
    if (new Date(endTime) <= new Date(startTime)) {
        alert('End time must be after start time');
        return;
    }

    // Disable save button to prevent double submission
    const saveBtn = document.querySelector('#editTimerModal button[onclick="saveTimerChanges()"]');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
    }

    try {
        const res = await fetch(`/timers/${currentEditingTimerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                start_time: startTime,
                end_time: endTime
            })
        });

        const data = await res.json();

        if (res.ok) {
            // Show success message first
            alert('Timer updated successfully!');
            
            // Close modal
            closeEditTimerModal();
            
            // Clear container first to prevent showing stale data
            const container = document.getElementById("recent_timers");
            if (container) {
                container.innerHTML = '<div class="text-center py-4"><div class="text-gray-500">Refreshing...</div></div>';
            }
            
            // Wait a bit longer for backend to fully process, then refresh
            setTimeout(() => {
                loadRecentTimers();
                loadHomeData();
                loadLast7DaysData();
            }, 800);
        } else {
            const errorMsg = data.error || 'Unknown error';
            console.error('Timer update error:', errorMsg);
            alert('Error updating timer: ' + errorMsg);
            // Re-enable button on error
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
            }
        }
    } catch (error) {
        console.error('Error updating timer:', error);
        alert('Error updating timer. Please try again.');
        // Re-enable button on error
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }
}

// Restart a timer
async function restartTimer(timerId) {
    if (currentTimerId) {
        alert('Please stop the current timer before starting a new one');
        return;
    }

    try {
        const res = await fetch(`/timers/${timerId}/restart`, {
            method: 'POST'
        });

        const data = await res.json();

        if (res.ok) {
            // Switch to timer section and refresh displays
            showSection('timer');
            setTimeout(() => {
                loadCurrentActiveTimer();
                loadRecentTimers();
            }, 100);
            alert('Timer restarted successfully!');
        } else {
            alert('Error restarting timer: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error restarting timer:', error);
        alert('Error restarting timer. Please try again.');
    }
}

// Enhanced loadRecentTimers function with "No timers" message and edit buttons
async function loadRecentTimersWithEdit() {
    try {
        const container = document.getElementById("recent_timers");
        if (!container) return;

        container.innerHTML = "";

        // Load completed timers only (excluding active ones)
        const res = await fetch("/timers/recent");
        if (!res.ok) {
            console.error("Error loading recent timers:", res.status);
            return;
        }

        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-gray-500 mb-4 text-6xl">⏱️</div>
                    <p class="text-xl text-gray-300 mb-2">No timers in the last 7 days</p>
                    <p class="text-gray-500 text-sm">Start tracking your time to see your progress here!</p>
                </div>
            `;
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

        if (completedData.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-gray-500 mb-4 text-6xl">⏱️</div>
                    <p class="text-xl text-gray-300 mb-2">No completed timers in the last 7 days</p>
                    <p class="text-gray-500 text-sm">Complete a timer session to see your progress here!</p>
                </div>
            `;
            return;
        }

        completedData.forEach((dateGroup) => {
            const dateDiv = document.createElement("div");
            dateDiv.className = "mb-6";

            const date = new Date(dateGroup.date);
            const options = {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
            };
            const dateStr = date.toLocaleDateString("en-US", options);
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

            let dateLabel = dateStr;
            let dateIcon = "📅";
            const isToday = date.toDateString() === today;
            const isYesterday = date.toDateString() === yesterday;

            if (isToday) {
                dateLabel = "Today";
                dateIcon = "🌟";
            } else if (isYesterday) {
                dateLabel = "Yesterday";
                dateIcon = "🕐";
            }

            dateDiv.innerHTML = `
                <h4 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>${dateIcon}</span>
                    ${dateLabel}
                    ${!isToday && !isYesterday ? `<span class="text-sm text-gray-500 ml-2">${dateStr}</span>` : ""}
                </h4>
            `;

            const projectsContainer = document.createElement("div");
            projectsContainer.className = "space-y-4";

            dateGroup.projects.forEach((project) => {
                const projectDiv = document.createElement("div");
                projectDiv.className = "bg-dark-tertiary rounded-lg p-4 border border-gray-600";

                const totalHours = project.total_hours || 0;
                const hours = Math.floor(totalHours);
                const minutes = Math.round((totalHours - hours) * 60);
                let timeDisplay = "";

                if (hours > 0 && minutes > 0) {
                    timeDisplay = `${hours}h ${minutes}m`;
                } else if (hours > 0) {
                    timeDisplay = `${hours}h`;
                } else {
                    timeDisplay = `${minutes}m`;
                }

                projectDiv.innerHTML = `
                    <div class="flex justify-between items-center mb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">📁</span>
                            <h5 class="font-semibold text-white">${project.project_name}</h5>
                        </div>
                        <div class="text-accent-purple font-bold">
                            ${timeDisplay}
                        </div>
                    </div>
                `;

                const timersList = document.createElement("div");
                timersList.className = "space-y-2 mt-3";

                project.timers.forEach((timer) => {
                    const timerItem = document.createElement("div");
                    timerItem.className =
                        "flex justify-between items-center p-3 bg-dark-secondary rounded border border-gray-700 hover:border-gray-600 transition-colors";

                    const timerHours = timer.duration_hours || 0;
                    const tHours = Math.floor(timerHours);
                    const tMinutes = Math.round((timerHours - tHours) * 60);
                    let timerTimeDisplay = "";

                    if (tHours > 0 && tMinutes > 0) {
                        timerTimeDisplay = `${tHours}h ${tMinutes}m`;
                    } else if (tHours > 0) {
                        timerTimeDisplay = `${tHours}h`;
                    } else {
                        timerTimeDisplay = `${tMinutes}m`;
                    }

                    const startTime = new Date(timer.start_time).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                    });

                    let endTimeText = "";
                    if (timer.end_time) {
                        const endTime = new Date(timer.end_time).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                        });
                        endTimeText = `${startTime} - ${endTime}`;
                    }

                    timerItem.innerHTML = `
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-xs text-gray-400">⏱️ ${timerTimeDisplay}</span>
                                <span class="text-xs text-gray-500">${endTimeText}</span>
                            </div>
                            ${timer.description ? `<div class="text-sm text-gray-300">${timer.description}</div>` : '<div class="text-sm text-gray-500 italic">No description</div>'}
                        </div>
                        <div class="flex gap-2 ml-4">
                            <button
                                onclick="showEditTimerModal(${timer.id}, '${project.project_name}', '${timer.description || ''}', '${timer.start_time}', '${timer.end_time}')"
                                class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                                title="Edit Timer"
                            >
                                ✏️ Edit
                            </button>
                            <button
                                onclick="restartTimer(${timer.id})"
                                class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
                                title="Restart Timer"
                            >
                                ▶️ Restart
                            </button>
                            <button
                                onclick="deleteTimer(${timer.id})"
                                class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
                                title="Delete Timer"
                            >
                                🗑️
                            </button>
                        </div>
                    `;

                    timersList.appendChild(timerItem);
                });

                projectDiv.appendChild(timersList);
                projectsContainer.appendChild(projectDiv);
            });

            dateDiv.appendChild(projectsContainer);
            container.appendChild(dateDiv);
        });
    } catch (error) {
        console.error("Error loading recent timers:", error);
        const container = document.getElementById("recent_timers");
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-red-500 mb-4 text-4xl">⚠️</div>
                    <p class="text-red-400">Error loading timers</p>
                    <p class="text-gray-500 text-sm mt-2">Please try refreshing the page</p>
                </div>
            `;
        }
    }
}

// Initialize page to correct section on load
function initializePageSection() {
    const currentSection = getCurrentSection();
    showSection(currentSection);
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('editTimerModal');
    if (event.target === modal) {
        closeEditTimerModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeEditTimerModal();
    }
});
