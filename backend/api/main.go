package main

import (
	"log"
	"os"

	"github.com/cyrup/backend/api/handlers"
	"github.com/cyrup/backend/api/services"
	"github.com/cyrup/backend/internal/database"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize database
	if err := database.Initialize(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer database.Close()

	leanService := services.NewLeanHTTPService()

	// Optional: Check if lean runner is healthy
	if err := leanService.HealthCheck(); err != nil {
		log.Printf("Warning: Lean runner health check failed: %v", err)
		log.Printf("Continuing anyway - the lean runner might start later")
	}

	leanHandler := handlers.NewLeanHandler(leanService)

	r := gin.Default()

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000", "https://*.railway.app"}
	config.AllowMethods = []string{"GET", "POST", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept"}
	r.Use(cors.New(config))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})

	api := r.Group("/api")
	{
		// LEAN verification endpoints
		api.POST("/verify", leanHandler.VerifyProof)
		api.GET("/status/:id", leanHandler.GetStatus)
		api.GET("/result/:id", leanHandler.GetResult)
		
		// Submission endpoints
		api.POST("/submissions", handlers.CreateSubmission)
		api.GET("/submissions/:uid", handlers.GetSubmission)
		api.PUT("/submissions/:uid/status", handlers.UpdateSubmissionStatus)
		api.GET("/submissions/wallet/:wallet", handlers.GetUserSubmissions)
		api.GET("/submissions/challenge/:address", handlers.GetChallengeSubmissions)
		
		// Leaderboard endpoints
		api.GET("/leaderboard", handlers.GetLeaderboard)
		api.GET("/leaderboard/top", handlers.GetTopPerformers)
		api.GET("/leaderboard/user/:wallet", handlers.GetUserStats)
		api.POST("/leaderboard/events", handlers.RecordReputationEvent)
		api.GET("/leaderboard/events/recent", handlers.GetRecentEvents)
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}