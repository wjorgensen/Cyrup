FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY api/ ./api/

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./api

FROM alpine:latest

RUN apk --no-cache add ca-certificates docker-cli

WORKDIR /root/

COPY --from=builder /app/main .

EXPOSE 8080

CMD ["./main"]