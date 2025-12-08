package handlers

import (
	"strings"
	"timeo/models"

	"github.com/gofiber/fiber/v2"
)

func GetProjects(c *fiber.Ctx) error {
	rows, err := models.DB.Query("SELECT id, name FROM projects")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var projects []map[string]interface{}
	for rows.Next() {
		var id int
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		projects = append(projects, map[string]interface{}{"id": id, "name": name})
	}

	// Check for errors from iterating over rows
	if err := rows.Err(); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Return empty array if no projects
	if projects == nil {
		projects = []map[string]interface{}{}
	}

	return c.JSON(projects)
}

func AddProject(c *fiber.Ctx) error {
	type Request struct {
		Name string `json:"name"`
	}

	var body Request
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	body.Name = strings.TrimSpace(body.Name)
	if body.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Project name is required"})
	}

	_, err := models.DB.Exec("INSERT INTO projects(name) VALUES (?)", body.Name)
	if err != nil {
		// Check if it's a unique constraint violation
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return c.Status(400).JSON(fiber.Map{"error": "Project name already exists"})
		}
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "Project added successfully"})
}

func DeleteProject(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Project ID is required"})
	}

	_, err := models.DB.Exec("DELETE FROM projects WHERE id = ?", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "Project deleted successfully"})
}
