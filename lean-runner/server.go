package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"
)

type VerifyRequest struct {
	Code    string `json:"code"`
	Timeout int    `json:"timeout"`
}

type VerifyResponse struct {
	Status string `json:"status"`
	Output string `json:"output"`
	Error  string `json:"error"`
}

func verifyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req VerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Default timeout 30 seconds
	timeout := 30
	if req.Timeout > 0 && req.Timeout <= 60 {
		timeout = req.Timeout
	}

	// Create temporary file for the proof
	tmpFile, err := os.CreateTemp("/tmp", "proof_*.lean")
	if err != nil {
		respondWithError(w, "Failed to create temp file", err.Error())
		return
	}
	defer os.Remove(tmpFile.Name())

	// Write code to temp file
	if _, err := tmpFile.WriteString(req.Code); err != nil {
		respondWithError(w, "Failed to write proof", err.Error())
		return
	}
	tmpFile.Close()

	// Run lean with timeout
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeout)*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "lean", tmpFile.Name())
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	
	// Process results
	if ctx.Err() == context.DeadlineExceeded {
		respondWithError(w, "timeout", fmt.Sprintf("Proof verification timed out after %d seconds", timeout))
		return
	}

	output := stdout.String()
	errOutput := stderr.String()
	
	if err != nil {
		// Check if there are compilation/verification errors
		if errOutput != "" {
			respondWithError(w, "error", errOutput)
		} else if output != "" && strings.Contains(output, "error") {
			respondWithError(w, "error", output)
		} else {
			respondWithError(w, "error", fmt.Sprintf("Verification failed: %v", err))
		}
		return
	}

	// Success - check for any error messages in output
	if strings.Contains(output, "error") || strings.Contains(errOutput, "error") {
		combinedOutput := output
		if errOutput != "" {
			combinedOutput += "\n" + errOutput
		}
		respondWithError(w, "error", combinedOutput)
		return
	}

	// Proof verified successfully
	resp := VerifyResponse{
		Status: "success",
		Output: "Proof verified successfully",
		Error:  "",
	}
	
	if output != "" {
		resp.Output = output
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func respondWithError(w http.ResponseWriter, status, errorMsg string) {
	resp := VerifyResponse{
		Status: status,
		Output: "",
		Error:  errorMsg,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // Always return 200, use JSON status field
	json.NewEncoder(w).Encode(resp)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	http.HandleFunc("/verify", verifyHandler)
	http.HandleFunc("/health", healthHandler)

	log.Printf("Lean verification server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}