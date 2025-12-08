package main

import (
	"log"
	"timeo/models"
	"timeo/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	app := fiber.New()

	app.Use(logger.New())

	// Initialize database
	if err := models.InitDB(); err != nil {
		log.Fatal(err)
	}

	// Setup routes
	routes.SetupRoutes(app)

	// Serve static files
	app.Static("/static", "./static")

	log.Println("Timeo is running on http://localhost:3000")
	log.Fatal(app.Listen(":3000"))
}
