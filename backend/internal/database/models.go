package database

import (
	"database/sql"
	"time"
)

type Submission struct {
	ID               int            `db:"id" json:"id"`
	UID              string         `db:"uid" json:"uid"`
	ChallengeAddress string         `db:"challenge_address" json:"challenge_address"`
	WalletAddress    string         `db:"wallet_address" json:"wallet_address"`
	SolutionCode     string         `db:"solution_code" json:"solution_code"`
	SolutionHash     sql.NullString `db:"solution_hash" json:"solution_hash,omitempty"`
	Status           string         `db:"status" json:"status"`
	CreatedAt        time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time      `db:"updated_at" json:"updated_at"`
}

type LeaderboardEntry struct {
	ID                 int       `db:"id" json:"id"`
	WalletAddress      string    `db:"wallet_address" json:"wallet_address"`
	ReputationScore    int       `db:"reputation_score" json:"reputation_score"`
	TotalUSDCWon       float64   `db:"total_usdc_won" json:"total_usdc_won"`
	ChallengesWon      int       `db:"challenges_won" json:"challenges_won"`
	ChallengesVerified int       `db:"challenges_verified" json:"challenges_verified"`
	LastUpdated        time.Time `db:"last_updated" json:"last_updated"`
}

type ReputationEvent struct {
	ID              int       `db:"id" json:"id"`
	WalletAddress   string    `db:"wallet_address" json:"wallet_address"`
	EventType       string    `db:"event_type" json:"event_type"`
	PointsAdded     int       `db:"points_added" json:"points_added"`
	TotalPoints     int       `db:"total_points" json:"total_points"`
	IsVerifier      bool      `db:"is_verifier" json:"is_verifier"`
	TransactionHash string    `db:"transaction_hash" json:"transaction_hash,omitempty"`
	BlockNumber     int64     `db:"block_number" json:"block_number,omitempty"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
}