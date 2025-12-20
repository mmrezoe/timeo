package handlers

import (
	"database/sql"
	"time"
	"timeo/models"

	"github.com/gofiber/fiber/v2"
)

func Home(c *fiber.Ctx) error {
	return c.SendFile("./templates/index.html")
}

func StartTimer(c *fiber.Ctx) error {
	type Request struct {
		ProjectID   int    `json:"project_id"`
		Description string `json:"description"`
	}

	var body Request
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	res, err := models.DB.Exec(
		"INSERT INTO timers(project_id, description, start_time) VALUES (?, ?, ?)",
		body.ProjectID, body.Description, time.Now(),
	)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	id, _ := res.LastInsertId()
	return c.JSON(fiber.Map{"status": "Timer started", "timer_id": id})
}

func StopTimer(c *fiber.Ctx) error {
	type Request struct {
		TimerID int `json:"timer_id"`
	}

	var body Request
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request data"})
	}

	if body.TimerID <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid timer ID"})
	}

	// Check if timer exists and get its current state
	var endTime sql.NullString
	var projectID int
	err := models.DB.QueryRow("SELECT end_time, project_id FROM timers WHERE id = ?", body.TimerID).Scan(&endTime, &projectID)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{"error": "Timer not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	if endTime.Valid {
		// Timer already stopped - return success without error
		return c.JSON(fiber.Map{"status": "Timer already stopped"})
	}

	// Update the timer with end_time
	result, err := models.DB.Exec(
		"UPDATE timers SET end_time=? WHERE id=? AND end_time IS NULL",
		time.Now(), body.TimerID,
	)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to stop timer"})
	}

	// Check if the update actually affected any rows
	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		return c.JSON(fiber.Map{"status": "Timer already stopped"})
	}

	// Update goal progress after stopping timer - run in background to avoid blocking
	go func() {
		defer func() {
			if r := recover(); r != nil {
				// Log the error but don't affect the main response
			}
		}()
		updateGoalProgressForProject(projectID)
	}()

	return c.JSON(fiber.Map{"status": "Timer stopped"})
}

// updateGoalProgressForProject updates today's progress for goals of a specific project
func updateGoalProgressForProject(projectID int) {
	defer func() {
		if r := recover(); r != nil {
			// Silently handle any panics to prevent stopping the main timer operation
		}
	}()

	today := time.Now().Format("2006-01-02")

	// Get goals for this project only
	rows, err := models.DB.Query("SELECT id, target_minutes FROM goals WHERE project_id = ?", projectID)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var goalID, targetMinutes int
		if err := rows.Scan(&goalID, &targetMinutes); err != nil {
			continue
		}

		// Calculate today's minutes for this project with better precision
		var totalMinutes sql.NullFloat64
		err := models.DB.QueryRow(`
			SELECT COALESCE(SUM(
				CASE
					WHEN t.end_time IS NOT NULL THEN
						(strftime('%s', t.end_time) - strftime('%s', t.start_time)) / 60.0
					ELSE
						(strftime('%s', datetime('now', 'localtime')) - strftime('%s', t.start_time)) / 60.0
				END
			), 0) as total_minutes
			FROM timers t
			WHERE t.project_id = ? AND DATE(t.start_time, 'localtime') = DATE(?, 'localtime')
		`, projectID, today).Scan(&totalMinutes)

		if err != nil {
			continue
		}

		minutes := 0.0
		if totalMinutes.Valid {
			minutes = totalMinutes.Float64
		}

		// Insert or update today's achievement
		_, err = models.DB.Exec(`
			INSERT OR REPLACE INTO goal_achievements(goal_id, achievement_date, minutes_achieved)
			VALUES (?, ?, ?)
		`, goalID, today, minutes)
		if err != nil {
			continue
		}
	}
}

func GetActiveTimers(c *fiber.Ctx) error {
	rows, err := models.DB.Query(`
        SELECT t.id, p.name, t.description, t.start_time
        FROM timers t
        JOIN projects p ON t.project_id = p.id
        WHERE t.end_time IS NULL
    `)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var timers []map[string]interface{}
	for rows.Next() {
		var id int
		var project string
		var desc string
		var start string
		if err := rows.Scan(&id, &project, &desc, &start); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		timers = append(timers, map[string]interface{}{
			"id": id, "project": project, "description": desc, "start_time": start,
		})
	}

	if err := rows.Err(); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(timers)
}

func GetTodayTimers(c *fiber.Ctx) error {
	// Get current local date for comparison
	now := time.Now()
	todayStr := now.Format("2006-01-02")

	rows, err := models.DB.Query(`
        SELECT
            p.name as project_name,
            t.description,
            t.start_time,
            t.end_time,
            CASE
                WHEN t.end_time IS NOT NULL THEN
                    (strftime('%s', t.end_time) - strftime('%s', t.start_time)) / 3600.0
                ELSE
                    (strftime('%s', datetime('now', 'localtime')) - strftime('%s', t.start_time)) / 3600.0
            END as duration_hours
        FROM timers t
        JOIN projects p ON t.project_id = p.id
        WHERE DATE(t.start_time, 'localtime') = ?
        ORDER BY t.start_time DESC
    `, todayStr)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var timers []map[string]interface{}
	for rows.Next() {
		var projectName string
		var description sql.NullString
		var startTime string
		var endTime sql.NullString
		var durationHours float64

		if err := rows.Scan(&projectName, &description, &startTime, &endTime, &durationHours); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		timer := map[string]interface{}{
			"project_name":   projectName,
			"description":    description.String,
			"start_time":     startTime,
			"duration_hours": durationHours,
		}

		if endTime.Valid {
			timer["end_time"] = endTime.String
		} else {
			timer["end_time"] = nil
			timer["is_active"] = true
		}

		timers = append(timers, timer)
	}

	if err := rows.Err(); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Group by project and calculate total hours
	projectTotals := make(map[string]float64)
	projectDetails := make(map[string][]map[string]interface{})

	for _, timer := range timers {
		projectName := timer["project_name"].(string)
		duration := timer["duration_hours"].(float64)

		projectTotals[projectName] += duration
		projectDetails[projectName] = append(projectDetails[projectName], timer)
	}

	// Create response with grouped data
	var result []map[string]interface{}
	for projectName, totalHours := range projectTotals {
		result = append(result, map[string]interface{}{
			"project_name": projectName,
			"total_hours":  totalHours,
			"timers":       projectDetails[projectName],
		})
	}

	return c.JSON(result)
}

// GetLast7DaysData returns project data for the last 7 days
func GetLast7DaysData(c *fiber.Ctx) error {
	// Get current local date for 7-day calculation
	now := time.Now()
	sevenDaysAgoStr := now.AddDate(0, 0, -7).Format("2006-01-02")

	// Get timers for last 7 days
	rows, err := models.DB.Query(`
        SELECT
            DATE(t.start_time, 'localtime') as date,
            p.name as project_name,
            t.description,
            t.start_time,
            t.end_time,
            CASE
                WHEN t.end_time IS NOT NULL THEN
                    (strftime('%s', t.end_time) - strftime('%s', t.start_time)) / 3600.0
                ELSE
                    (strftime('%s', 'now', 'localtime') - strftime('%s', t.start_time)) / 3600.0
            END as duration_hours
        FROM timers t
        JOIN projects p ON t.project_id = p.id
        WHERE DATE(t.start_time, 'localtime') >= ?
        ORDER BY t.start_time DESC
    `, sevenDaysAgoStr)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	// Group data by date
	dateGroups := make(map[string]map[string]interface{})

	for rows.Next() {
		var date, projectName, description, startTime string
		var endTime sql.NullString
		var durationHours float64

		if err := rows.Scan(&date, &projectName, &description, &startTime, &endTime, &durationHours); err != nil {
			continue
		}

		if dateGroups[date] == nil {
			dateGroups[date] = make(map[string]interface{})
			dateGroups[date]["date"] = date
			dateGroups[date]["projects"] = make(map[string]map[string]interface{})
			dateGroups[date]["total_hours"] = 0.0
		}

		projects := dateGroups[date]["projects"].(map[string]map[string]interface{})

		if projects[projectName] == nil {
			projects[projectName] = make(map[string]interface{})
			projects[projectName]["project_name"] = projectName
			projects[projectName]["total_hours"] = 0.0
			projects[projectName]["timers"] = []map[string]interface{}{}
		}

		// Add timer to project
		timer := map[string]interface{}{
			"description":    description,
			"start_time":     startTime,
			"duration_hours": durationHours,
		}

		if endTime.Valid {
			timer["end_time"] = endTime.String
			timer["is_active"] = false
		} else {
			timer["end_time"] = nil
			timer["is_active"] = true
		}

		projectData := projects[projectName]
		projectData["total_hours"] = projectData["total_hours"].(float64) + durationHours
		timersList := projectData["timers"].([]map[string]interface{})
		projectData["timers"] = append(timersList, timer)

		// Update date total
		dateGroups[date]["total_hours"] = dateGroups[date]["total_hours"].(float64) + durationHours
	}

	// Convert to array format and sort by date
	var result []map[string]interface{}
	for dateKey := range dateGroups {
		dateData := dateGroups[dateKey]
		projectsMap := dateData["projects"].(map[string]map[string]interface{})

		var projects []map[string]interface{}
		for _, projectData := range projectsMap {
			projects = append(projects, projectData)
		}

		// Sort projects by total hours descending
		for i := 0; i < len(projects)-1; i++ {
			for j := i + 1; j < len(projects); j++ {
				if projects[i]["total_hours"].(float64) < projects[j]["total_hours"].(float64) {
					projects[i], projects[j] = projects[j], projects[i]
				}
			}
		}

		dateData["projects"] = projects
		result = append(result, dateData)
	}

	// Sort by date descending
	for i := 0; i < len(result)-1; i++ {
		for j := i + 1; j < len(result); j++ {
			date1, _ := time.Parse("2006-01-02", result[i]["date"].(string))
			date2, _ := time.Parse("2006-01-02", result[j]["date"].(string))
			if date1.Before(date2) {
				result[i], result[j] = result[j], result[i]
			}
		}
	}

	return c.JSON(result)
}

func DeleteTimer(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Timer ID is required"})
	}

	// Check if timer exists and is not active
	var endTime sql.NullString
	err := models.DB.QueryRow("SELECT end_time FROM timers WHERE id = ?", id).Scan(&endTime)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{"error": "Timer not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Don't allow deleting active timers
	if !endTime.Valid {
		return c.Status(400).JSON(fiber.Map{"error": "Cannot delete active timer. Please stop it first."})
	}

	// Delete timer
	_, err = models.DB.Exec("DELETE FROM timers WHERE id = ?", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "Timer deleted successfully"})
}

func UpdateTimer(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Timer ID is required"})
	}

	type Request struct {
		StartTime string `json:"start_time"`
		EndTime   string `json:"end_time"`
	}

	var body Request
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request data"})
	}

	// Parse the times
	startTime, err := time.Parse("2006-01-02T15:04", body.StartTime)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid start time format"})
	}

	endTime, err := time.Parse("2006-01-02T15:04", body.EndTime)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid end time format"})
	}

	// Validate that end time is after start time
	if !endTime.After(startTime) {
		return c.Status(400).JSON(fiber.Map{"error": "End time must be after start time"})
	}

	// Check if timer exists and is completed
	var currentEndTime sql.NullString
	var projectID int
	err = models.DB.QueryRow("SELECT end_time, project_id FROM timers WHERE id = ?", id).Scan(&currentEndTime, &projectID)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{"error": "Timer not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Don't allow editing active timers
	if !currentEndTime.Valid {
		return c.Status(400).JSON(fiber.Map{"error": "Cannot edit active timer. Please stop it first."})
	}

	// Update the timer
	// Note: SQLite stores timestamps as strings, so we format them properly
	// Use the parsed times directly - SQLite will handle them correctly
	_, err = models.DB.Exec(
		"UPDATE timers SET start_time = ?, end_time = ? WHERE id = ?",
		startTime.Format("2006-01-02 15:04:05"), endTime.Format("2006-01-02 15:04:05"), id,
	)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update timer: " + err.Error()})
	}

	// Update goal progress after editing timer - run in background
	go func() {
		defer func() {
			if r := recover(); r != nil {
				// Log the error but don't affect the main response
			}
		}()
		updateGoalProgressForProject(projectID)
	}()

	return c.JSON(fiber.Map{"status": "Timer updated successfully"})
}

func RestartTimer(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Timer ID is required"})
	}

	// Get timer details
	var projectID int
	var description sql.NullString
	var endTime sql.NullString
	err := models.DB.QueryRow("SELECT project_id, description, end_time FROM timers WHERE id = ?", id).Scan(&projectID, &description, &endTime)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{"error": "Timer not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	// Don't allow restarting active timers
	if !endTime.Valid {
		return c.Status(400).JSON(fiber.Map{"error": "Timer is already active"})
	}

	// Check if there's already an active timer
	var activeCount int
	err = models.DB.QueryRow("SELECT COUNT(*) FROM timers WHERE end_time IS NULL").Scan(&activeCount)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	if activeCount > 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Another timer is already running. Please stop it first."})
	}

	// Create new timer with same project and description
	res, err := models.DB.Exec(
		"INSERT INTO timers(project_id, description, start_time) VALUES (?, ?, ?)",
		projectID, description.String, time.Now(),
	)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to restart timer"})
	}

	newTimerID, _ := res.LastInsertId()
	return c.JSON(fiber.Map{"status": "Timer restarted successfully", "timer_id": newTimerID})
}

func GetRecentTimers(c *fiber.Ctx) error {
	// Get current local date for comparison
	now := time.Now()
	todayStr := now.Format("2006-01-02")

	// Query to get completed timers from today only (excluding active ones)
	rows, err := models.DB.Query(`
        SELECT
            t.id,
            p.name as project_name,
            t.description,
            t.start_time,
            t.end_time,
            (strftime('%s', t.end_time) - strftime('%s', t.start_time)) / 3600.0 as duration_hours
        FROM timers t
        JOIN projects p ON t.project_id = p.id
        WHERE DATE(t.start_time, 'localtime') = ?
        AND t.end_time IS NOT NULL
        ORDER BY t.start_time DESC
        LIMIT 50
    `, todayStr)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var timers []map[string]interface{}
	for rows.Next() {
		var timerID int
		var projectName string
		var description sql.NullString
		var startTime string
		var endTime sql.NullString
		var durationHours float64

		if err := rows.Scan(&timerID, &projectName, &description, &startTime, &endTime, &durationHours); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		timer := map[string]interface{}{
			"id":             timerID,
			"project_name":   projectName,
			"description":    description.String,
			"start_time":     startTime,
			"duration_hours": durationHours,
			"end_time":       endTime.String,
			"is_active":      false, // All timers here are completed
		}

		timers = append(timers, timer)
	}

	if err := rows.Err(); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Group by date and project for better organization
	dateGroups := make(map[string]map[string]interface{})

	for _, timer := range timers {
		startTimeStr := timer["start_time"].(string)

		// Simple date extraction from timestamp string
		// SQLite format: "2025-12-08 03:35:34.693046+03:30"
		var dateKey string
		if len(startTimeStr) >= 10 {
			dateKey = startTimeStr[:10] // Extract "2025-12-08"
		} else {
			continue // Skip malformed timestamps
		}

		// Only process timers from today
		if dateKey != todayStr {
			continue
		}

		if dateGroups[dateKey] == nil {
			dateGroups[dateKey] = make(map[string]interface{})
			dateGroups[dateKey]["date"] = dateKey
			dateGroups[dateKey]["projects"] = make(map[string]map[string]interface{})
		}

		projectName := timer["project_name"].(string)
		projects := dateGroups[dateKey]["projects"].(map[string]map[string]interface{})

		if projects[projectName] == nil {
			projects[projectName] = make(map[string]interface{})
			projects[projectName]["project_name"] = projectName
			projects[projectName]["total_hours"] = 0.0
			projects[projectName]["timers"] = []map[string]interface{}{}
		}

		projectData := projects[projectName]
		projectData["total_hours"] = projectData["total_hours"].(float64) + timer["duration_hours"].(float64)
		timersList := projectData["timers"].([]map[string]interface{})
		projectData["timers"] = append(timersList, timer)
	}

	// Convert to array format - should only have today's data
	var result []map[string]interface{}
	for dateKey := range dateGroups {
		dateData := dateGroups[dateKey]
		projectsMap := dateData["projects"].(map[string]map[string]interface{})

		var projects []map[string]interface{}
		for _, projectData := range projectsMap {
			// Sort timers within project by start time descending
			timers := projectData["timers"].([]map[string]interface{})
			for i := 0; i < len(timers)-1; i++ {
				for j := i + 1; j < len(timers); j++ {
					time1, _ := time.Parse("2006-01-02 15:04:05", timers[i]["start_time"].(string))
					time2, _ := time.Parse("2006-01-02 15:04:05", timers[j]["start_time"].(string))
					if time1.Before(time2) {
						timers[i], timers[j] = timers[j], timers[i]
					}
				}
			}
			projects = append(projects, projectData)
		}

		// Sort projects by total hours descending
		for i := 0; i < len(projects)-1; i++ {
			for j := i + 1; j < len(projects); j++ {
				if projects[i]["total_hours"].(float64) < projects[j]["total_hours"].(float64) {
					projects[i], projects[j] = projects[j], projects[i]
				}
			}
		}

		dateData["projects"] = projects
		result = append(result, dateData)
	}

	return c.JSON(result)
}
