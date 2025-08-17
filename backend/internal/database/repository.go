package database

import (
	"database/sql"
)

func CreateSubmission(submission *Submission) error {
	query := `
		INSERT INTO submissions (uid, challenge_address, wallet_address, solution_code, solution_hash, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`
	
	err := DB.QueryRow(
		query,
		submission.UID,
		submission.ChallengeAddress,
		submission.WalletAddress,
		submission.SolutionCode,
		submission.SolutionHash,
		submission.Status,
	).Scan(&submission.ID, &submission.CreatedAt, &submission.UpdatedAt)
	
	return err
}

func GetSubmissionByUID(uid string) (*Submission, error) {
	var submission Submission
	query := `SELECT * FROM submissions WHERE uid = $1`
	err := DB.Get(&submission, query, uid)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &submission, err
}

func UpdateSubmissionStatus(uid string, status string, solutionHash string) error {
	query := `
		UPDATE submissions 
		SET status = $2, solution_hash = $3, updated_at = CURRENT_TIMESTAMP
		WHERE uid = $1
	`
	_, err := DB.Exec(query, uid, status, solutionHash)
	return err
}

func GetLeaderboard(limit int, offset int) ([]LeaderboardEntry, error) {
	var entries []LeaderboardEntry
	query := `
		SELECT * FROM leaderboard 
		ORDER BY reputation_score DESC, total_usdc_won DESC
		LIMIT $1 OFFSET $2
	`
	err := DB.Select(&entries, query, limit, offset)
	return entries, err
}

func UpsertLeaderboardEntry(entry *LeaderboardEntry) error {
	query := `
		INSERT INTO leaderboard (wallet_address, reputation_score, total_usdc_won, challenges_won, challenges_verified)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (wallet_address) 
		DO UPDATE SET 
			reputation_score = $2,
			total_usdc_won = leaderboard.total_usdc_won + $3,
			challenges_won = leaderboard.challenges_won + $4,
			challenges_verified = leaderboard.challenges_verified + $5,
			last_updated = CURRENT_TIMESTAMP
		RETURNING id, last_updated
	`
	
	err := DB.QueryRow(
		query,
		entry.WalletAddress,
		entry.ReputationScore,
		entry.TotalUSDCWon,
		entry.ChallengesWon,
		entry.ChallengesVerified,
	).Scan(&entry.ID, &entry.LastUpdated)
	
	return err
}

func CreateReputationEvent(event *ReputationEvent) error {
	query := `
		INSERT INTO reputation_events (wallet_address, event_type, points_added, total_points, is_verifier, transaction_hash, block_number)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`
	
	err := DB.QueryRow(
		query,
		event.WalletAddress,
		event.EventType,
		event.PointsAdded,
		event.TotalPoints,
		event.IsVerifier,
		event.TransactionHash,
		event.BlockNumber,
	).Scan(&event.ID, &event.CreatedAt)
	
	return err
}

func GetUserStats(walletAddress string) (*LeaderboardEntry, error) {
	var entry LeaderboardEntry
	query := `SELECT * FROM leaderboard WHERE wallet_address = $1`
	err := DB.Get(&entry, query, walletAddress)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &entry, err
}

func GetSubmissionsByWallet(walletAddress string, limit int) ([]Submission, error) {
	var submissions []Submission
	query := `
		SELECT * FROM submissions 
		WHERE wallet_address = $1
		ORDER BY created_at DESC
		LIMIT $2
	`
	err := DB.Select(&submissions, query, walletAddress, limit)
	return submissions, err
}

func GetSubmissionsByChallenge(challengeAddress string) ([]Submission, error) {
	var submissions []Submission
	query := `
		SELECT * FROM submissions 
		WHERE challenge_address = $1
		ORDER BY created_at DESC
	`
	err := DB.Select(&submissions, query, challengeAddress)
	return submissions, err
}

func GetTopPerformers(limit int) ([]LeaderboardEntry, error) {
	if limit > 100 {
		limit = 100
	}
	return GetLeaderboard(limit, 0)
}

func UpdateLeaderboardFromEvent(walletAddress string, pointsAdded int, totalPoints int, isWinner bool, usdcAmount float64) error {
	var challengesWon, challengesVerified int
	if isWinner {
		challengesWon = 1
	} else {
		challengesVerified = 1
	}
	
	entry := &LeaderboardEntry{
		WalletAddress:      walletAddress,
		ReputationScore:    totalPoints,
		TotalUSDCWon:       usdcAmount,
		ChallengesWon:      challengesWon,
		ChallengesVerified: challengesVerified,
	}
	
	return UpsertLeaderboardEntry(entry)
}

func GetRecentReputationEvents(limit int) ([]ReputationEvent, error) {
	var events []ReputationEvent
	query := `
		SELECT * FROM reputation_events 
		ORDER BY created_at DESC
		LIMIT $1
	`
	err := DB.Select(&events, query, limit)
	return events, err
}

func GetLeaderboardPosition(walletAddress string) (int, error) {
	var position int
	query := `
		SELECT COUNT(*) + 1 as position
		FROM leaderboard
		WHERE reputation_score > (
			SELECT reputation_score 
			FROM leaderboard 
			WHERE wallet_address = $1
		)
	`
	err := DB.Get(&position, query, walletAddress)
	return position, err
}