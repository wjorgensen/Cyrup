# Build stage for Go server
FROM golang:1.21-alpine AS builder
WORKDIR /build
COPY server.go .
RUN go mod init lean-runner && \
    go mod tidy && \
    go build -o lean-server server.go

# Runtime stage - using Alpine for reliability
FROM alpine:3.18

# Install dependencies
RUN apk add --no-cache \
    wget \
    ca-certificates \
    curl \
    git \
    zstd \
    gcompat \
    libstdc++ \
    bash

# Download and install LEAN 4
WORKDIR /tmp

# Download LEAN for x86_64 (Railway uses x86_64)
RUN wget -q "https://github.com/leanprover/lean4/releases/download/v4.12.0/lean-4.12.0-linux_x86_64.tar.zst" -O lean.tar.zst && \
    tar --use-compress-program=unzstd -xf lean.tar.zst && \
    mv lean-4.12.0-linux_x86_64 /opt/lean && \
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

# Copy scripts
COPY scripts/run_lean.sh /scripts/
RUN chmod +x /scripts/run_lean.sh

# Copy Go server
COPY --from=builder /build/lean-server /usr/local/bin/lean-server

# Set working directory
WORKDIR /proofs

# Expose port
EXPOSE 8081

# Run the server
CMD ["/usr/local/bin/lean-server"]