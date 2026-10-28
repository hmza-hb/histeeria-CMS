package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	Env                string
	DatabaseURL        string
	CORSAllowedOrigins []string
	GeminiAPIKey       string
	EmbeddingModel     string
	DefaultTimezone    string
}

func Load() *Config {
	// Try loading .env from current directory or project root
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")
	_ = godotenv.Load("../../.env")

	port := getEnv("PORT", "8080")
	env := getEnv("ENV", "development")
	dbURL := getEnv("DATABASE_URL", "")

	corsRaw := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
	var origins []string
	for _, o := range strings.Split(corsRaw, ",") {
		trimmed := strings.TrimSpace(o)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}

	geminiKey := getEnv("GEMINI_API_KEY", "")
	embeddingModel := getEnv("EMBEDDING_MODEL", "text-embedding-004")
	tz := getEnv("DEFAULT_TIMEZONE", "UTC")

	cfg := &Config{
		Port:               port,
		Env:                env,
		DatabaseURL:        dbURL,
		CORSAllowedOrigins: origins,
		GeminiAPIKey:       geminiKey,
		EmbeddingModel:     embeddingModel,
		DefaultTimezone:    tz,
	}

	if cfg.DatabaseURL == "" {
		log.Println("[WARN] DATABASE_URL is not set. Database functionality will be unavailable until configured.")
	}

	return cfg
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}
