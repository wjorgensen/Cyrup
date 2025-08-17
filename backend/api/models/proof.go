package models

import (
	"time"
)

type ProofStatus string

const (
	StatusQueued     ProofStatus = "queued"
	StatusProcessing ProofStatus = "processing"
	StatusSuccess    ProofStatus = "success"
	StatusError      ProofStatus = "error"
	StatusTimeout    ProofStatus = "timeout"
)

type VerifyRequest struct {
	Code    string `json:"code" binding:"required"`
	Timeout int    `json:"timeout,omitempty"`
}

type VerifyResponse struct {
	ID     string      `json:"id"`
	Status ProofStatus `json:"status"`
}

type ProofResult struct {
	ID            string        `json:"id"`
	Status        ProofStatus   `json:"status"`
	Output        string        `json:"output,omitempty"`
	Error         string        `json:"error,omitempty"`
	ExecutionTime time.Duration `json:"executionTime,omitempty"`
	CreatedAt     time.Time     `json:"createdAt"`
	CompletedAt   *time.Time    `json:"completedAt,omitempty"`
}

type StatusResponse struct {
	ID     string      `json:"id"`
	Status ProofStatus `json:"status"`
}