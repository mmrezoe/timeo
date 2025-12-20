package handlers

import (
	"database/sql"
	"time"
	"timeo/models"

	"github.com/gofiber/fiber/v2"
)

type Goal struct {
	ID            int       `json:"id"`
	ProjectID     int       `json:"project_id"`
	ProjectName   string    `json:"project_name"`
	TargetMinutes int       `json:"target_minutes"`
	StartDate     time.Time `json:"start_date"`
	Streak        int       `json:"streak"`
	TodayProgress float64   `json:"today_progress"`
	TodayAchieved bool      `json:"today_achieved"`
}

func GetGoals(c *fiber.Ctx) error {
	// Force update today's progress synchronously for accurate data
	UpdateTodayProgress()

	rows, err := models.DB.Query(`
		SELECT g.id, g.project_id, p.name, g.target_minutes, g.start_date
		FROM goals g
		JOIN projects p ON g.project_id = p.id
		ORDER BY g.id DESC
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var goals []Goal
	today := time.Now().Format("2006-01-02")

	for rows.Next() {
		var g Goal
		var startDateStr string
		if err := rows.Scan(&g.ID, &g.ProjectID, &g.ProjectName, &g.TargetMinutes, &startDateStr); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		g.StartDate, _ = time.Parse("2006-01-02 15:04:05", startDateStr)

		// Get today's progress - ensure we have updated data
		var todayMinutes sql.NullFloat64
		err := models.DB.QueryRow(`
			SELECT minutes_achieved
			FROM goal_achievements
			WHERE goal_id = ? AND achievement_date = ?
		`, g.ID, today).Scan(&todayMinutes)

		if err == nil && todayMinutes.Valid {
			g.TodayProgress = todayMinutes.Float64
			g.TodayAchieved = todayMinutes.Float64 >= float64(g.TargetMinutes)
		}

		// Calculate streak
		g.Streak = calculateStreak(g.ID, g.TargetMinutes)

		goals = append(goals, g)
	}

	if err := rows.Err(); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(goals)
}

func calculateStreak(goalID int, targetMinutes int) int {
	today := time.Now().Format("2006-01-02")
	todayTime, _ := time.Parse("2006-01-02", today)

	// Check if today's goal is achieved first
	var todayMinutes float64
	err := models.DB.QueryRow(`
		SELECT COALESCE(minutes_achieved, 0)
		FROM goal_achievements
		WHERE goal_id = ? AND achievement_date = ?
	`, goalID, today).Scan(&todayMinutes)

	if err != nil || todayMinutes < float64(targetMinutes) {
		return 0 // Today not achieved, no streak
	}

	// Count consecutive achieved days backwards from today
	// We need to check that days are consecutive (no gaps)
	var streak int = 1 // Today is achieved, so streak starts at 1
	currentDate := todayTime

	for {
		// Move to previous day
		currentDate = currentDate.AddDate(0, 0, -1)
		dateStr := currentDate.Format("2006-01-02")

		var minutes float64
		err := models.DB.QueryRow(`
			SELECT COALESCE(minutes_achieved, 0)
			FROM goal_achievements
			WHERE goal_id = ? AND achievement_date = ?
		`, goalID, dateStr).Scan(&minutes)

		// If no record found for this date, streak is broken
		if err != nil {
			break
		}

		// If this day didn't achieve the goal, streak is broken
		if minutes < float64(targetMinutes) {
			break
		}

		streak++
	}

	return streak
}

func AddGoal(c *fiber.Ctx) error {
	type Request struct {
		ProjectID     int `json:"project_id"`
		TargetMinutes int `json:"target_minutes"`
	}

	var body Request
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	if body.TargetMinutes <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Target minutes must be greater than 0"})
	}

	res, err := models.DB.Exec(
		"INSERT INTO goals(project_id, target_minutes, start_date) VALUES (?, ?, ?)",
		body.ProjectID, body.TargetMinutes, time.Now(),
	)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	goalID, _ := res.LastInsertId()
	return c.JSON(fiber.Map{"status": "Goal added", "goal_id": goalID})
}

func DeleteGoal(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Goal ID is required"})
	}

	// Delete goal achievements first (cascade)
	_, err := models.DB.Exec("DELETE FROM goal_achievements WHERE goal_id = ?", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Delete goal
	_, err = models.DB.Exec("DELETE FROM goals WHERE id = ?", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "Goal deleted successfully"})
}

// UpdateTodayProgress updates today's progress for a goal based on timer data
func UpdateTodayProgress() error {
	// Use local date to match timer dates
	now := time.Now()
	today := now.Format("2006-01-02")

	// Get all goals
	rows, err := models.DB.Query("SELECT id, project_id, target_minutes FROM goals")
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var goalID, projectID, targetMinutes int
		if err := rows.Scan(&goalID, &projectID, &targetMinutes); err != nil {
			continue
		}

		// Calculate today's minutes for this project - use DATE function to match local dates
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

	return nil
}

func GetHomeData(c *fiber.Ctx) error {
	// Force update today's progress synchronously for accurate data
	UpdateTodayProgress()

	// Get goals with streak
	rows, err := models.DB.Query(`
		SELECT g.id, g.project_id, p.name, g.target_minutes, g.start_date
		FROM goals g
		JOIN projects p ON g.project_id = p.id
		ORDER BY g.id DESC
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var goals []Goal
	today := time.Now().Format("2006-01-02")

	for rows.Next() {
		var g Goal
		var startDateStr string
		if err := rows.Scan(&g.ID, &g.ProjectID, &g.ProjectName, &g.TargetMinutes, &startDateStr); err != nil {
			continue
		}

		g.StartDate, _ = time.Parse("2006-01-02 15:04:05", startDateStr)

		// Get today's progress - force refresh
		var todayMinutes sql.NullFloat64
		err := models.DB.QueryRow(`
			SELECT minutes_achieved
			FROM goal_achievements
			WHERE goal_id = ? AND achievement_date = ?
		`, g.ID, today).Scan(&todayMinutes)

		if err == nil && todayMinutes.Valid {
			g.TodayProgress = todayMinutes.Float64
			g.TodayAchieved = todayMinutes.Float64 >= float64(g.TargetMinutes)
		} else {
			// If no record found for today, progress is 0
			g.TodayProgress = 0.0
			g.TodayAchieved = false
		}

		// Calculate streak
		g.Streak = calculateStreak(g.ID, g.TargetMinutes)

		goals = append(goals, g)
	}

	return c.JSON(fiber.Map{
		"goals": goals,
		"date":  today,
	})
}
