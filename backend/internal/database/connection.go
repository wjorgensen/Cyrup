package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

var DB *sqlx.DB

func Initialize() error {
	// First try DATABASE_URL (Railway's standard)
	connStr := os.Getenv("DATABASE_URL")
	
	// If DATABASE_URL is not set, build from individual components
	if connStr == "" {
		dbHost := os.Getenv("DB_HOST")
		if dbHost == "" {
			dbHost = "postgres"
		}
		
		dbPort := os.Getenv("DB_PORT")
		if dbPort == "" {
			dbPort = "5432"
		}
		
		dbUser := os.Getenv("DB_USER")
		if dbUser == "" {
			dbUser = "cyrup"
		}
		
		dbPassword := os.Getenv("DB_PASSWORD")
		if dbPassword == "" {
			dbPassword = "cyrup_password"
		}
		
		dbName := os.Getenv("DB_NAME")
		if dbName == "" {
			dbName = "cyrup_db"
		}

		connStr = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			dbHost, dbPort, dbUser, dbPassword, dbName)
	}

	var err error
	DB, err = sqlx.Connect("postgres", connStr)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)
	DB.SetConnMaxLifetime(5 * time.Minute)

	if err := createTables(); err != nil {
		return fmt.Errorf("failed to create tables: %w", err)
	}

	log.Println("Database connection established successfully")
	return nil
}

func createTables() error {
	schema := `
	CREATE TABLE IF NOT EXISTS submissions (
		id SERIAL PRIMARY KEY,
		uid VARCHAR(255) UNIQUE NOT NULL,
		challenge_address VARCHAR(42) NOT NULL,
		wallet_address VARCHAR(42) NOT NULL,
		solution_code TEXT NOT NULL,
		solution_hash VARCHAR(255),
		status VARCHAR(50) DEFAULT 'pending',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_submissions_uid ON submissions(uid);
	CREATE INDEX IF NOT EXISTS idx_submissions_wallet ON submissions(wallet_address);
	CREATE INDEX IF NOT EXISTS idx_submissions_challenge ON submissions(challenge_address);

	CREATE TABLE IF NOT EXISTS leaderboard (
		id SERIAL PRIMARY KEY,
		wallet_address VARCHAR(42) UNIQUE NOT NULL,
		reputation_score INTEGER DEFAULT 0,
		total_usdc_won DECIMAL(20, 6) DEFAULT 0,
		challenges_won INTEGER DEFAULT 0,
		challenges_verified INTEGER DEFAULT 0,
		last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_leaderboard_reputation ON leaderboard(reputation_score DESC);
	CREATE INDEX IF NOT EXISTS idx_leaderboard_wallet ON leaderboard(wallet_address);

	CREATE TABLE IF NOT EXISTS reputation_events (
		id SERIAL PRIMARY KEY,
		wallet_address VARCHAR(42) NOT NULL,
		event_type VARCHAR(50) NOT NULL,
		points_added INTEGER NOT NULL,
		total_points INTEGER NOT NULL,
		is_verifier BOOLEAN DEFAULT FALSE,
		transaction_hash VARCHAR(66),
		block_number BIGINT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_reputation_events_wallet ON reputation_events(wallet_address);
	CREATE INDEX IF NOT EXISTS idx_reputation_events_block ON reputation_events(block_number);
	`

	_, err := DB.Exec(schema)
	return err
}

func Close() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}