package db

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	Pool      *pgxpool.Pool
	LastError error
)

func sanitizeDatabaseURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	prefix := "postgresql://"
	if strings.HasPrefix(raw, "postgres://") {
		raw = "postgresql://" + strings.TrimPrefix(raw, "postgres://")
	}
	if !strings.HasPrefix(raw, prefix) {
		return raw
	}
	rest := raw[len(prefix):]
	lastAt := strings.LastIndex(rest, "@")
	if lastAt == -1 {
		return raw
	}
	userinfo := rest[:lastAt]
	hostAndRest := rest[lastAt+1:]
	firstColon := strings.Index(userinfo, ":")
	if firstColon == -1 {
		return raw
	}
	user := userinfo[:firstColon]
	pwd := userinfo[firstColon+1:]
	// URL-encode password if not already encoded
	unquoted, err := url.QueryUnescape(pwd)
	if err == nil {
		pwd = unquoted
	}
	encodedPwd := url.QueryEscape(pwd)
	fixed := fmt.Sprintf("postgresql://%s:%s@%s", user, encodedPwd, hostAndRest)
	if !strings.Contains(fixed, "sslmode=") {
		if strings.Contains(fixed, "?") {
			fixed += "&sslmode=require"
		} else {
			fixed += "?sslmode=require"
		}
	}
	return fixed
}

func Connect(databaseURL string) error {
	if databaseURL == "" {
		LastError = fmt.Errorf("DATABASE_URL environment variable is empty or not set")
		return LastError
	}

	sanitizedURL := sanitizeDatabaseURL(databaseURL)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	config, err := pgxpool.ParseConfig(sanitizedURL)
	if err != nil {
		LastError = fmt.Errorf("failed to parse DATABASE_URL: %w", err)
		return LastError
	}

	config.MaxConns = 20
	config.MinConns = 2

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		LastError = fmt.Errorf("failed to create pool: %w", err)
		return LastError
	}

	if err := pool.Ping(ctx); err != nil {
		LastError = fmt.Errorf("failed to ping database: %w", err)
		return LastError
	}

	Pool = pool
	LastError = nil
	log.Println("[INFO] Database pool initialized successfully")
	return nil
}

func GetPool() *pgxpool.Pool {
	return Pool
}

