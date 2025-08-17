# Simple Go-only version for Railway deployment
FROM golang:1.21-alpine AS builder
WORKDIR /build
COPY server.go .
RUN go mod init lean-runner && \
    go mod tidy && \
    go build -o lean-server server.go

FROM alpine:3.18
RUN apk add --no-cache ca-certificates bash

# Create directories
RUN mkdir -p /scripts /proofs
WORKDIR /proofs

# Create a simple mock script for now
RUN echo '#!/bin/bash' > /scripts/run_lean.sh && \
    echo 'echo "{\"status\":\"success\",\"output\":\"Mock LEAN verification - proof accepted\",\"error\":\"\"}"' >> /scripts/run_lean.sh && \
    chmod +x /scripts/run_lean.sh

# Copy Go server
COPY --from=builder /build/lean-server /usr/local/bin/lean-server

EXPOSE 8081
CMD ["/usr/local/bin/lean-server"]