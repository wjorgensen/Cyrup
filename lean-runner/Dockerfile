# Build stage for Go server
FROM golang:1.21-alpine AS builder
WORKDIR /build
COPY server.go .
RUN go mod init lean-runner && \
    go mod tidy && \
    go build -o lean-server server.go

# Runtime stage
FROM ubuntu:22.04

# Install dependencies including git (required for Lean)
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    curl \
    git \
    zstd \
    && rm -rf /var/lib/apt/lists/*

# Install LEAN 4 using the official installer script
RUN curl -sSf https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh | sh -s -- -y --default-toolchain leanprover/lean4:stable

# Set PATH to include elan and lean
ENV PATH="/root/.elan/bin:${PATH}"

# Force download of LEAN toolchain during build
RUN lean --version && \
    echo 'Forcing LEAN download...' && \
    echo '#check Nat' | lean --stdin && \
    echo 'def main : IO Unit := IO.println "Hello, World!"' > /tmp/test.lean && \
    lean /tmp/test.lean && \
    rm /tmp/test.lean && \
    echo 'LEAN installation complete'

# Create working directory
WORKDIR /workspace

# Create scripts directory
RUN mkdir -p /scripts

# Copy the runner script and Go server
COPY scripts/run_lean.sh /scripts/
RUN chmod +x /scripts/run_lean.sh
COPY --from=builder /build/lean-server /usr/local/bin/lean-server

# Set working directory for proof files
WORKDIR /proofs

# Expose port for HTTP server
EXPOSE 8081

# Run the Go server by default
CMD ["/usr/local/bin/lean-server"]