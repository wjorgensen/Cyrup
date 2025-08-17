package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type LeanHTTPService struct {
	baseURL string
	client  *http.Client
}

type LeanVerifyRequest struct {
	Code    string `json:"code"`
	Timeout int    `json:"timeout"`
}

type LeanVerifyResponse struct {
	Status string `json:"status"`
	Output string `json:"output"`
	Error  string `json:"error"`
}

func NewLeanHTTPService() *LeanHTTPService {
	// Get the lean runner URL from environment or use default
	leanURL := os.Getenv("LEAN_RUNNER_URL")
	if leanURL == "" {
		// Default for local docker-compose
		leanURL = "http://lean-runner:8081"
	}

	return &LeanHTTPService{
		baseURL: leanURL,
		client: &http.Client{
			Timeout: 65 * time.Second, // Slightly longer than max proof timeout
		},
	}
}

func (s *LeanHTTPService) RunLeanProof(code string, timeout int) (string, error) {
	req := LeanVerifyRequest{
		Code:    code,
		Timeout: timeout,
	}

	jsonData, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := s.client.Post(
		s.baseURL+"/verify",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return "", fmt.Errorf("failed to call lean runner: %w", err)
	}
	defer resp.Body.Close()

	var result LeanVerifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	switch result.Status {
	case "success":
		return result.Output, nil
	case "timeout":
		return "", fmt.Errorf("timeout")
	default:
		return "", fmt.Errorf(result.Error)
	}
}

func (s *LeanHTTPService) HealthCheck() error {
	resp, err := s.client.Get(s.baseURL + "/health")
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("health check failed with status %d", resp.StatusCode)
	}
	
	return nil
}