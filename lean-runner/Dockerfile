# Build stage for Go server
FROM golang:1.21-alpine AS builder
WORKDIR /build
COPY server.go .
RUN go mod init lean-runner && \
    go mod tidy && \
    go build -o lean-server server.go

# Runtime stage with LEAN 4 via elan
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && \
    apt-get install -y \
    curl \
    git \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Install elan and LEAN 4
RUN curl https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh -sSf | bash -s -- -y --default-toolchain leanprover/lean4:v4.12.0

# Set up environment
ENV PATH="/root/.elan/bin:${PATH}"

# Verify LEAN is working with real examples
RUN lean --version && \
    echo 'example : 2 + 2 = 4 := by rfl' | lean --stdin && \
    echo 'theorem simple : 1 + 1 = 2 := by rfl' | lean --stdin

# Create working directories
WORKDIR /workspace
RUN mkdir -p /scripts /proofs

# Create the run_lean.sh script that actually runs LEAN
RUN echo '#!/bin/bash' > /scripts/run_lean.sh && \
    echo 'export PATH="/root/.elan/bin:${PATH}"' >> /scripts/run_lean.sh && \
    echo 'PROOF_FILE="/tmp/proof_$$.lean"' >> /scripts/run_lean.sh && \
    echo 'cat > "$PROOF_FILE"' >> /scripts/run_lean.sh && \
    echo 'OUTPUT=$(lean "$PROOF_FILE" 2>&1)' >> /scripts/run_lean.sh && \
    echo 'EXIT_CODE=$?' >> /scripts/run_lean.sh && \
    echo 'rm -f "$PROOF_FILE"' >> /scripts/run_lean.sh && \
    echo 'if [ $EXIT_CODE -eq 0 ]; then' >> /scripts/run_lean.sh && \
    echo '  echo "{\"status\":\"success\",\"output\":\"Proof verified successfully\",\"error\":\"\"}"' >> /scripts/run_lean.sh && \
    echo 'else' >> /scripts/run_lean.sh && \
    echo '  ERROR_JSON=$(echo "$OUTPUT" | sed '"'"'s/\\/\\\\/g'"'"' | sed '"'"'s/"/\\"/g'"'"' | sed '"'"':a;N;$!ba;s/\\n/\\n/g'"'"')' >> /scripts/run_lean.sh && \
    echo '  echo "{\"status\":\"error\",\"output\":\"\",\"error\":\"$ERROR_JSON\"}"' >> /scripts/run_lean.sh && \
    echo 'fi' >> /scripts/run_lean.sh && \
    chmod +x /scripts/run_lean.sh

# Copy Go server
COPY --from=builder /build/lean-server /usr/local/bin/lean-server

# Set working directory
WORKDIR /proofs

# Expose port
EXPOSE 8080

# Run the server
CMD ["/usr/local/bin/lean-server"]