package routes

import (
	"timeo/handlers"

	"github.com/gofiber/fiber/v2"
)

func SetupRoutes(app *fiber.App) {
	app.Get("/", handlers.Home)

	// Projects routes
	app.Get("/projects", handlers.GetProjects)
	app.Post("/projects/add", handlers.AddProject)
	app.Delete("/projects/:id", handlers.DeleteProject)

	// Timer routes
	app.Post("/timer/start", handlers.StartTimer)
	app.Post("/timer/stop", handlers.StopTimer)
	app.Get("/timers/active", handlers.GetActiveTimers)
	app.Get("/timers/today", handlers.GetTodayTimers)
	app.Get("/timers/recent", handlers.GetRecentTimers)
	app.Delete("/timers/:id", handlers.DeleteTimer)

	// Goals routes
	app.Get("/goals", handlers.GetGoals)
	app.Post("/goals/add", handlers.AddGoal)
	app.Delete("/goals/:id", handlers.DeleteGoal)

	// Home routes
	app.Get("/api/home", handlers.GetHomeData)

	// Report routes
	app.Get("/report", handlers.GetReport)
	app.Get("/api/projects-list", handlers.GetProjectsList)
	app.Get("/api/time-range", handlers.GetTimeRange)
	app.Get("/api/last-7-days", handlers.GetLast7DaysData)
}
