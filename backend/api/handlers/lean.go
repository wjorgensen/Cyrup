package handlers

import (
	"net/http"
	"sync"
	"time"

	"github.com/cyrup/backend/api/models"
	"github.com/cyrup/backend/api/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type LeanHandler struct {
	leanService *services.LeanHTTPService
	results     map[string]*models.ProofResult
	mu          sync.RWMutex
}

func NewLeanHandler(leanService *services.LeanHTTPService) *LeanHandler {
	return &LeanHandler{
		leanService: leanService,
		results:     make(map[string]*models.ProofResult),
	}
}

func (h *LeanHandler) VerifyProof(c *gin.Context) {
	var req models.VerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id := uuid.New().String()
	
	timeout := 30
	if req.Timeout > 0 && req.Timeout <= 60000 {
		timeout = req.Timeout / 1000
	}

	result := &models.ProofResult{
		ID:        id,
		Status:    models.StatusQueued,
		CreatedAt: time.Now(),
	}

	h.mu.Lock()
	h.results[id] = result
	h.mu.Unlock()

	go h.processProof(id, req.Code, timeout)

	c.JSON(http.StatusAccepted, models.VerifyResponse{
		ID:     id,
		Status: models.StatusQueued,
	})
}

func (h *LeanHandler) processProof(id, code string, timeout int) {
	h.mu.Lock()
	if result, exists := h.results[id]; exists {
		result.Status = models.StatusProcessing
	}
	h.mu.Unlock()

	startTime := time.Now()
	
	output, err := h.leanService.RunLeanProof(code, timeout)
	
	executionTime := time.Since(startTime)
	completedAt := time.Now()

	h.mu.Lock()
	if result, exists := h.results[id]; exists {
		result.ExecutionTime = executionTime
		result.CompletedAt = &completedAt
		
		if err != nil {
			if err.Error() == "timeout" {
				result.Status = models.StatusTimeout
				result.Error = "Proof verification timed out"
			} else {
				result.Status = models.StatusError
				result.Error = err.Error()
			}
		} else {
			result.Status = models.StatusSuccess
			result.Output = output
		}
	}
	h.mu.Unlock()
}

func (h *LeanHandler) GetStatus(c *gin.Context) {
	id := c.Param("id")
	
	h.mu.RLock()
	result, exists := h.results[id]
	h.mu.RUnlock()
	
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Proof not found"})
		return
	}
	
	c.JSON(http.StatusOK, models.StatusResponse{
		ID:     result.ID,
		Status: result.Status,
	})
}

func (h *LeanHandler) GetResult(c *gin.Context) {
	id := c.Param("id")
	
	h.mu.RLock()
	result, exists := h.results[id]
	h.mu.RUnlock()
	
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Proof not found"})
		return
	}
	
	c.JSON(http.StatusOK, result)
}