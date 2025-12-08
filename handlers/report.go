package handlers

import (
	"database/sql"
	"strconv"
	"time"
	"timeo/models"

	"github.com/gofiber/fiber/v2"
)

type ReportItem struct {
	ProjectName string  `json:"project_name"`
	TotalHours  float64 `json:"total_hours"`
}

type DailyReportItem struct {
	Date       string             `json:"date"`
	Projects   []ProjectDayReport `json:"projects"`
	TotalHours float64            `json:"total_hours"`
}

type WeeklyReportItem struct {
	WeekStart  string             `json:"week_start"`
	WeekEnd    string             `json:"week_end"`
	WeekNumber int                `json:"week_number"`
	Year       int                `json:"year"`
	Projects   []ProjectDayReport `json:"projects"`
	TotalHours float64            `json:"total_hours"`
}

type MonthlyReportItem struct {
	Month      string             `json:"month"`
	Year       int                `json:"year"`
	Projects   []ProjectDayReport `json:"projects"`
	TotalHours float64            `json:"total_hours"`
}

type ProjectDayReport struct {
	ProjectName string  `json:"project_name"`
	Hours       float64 `json:"hours"`
}

func GetReport(c *fiber.Ctx) error {
	reportType := c.Query("type", "overview") // overview, daily, weekly, monthly
	limit := c.Query("limit", "30")           // limit for daily/weekly/monthly reports
	projectFilter := c.Query("project", "")   // filter by project

	limitInt, err := strconv.Atoi(limit)
	if err != nil {
		limitInt = 30
	}

	switch reportType {
	case "daily":
		return getDailyReport(c, limitInt, projectFilter)
	case "weekly":
		return getWeeklyReport(c, limitInt, projectFilter)
	case "monthly":
		return getMonthlyReport(c, limitInt, projectFilter)
	case "overview":
		fallthrough
	default:
		return getOverviewReport(c, projectFilter)
	}
}

func getOverviewReport(c *fiber.Ctx, projectFilter string) error {
	query := `
        SELECT p.name, SUM(
            (strftime('%s', t.end_time) - strftime('%s', t.start_time)) / 3600.0
        ) as total_hours
        FROM timers t
        JOIN projects p ON t.project_id = p.id
        WHERE t.end_time IS NOT NULL`

	args := []interface{}{}
	if projectFilter != "" {
		query += " AND p.name LIKE ?"
		args = append(args, "%"+projectFilter+"%")
	}

	query += " GROUP BY t.project_id ORDER BY total_hours DESC"

	rows, err := models.DB.Query(query, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var report []ReportItem
	var totalHours float64

	for rows.Next() {
		var item ReportItem
		if err := rows.Scan(&item.ProjectName, &item.TotalHours); err != nil {
			continue
		}
		report = append(report, item)
		totalHours += item.TotalHours
	}

	return c.JSON(fiber.Map{
		"type":        "overview",
		"data":        report,
		"total_hours": totalHours,
		"summary": fiber.Map{
			"total_projects": len(report),
			"total_hours":    totalHours,
		},
	})
}

func getDailyReport(c *fiber.Ctx, limit int, projectFilter string) error {
	query := `
        SELECT
            DATE(t.start_time) as date,
            p.name as project_name,
            SUM((strftime('%s', t.end_time) - strftime('%s', t.start_time)) / 3600.0) as hours
        FROM timers t
        JOIN projects p ON t.project_id = p.id
        WHERE t.end_time IS NOT NULL
        AND DATE(t.start_time) >= DATE('now', '-' || ? || ' days')`

	args := []interface{}{limit}
	if projectFilter != "" {
		query += " AND p.name LIKE ?"
		args = append(args, "%"+projectFilter+"%")
	}

	query += `
        GROUP BY DATE(t.start_time), t.project_id
        ORDER BY DATE(t.start_time) DESC, hours DESC`

	rows, err := models.DB.Query(query, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	dailyData := make(map[string]*DailyReportItem)
	var totalHours float64

	for rows.Next() {
		var date, projectName string
		var hours float64

		if err := rows.Scan(&date, &projectName, &hours); err != nil {
			continue
		}

		if dailyData[date] == nil {
			dailyData[date] = &DailyReportItem{
				Date:     date,
				Projects: []ProjectDayReport{},
			}
		}

		dailyData[date].Projects = append(dailyData[date].Projects, ProjectDayReport{
			ProjectName: projectName,
			Hours:       hours,
		})
		dailyData[date].TotalHours += hours
		totalHours += hours
	}

	// Convert map to slice
	var report []DailyReportItem
	for _, item := range dailyData {
		report = append(report, *item)
	}

	// Sort by date descending
	for i := 0; i < len(report)-1; i++ {
		for j := i + 1; j < len(report); j++ {
			if report[i].Date < report[j].Date {
				report[i], report[j] = report[j], report[i]
			}
		}
	}

	return c.JSON(fiber.Map{
		"type":        "daily",
		"data":        report,
		"total_hours": totalHours,
		"summary": fiber.Map{
			"total_days":  len(report),
			"total_hours": totalHours,
			"avg_per_day": func() float64 {
				if len(report) > 0 {
					return totalHours / float64(len(report))
				}
				return 0
			}(),
		},
	})
}

func getWeeklyReport(c *fiber.Ctx, limit int, projectFilter string) error {
	query := `
        SELECT
            strftime('%Y-%W', t.start_time) as week_year,
            DATE(t.start_time, 'weekday 0', '-6 days') as week_start,
            DATE(t.start_time, 'weekday 0') as week_end,
            p.name as project_name,
            SUM((strftime('%s', t.end_time) - strftime('%s', t.start_time)) / 3600.0) as hours
        FROM timers t
        JOIN projects p ON t.project_id = p.id
        WHERE t.end_time IS NOT NULL
        AND DATE(t.start_time) >= DATE('now', '-' || (? * 7) || ' days')`

	args := []interface{}{limit}
	if projectFilter != "" {
		query += " AND p.name LIKE ?"
		args = append(args, "%"+projectFilter+"%")
	}

	query += `
        GROUP BY strftime('%Y-%W', t.start_time), t.project_id
        ORDER BY strftime('%Y-%W', t.start_time) DESC, hours DESC`

	rows, err := models.DB.Query(query, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	weeklyData := make(map[string]*WeeklyReportItem)
	var totalHours float64

	for rows.Next() {
		var weekYear, weekStart, weekEnd, projectName string
		var hours float64

		if err := rows.Scan(&weekYear, &weekStart, &weekEnd, &projectName, &hours); err != nil {
			continue
		}

		if weeklyData[weekYear] == nil {
			// Parse week info
			startTime, _ := time.Parse("2006-01-02", weekStart)
			_, week := startTime.ISOWeek()

			weeklyData[weekYear] = &WeeklyReportItem{
				WeekStart:  weekStart,
				WeekEnd:    weekEnd,
				WeekNumber: week,
				Year:       startTime.Year(),
				Projects:   []ProjectDayReport{},
			}
		}

		weeklyData[weekYear].Projects = append(weeklyData[weekYear].Projects, ProjectDayReport{
			ProjectName: projectName,
			Hours:       hours,
		})
		weeklyData[weekYear].TotalHours += hours
		totalHours += hours
	}

	// Convert map to slice
	var report []WeeklyReportItem
	for _, item := range weeklyData {
		report = append(report, *item)
	}

	// Sort by week descending
	for i := 0; i < len(report)-1; i++ {
		for j := i + 1; j < len(report); j++ {
			date1, _ := time.Parse("2006-01-02", report[i].WeekStart)
			date2, _ := time.Parse("2006-01-02", report[j].WeekStart)
			if date1.Before(date2) {
				report[i], report[j] = report[j], report[i]
			}
		}
	}

	return c.JSON(fiber.Map{
		"type":        "weekly",
		"data":        report,
		"total_hours": totalHours,
		"summary": fiber.Map{
			"total_weeks": len(report),
			"total_hours": totalHours,
			"avg_per_week": func() float64 {
				if len(report) > 0 {
					return totalHours / float64(len(report))
				}
				return 0
			}(),
		},
	})
}

func getMonthlyReport(c *fiber.Ctx, limit int, projectFilter string) error {
	query := `
        SELECT
            strftime('%Y-%m', t.start_time) as month_year,
            strftime('%Y', t.start_time) as year,
            strftime('%m', t.start_time) as month,
            p.name as project_name,
            SUM((strftime('%s', t.end_time) - strftime('%s', t.start_time)) / 3600.0) as hours
        FROM timers t
        JOIN projects p ON t.project_id = p.id
        WHERE t.end_time IS NOT NULL
        AND DATE(t.start_time) >= DATE('now', '-' || (? * 30) || ' days')`

	args := []interface{}{limit}
	if projectFilter != "" {
		query += " AND p.name LIKE ?"
		args = append(args, "%"+projectFilter+"%")
	}

	query += `
        GROUP BY strftime('%Y-%m', t.start_time), t.project_id
        ORDER BY strftime('%Y-%m', t.start_time) DESC, hours DESC`

	rows, err := models.DB.Query(query, args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	monthlyData := make(map[string]*MonthlyReportItem)
	var totalHours float64

	monthNames := []string{
		"", "January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December",
	}

	for rows.Next() {
		var monthYear, yearStr, monthStr, projectName string
		var hours float64

		if err := rows.Scan(&monthYear, &yearStr, &monthStr, &projectName, &hours); err != nil {
			continue
		}

		if monthlyData[monthYear] == nil {
			year, _ := strconv.Atoi(yearStr)
			monthInt, _ := strconv.Atoi(monthStr)
			monthName := monthNames[monthInt]

			monthlyData[monthYear] = &MonthlyReportItem{
				Month:    monthName,
				Year:     year,
				Projects: []ProjectDayReport{},
			}
		}

		monthlyData[monthYear].Projects = append(monthlyData[monthYear].Projects, ProjectDayReport{
			ProjectName: projectName,
			Hours:       hours,
		})
		monthlyData[monthYear].TotalHours += hours
		totalHours += hours
	}

	// Convert map to slice
	var report []MonthlyReportItem
	for _, item := range monthlyData {
		report = append(report, *item)
	}

	// Sort by month descending
	for i := 0; i < len(report)-1; i++ {
		for j := i + 1; j < len(report); j++ {
			if report[i].Year < report[j].Year ||
				(report[i].Year == report[j].Year && getMonthNumber(report[i].Month) < getMonthNumber(report[j].Month)) {
				report[i], report[j] = report[j], report[i]
			}
		}
	}

	return c.JSON(fiber.Map{
		"type":        "monthly",
		"data":        report,
		"total_hours": totalHours,
		"summary": fiber.Map{
			"total_months": len(report),
			"total_hours":  totalHours,
			"avg_per_month": func() float64 {
				if len(report) > 0 {
					return totalHours / float64(len(report))
				}
				return 0
			}(),
		},
	})
}

func getMonthNumber(monthName string) int {
	months := map[string]int{
		"January": 1, "February": 2, "March": 3, "April": 4,
		"May": 5, "June": 6, "July": 7, "August": 8,
		"September": 9, "October": 10, "November": 11, "December": 12,
	}
	return months[monthName]
}

// GetProjectsList returns list of all projects for filtering
func GetProjectsList(c *fiber.Ctx) error {
	rows, err := models.DB.Query("SELECT DISTINCT name FROM projects ORDER BY name")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var projects []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			continue
		}
		projects = append(projects, name)
	}

	return c.JSON(projects)
}

// GetTimeRange returns the date range of available data
func GetTimeRange(c *fiber.Ctx) error {
	var minDate, maxDate sql.NullString

	err := models.DB.QueryRow(`
        SELECT
            MIN(DATE(start_time)) as min_date,
            MAX(DATE(start_time)) as max_date
        FROM timers
        WHERE end_time IS NOT NULL
    `).Scan(&minDate, &maxDate)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	result := fiber.Map{
		"min_date": nil,
		"max_date": nil,
	}

	if minDate.Valid {
		result["min_date"] = minDate.String
	}
	if maxDate.Valid {
		result["max_date"] = maxDate.String
	}

	return c.JSON(result)
}
