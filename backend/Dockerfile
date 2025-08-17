# Multi-stage build for production
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY api/ ./api/

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./api

# Final stage
FROM docker:24-dind

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the Go binary
COPY --from=builder /app/main .

# Copy LEAN runner files
COPY lean-runner/ ./lean-runner/

# Build the LEAN runner image during container startup
# This allows Railway to build the image with Docker-in-Docker
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'dockerd-entrypoint.sh &' >> /entrypoint.sh && \
    echo 'sleep 5' >> /entrypoint.sh && \
    echo 'docker build -t lean-runner:latest -f lean-runner/Dockerfile lean-runner/' >> /entrypoint.sh && \
    echo 'exec ./main' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]