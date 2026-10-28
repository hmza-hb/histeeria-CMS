package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"histeeria/backend/internal/config"
	"histeeria/backend/internal/db"
	"histeeria/backend/internal/handlers"
	"histeeria/backend/internal/middleware"
	"histeeria/backend/internal/worker"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	if err := db.Connect(cfg.DatabaseURL); err != nil {
		log.Printf("[WARN] Failed to connect to database: %v", err)
	} else {
		log.Println("[INFO] Connected to database")
	}

	// Start reminder worker
	reminderWorker := worker.NewReminderWorker(db.Pool)
	go reminderWorker.Start()

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.StructuredLogger())

	// CORS
	corsConfig := cors.Config{
		AllowOrigins:     cfg.CORSAllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	r.Use(cors.New(corsConfig))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "time": time.Now().UTC()})
	})

	api := r.Group("/api/v1")

	// Auth routes (public) - registered under /api/v1, /api, and / for full flexibility
	authHandler := handlers.NewAuthHandler()
	authHandler.RegisterRoutes(api)
	authHandler.RegisterRoutes(r.Group("/api"))
	authHandler.RegisterRoutes(r.Group(""))

	// Protected routes
	protected := api.Group("")
	protected.Use(middleware.AuthRequired())

	// Memories
	memHandler := handlers.NewMemoryHandler()
	memHandler.RegisterRoutes(protected)

	// Ask / Retrieval
	askHandler := handlers.NewAskHandler()
	askHandler.RegisterRoutes(protected)

	// Reminders
	remHandler := handlers.NewReminderHandler()
	remHandler.RegisterRoutes(protected)

	// Profile
	profileHandler := handlers.NewProfileHandler()
	profileHandler.RegisterRoutes(protected)

	port := cfg.Port
	if port == "" {
		port = os.Getenv("PORT")
	}
	if port == "" {
		port = "8080"
	}
	if !strings.HasPrefix(port, ":") {
		port = ":" + port
	}

	log.Printf("[INFO] Starting server on %s", port)
	if err := r.Run(port); err != nil {
		log.Fatal(err)
	}
}
