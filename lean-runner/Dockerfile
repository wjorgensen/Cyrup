# Build stage for Go server
FROM golang:1.21-alpine AS builder
WORKDIR /build
COPY server.go .
RUN go mod init lean-runner && \
    go mod tidy && \
    go build -o lean-server server.go

# Runtime stage
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    curl \
    git \
    zstd \
    && rm -rf /var/lib/apt/lists/*

# Download and install LEAN 4 directly (not using elan to avoid runtime downloads)
ENV LEAN_VERSION=v4.12.0
WORKDIR /tmp

# Detect architecture and download appropriate LEAN binary
RUN ARCH=$(uname -m) && \
    echo "Architecture: $ARCH" && \
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
        LEAN_ARCH="aarch64"; \
    else \
        LEAN_ARCH="x86_64"; \
    fi && \
    echo "Downloading LEAN for Linux $LEAN_ARCH..." && \
    wget -q "https://github.com/leanprover/lean4/releases/download/${LEAN_VERSION}/lean-${LEAN_VERSION#v}-linux_${LEAN_ARCH}.tar.zst" -O lean.tar.zst && \
    tar --use-compress-program=unzstd -xf lean.tar.zst && \
    ls -la && \
    mv lean-${LEAN_VERSION#v}-linux_${LEAN_ARCH} /opt/lean && \
    rm lean.tar.zst

# Set up environment
ENV PATH="/opt/lean/bin:${PATH}"
ENV LEAN_PATH="/opt/lean/lib/lean"

# Verify LEAN is working
RUN lean --version && \
    echo '#check Nat' | lean --stdin && \
    echo 'def hello : String := "world"' | lean --stdin

# Create working directories
WORKDIR /workspace
RUN mkdir -p /scripts /proofs

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