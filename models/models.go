package models

import (
	"database/sql"

	_ "github.com/mattn/go-sqlite3"
)

// DB is the global database connection
var DB *sql.DB

// InitDB initializes the SQLite database and creates tables
func InitDB() error {
	var err error
	// Enable WAL mode for better concurrency and performance
	// Add connection pool settings and busy timeout
	DB, err = sql.Open("sqlite3", "./database/database.db?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return err
	}

	// Set connection pool settings
	// With WAL mode, SQLite can handle multiple concurrent readers
	// but only one writer at a time
	DB.SetMaxOpenConns(10) // Allow multiple concurrent reads
	DB.SetMaxIdleConns(5)
	DB.SetConnMaxLifetime(0) // Keep connections alive

	// Enable WAL mode explicitly
	_, err = DB.Exec("PRAGMA journal_mode=WAL")
	if err != nil {
		return err
	}

	// Set busy timeout to handle locked database
	_, err = DB.Exec("PRAGMA busy_timeout=5000")
	if err != nil {
		return err
	}

	// Enable foreign keys
	_, err = DB.Exec("PRAGMA foreign_keys=ON")
	if err != nil {
		return err
	}

	// Projects table
	_, err = DB.Exec(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
	)`)
	if err != nil {
		return err
	}

	// Timers table
	_, err = DB.Exec(`CREATE TABLE IF NOT EXISTS timers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        description TEXT,
        start_time DATETIME,
        end_time DATETIME,
        FOREIGN KEY(project_id) REFERENCES projects(id)
    )`)
	if err != nil {
		return err
	}

	// Goals table
	_, err = DB.Exec(`CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        target_minutes INTEGER,
        start_date DATETIME,
        FOREIGN KEY(project_id) REFERENCES projects(id)
    )`)
	if err != nil {
		return err
	}

	// Migrate target_hours to target_minutes if column exists
	_, err = DB.Exec(`ALTER TABLE goals ADD COLUMN target_minutes INTEGER`)
	if err != nil {
		// Column might already exist, ignore error
	}
	
	// Migrate existing data from hours to minutes
	_, err = DB.Exec(`UPDATE goals SET target_minutes = CAST(target_hours * 60 AS INTEGER) WHERE target_minutes IS NULL AND target_hours IS NOT NULL`)
	if err != nil {
		// Ignore migration errors
	}

	// Goal achievements table for tracking daily progress and streaks
	_, err = DB.Exec(`CREATE TABLE IF NOT EXISTS goal_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER,
        achievement_date DATE,
        minutes_achieved REAL,
        FOREIGN KEY(goal_id) REFERENCES goals(id),
        UNIQUE(goal_id, achievement_date)
    )`)
	return err
}
