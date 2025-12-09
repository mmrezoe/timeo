# --- Build Stage ---
FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN apk add --no-cache gcc musl-dev

# Build binary with CGO enabled
# RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o timeo .
RUN CGO_ENABLED=1 go build -o timeo .

# --- Run Stage ---
FROM alpine:3.20

WORKDIR /app

RUN apk add --no-cache sqlite-libs

COPY --from=builder /app/timeo /app/timeo
COPY --from=builder /app/database /app/database
COPY --from=builder /app/templates /app/templates
COPY --from=builder /app/static /app/static


EXPOSE 3000

CMD ["./timeo"]