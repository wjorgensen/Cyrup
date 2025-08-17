package handlers

import (
	"net/http"
	"strconv"

	"github.com/cyrup/backend/internal/database"
	"github.com/gin-gonic/gin"
)

func GetLeaderboard(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")
	
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	entries, err := database.GetLeaderboard(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch leaderboard"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"leaderboard": entries,
		"limit":       limit,
		"offset":      offset,
	})
}

func GetUserStats(c *gin.Context) {
	walletAddress := c.Param("wallet")
	
	stats, err := database.GetUserStats(walletAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user stats"})
		return
	}
	
	if stats == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	position, err := database.GetLeaderboardPosition(walletAddress)
	if err != nil {
		position = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"stats":    stats,
		"position": position,
	})
}

func GetTopPerformers(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}

	performers, err := database.GetTopPerformers(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch top performers"})
		return
	}

	c.JSON(http.StatusOK, performers)
}

type ReputationEventRequest struct {
	WalletAddress   string  `json:"wallet_address" binding:"required"`
	PointsAdded     int     `json:"points_added" binding:"required"`
	TotalPoints     int     `json:"total_points" binding:"required"`
	IsVerifier      bool    `json:"is_verifier"`
	USDCAmount      float64 `json:"usdc_amount,omitempty"`
	TransactionHash string  `json:"transaction_hash,omitempty"`
	BlockNumber     int64   `json:"block_number,omitempty"`
}

func RecordReputationEvent(c *gin.Context) {
	var req ReputationEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	event := &database.ReputationEvent{
		WalletAddress:   req.WalletAddress,
		EventType:       "reputation_update",
		PointsAdded:     req.PointsAdded,
		TotalPoints:     req.TotalPoints,
		IsVerifier:      req.IsVerifier,
		TransactionHash: req.TransactionHash,
		BlockNumber:     req.BlockNumber,
	}

	if err := database.CreateReputationEvent(event); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record reputation event"})
		return
	}

	isWinner := !req.IsVerifier
	if err := database.UpdateLeaderboardFromEvent(
		req.WalletAddress,
		req.PointsAdded,
		req.TotalPoints,
		isWinner,
		req.USDCAmount,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update leaderboard"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Reputation event recorded successfully",
		"event":   event,
	})
}

func GetRecentEvents(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "20")
	
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	events, err := database.GetRecentReputationEvents(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch recent events"})
		return
	}

	c.JSON(http.StatusOK, events)
}