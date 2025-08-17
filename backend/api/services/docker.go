package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/client"
)

type DockerService struct {
	client    *client.Client
	imageName string
}

type LeanResult struct {
	Status string `json:"status"`
	Output string `json:"output"`
	Error  string `json:"error"`
}

func NewDockerService() (*DockerService, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}

	return &DockerService{
		client:    cli,
		imageName: "lean-runner:latest",
	}, nil
}

func (s *DockerService) Close() error {
	return s.client.Close()
}

func (s *DockerService) BuildImage(ctx context.Context) error {
	buildContext := bytes.NewReader([]byte{})
	
	buildOptions := types.ImageBuildOptions{
		Tags:       []string{s.imageName},
		Dockerfile: "backend/lean-runner/Dockerfile",
		Context:    buildContext,
	}
	
	resp, err := s.client.ImageBuild(ctx, buildContext, buildOptions)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	_, err = io.Copy(io.Discard, resp.Body)
	return err
}

func (s *DockerService) EnsureImage(ctx context.Context) error {
	images, err := s.client.ImageList(ctx, image.ListOptions{})
	if err != nil {
		return err
	}
	
	for _, img := range images {
		for _, tag := range img.RepoTags {
			if tag == s.imageName {
				return nil
			}
		}
	}
	
	return s.BuildImage(ctx)
}

func (s *DockerService) RunLeanProof(code string, timeout int) (string, error) {
	ctx := context.Background()
	
	if err := s.EnsureImage(ctx); err != nil {
		return "", fmt.Errorf("failed to ensure image: %w", err)
	}

	config := &container.Config{
		Image: s.imageName,
		Cmd:   []string{"/bin/bash", "-c", fmt.Sprintf("echo '%s' | /scripts/run_lean.sh", strings.ReplaceAll(code, "'", "'\\''"))},
		Env: []string{
			fmt.Sprintf("TIMEOUT=%d", timeout),
		},
		Tty: false,
	}

	hostConfig := &container.HostConfig{
		AutoRemove: true,
		Resources: container.Resources{
			Memory:   1024 * 1024 * 1024,
			NanoCPUs: 1000000000,
		},
	}

	resp, err := s.client.ContainerCreate(ctx, config, hostConfig, nil, nil, "")
	if err != nil {
		return "", fmt.Errorf("failed to create container: %w", err)
	}

	if err := s.client.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		return "", fmt.Errorf("failed to start container: %w", err)
	}

	timeoutCtx, cancel := context.WithTimeout(ctx, time.Duration(timeout+5)*time.Second)
	defer cancel()

	statusCh, errCh := s.client.ContainerWait(timeoutCtx, resp.ID, container.WaitConditionNotRunning)
	
	select {
	case err := <-errCh:
		if err != nil {
			s.client.ContainerKill(ctx, resp.ID, "KILL")
			return "", fmt.Errorf("container error: %w", err)
		}
	case <-statusCh:
		// Container finished
	case <-timeoutCtx.Done():
		s.client.ContainerKill(ctx, resp.ID, "KILL")
		return "", fmt.Errorf("timeout")
	}

	// Get logs after container finishes
	logsReader, err := s.client.ContainerLogs(ctx, resp.ID, container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
	})
	if err != nil {
		return "", fmt.Errorf("failed to get logs: %w", err)
	}
	defer logsReader.Close()

	var output bytes.Buffer
	io.Copy(&output, logsReader)
	
	// Clean the output (remove Docker log headers)
	outputStr := output.String()
	lines := strings.Split(outputStr, "\n")
	var cleanLines []string
	for _, line := range lines {
		// Skip Docker log header bytes (first 8 bytes of each line)
		if len(line) > 8 {
			cleanLines = append(cleanLines, line[8:])
		} else if line != "" {
			cleanLines = append(cleanLines, line)
		}
	}
	outputStr = strings.Join(cleanLines, "\n")
	outputStr = strings.TrimSpace(outputStr)
	
	// Try to parse as JSON
	if strings.Contains(outputStr, "{") && strings.Contains(outputStr, "}") {
		// Extract JSON from output
		startIdx := strings.Index(outputStr, "{")
		endIdx := strings.LastIndex(outputStr, "}")
		if startIdx >= 0 && endIdx > startIdx {
			jsonStr := outputStr[startIdx : endIdx+1]
			var result LeanResult
			if err := json.Unmarshal([]byte(jsonStr), &result); err == nil {
				if result.Status == "success" {
					return result.Output, nil
				} else if result.Status == "timeout" {
					return "", fmt.Errorf("timeout")
				} else {
					return "", fmt.Errorf(result.Error)
				}
			}
		}
	}

	return outputStr, nil
}