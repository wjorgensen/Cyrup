package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/cyrup/backend/internal/database"
	"github.com/gin-gonic/gin"
)

type SubmissionRequest struct {
	UID              string `json:"uid" binding:"required"`
	ChallengeAddress string `json:"challenge_address" binding:"required"`
	WalletAddress    string `json:"wallet_address" binding:"required"`
	SolutionCode     string `json:"solution_code" binding:"required"`
	SolutionHash     string `json:"solution_hash,omitempty"`
}

func CreateSubmission(c *gin.Context) {
	var req SubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	submission := &database.Submission{
		UID:              req.UID,
		ChallengeAddress: req.ChallengeAddress,
		WalletAddress:    req.WalletAddress,
		SolutionCode:     req.SolutionCode,
		Status:           "pending",
	}

	if req.SolutionHash != "" {
		submission.SolutionHash = sql.NullString{String: req.SolutionHash, Valid: true}
	}

	if err := database.CreateSubmission(submission); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create submission"})
		return
	}

	c.JSON(http.StatusCreated, submission)
}

func GetSubmission(c *gin.Context) {
	uid := c.Param("uid")
	
	submission, err := database.GetSubmissionByUID(uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch submission"})
		return
	}
	
	if submission == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}

	c.JSON(http.StatusOK, submission)
}

func UpdateSubmissionStatus(c *gin.Context) {
	uid := c.Param("uid")
	
	var req struct {
		Status       string `json:"status" binding:"required"`
		SolutionHash string `json:"solution_hash,omitempty"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.UpdateSubmissionStatus(uid, req.Status, req.SolutionHash); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update submission"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Submission updated successfully"})
}

func GetUserSubmissions(c *gin.Context) {
	walletAddress := c.Param("wallet")
	limitStr := c.DefaultQuery("limit", "10")
	
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}

	submissions, err := database.GetSubmissionsByWallet(walletAddress, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch submissions"})
		return
	}

	c.JSON(http.StatusOK, submissions)
}

func GetChallengeSubmissions(c *gin.Context) {
	challengeAddress := c.Param("address")
	
	submissions, err := database.GetSubmissionsByChallenge(challengeAddress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch submissions"})
		return
	}

	c.JSON(http.StatusOK, submissions)
}