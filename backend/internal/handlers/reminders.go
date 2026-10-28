package handlers

import (
	"context"
	"net/http"
	"time"

	"histeeria/backend/internal/db"
	"histeeria/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

type ReminderHandler struct{}

func NewReminderHandler() *ReminderHandler {
	return &ReminderHandler{}
}

func (h *ReminderHandler) RegisterRoutes(r *gin.RouterGroup) {
	rem := r.Group("/reminders")
	rem.POST("", h.CreateReminder)
	rem.GET("", h.ListReminders)
	rem.GET("/upcoming", h.Upcoming)
	rem.GET("/overdue", h.Overdue)
	rem.GET("/completed", h.Completed)
	rem.PUT("/:id/complete", h.Complete)
	rem.DELETE("/:id", h.DeleteReminder)
}

type CreateReminderRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	ScheduledAt string `json:"scheduled_at" binding:"required"`
	Timezone    string `json:"timezone"`
	Natural     string `json:"natural"` // natural language
}

func (h *ReminderHandler) CreateReminder(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var req CreateReminderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if db.Pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	scheduled, err := time.Parse(time.RFC3339, req.ScheduledAt)
	if err != nil {
		// try other formats
		scheduled, err = time.Parse("2006-01-02T15:04", req.ScheduledAt)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid scheduled_at format"})
			return
		}
	}
	tz := req.Timezone
	if tz == "" {
		tz = "UTC"
	}

	var id string
	err = db.Pool.QueryRow(ctx,
		`INSERT INTO reminders (user_id, title, description, scheduled_at, timezone) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		userID, req.Title, req.Description, scheduled, tz,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create reminder"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

func (h *ReminderHandler) ListReminders(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	if db.Pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := db.Pool.Query(ctx,
		`SELECT id, title, COALESCE(description,''), scheduled_at, timezone, status, created_at FROM reminders WHERE user_id = $1 ORDER BY scheduled_at ASC LIMIT 100`,
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch reminders"})
		return
	}
	defer rows.Close()

	type r struct {
		ID          string    `json:"id"`
		Title       string    `json:"title"`
		Description string    `json:"description"`
		ScheduledAt time.Time `json:"scheduled_at"`
		Timezone    string    `json:"timezone"`
		Status      string    `json:"status"`
		CreatedAt   time.Time `json:"created_at"`
	}
	var reminders []r
	for rows.Next() {
		var rem r
		if rows.Scan(&rem.ID, &rem.Title, &rem.Description, &rem.ScheduledAt, &rem.Timezone, &rem.Status, &rem.CreatedAt) == nil {
			reminders = append(reminders, rem)
		}
	}
	c.JSON(http.StatusOK, gin.H{"reminders": reminders})
}

func (h *ReminderHandler) Upcoming(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	if db.Pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	now := time.Now().UTC()
	rows, err := db.Pool.Query(ctx,
		`SELECT id, title, COALESCE(description,''), scheduled_at, timezone, status FROM reminders WHERE user_id = $1 AND status = 'pending' AND scheduled_at >= $2 ORDER BY scheduled_at ASC LIMIT 50`,
		userID, now,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch reminders"})
		return
	}
	defer rows.Close()

	type r struct {
		ID          string    `json:"id"`
		Title       string    `json:"title"`
		Description string    `json:"description"`
		ScheduledAt time.Time `json:"scheduled_at"`
		Timezone    string    `json:"timezone"`
		Status      string    `json:"status"`
	}
	var reminders []r
	for rows.Next() {
		var rem r
		if rows.Scan(&rem.ID, &rem.Title, &rem.Description, &rem.ScheduledAt, &rem.Timezone, &rem.Status) == nil {
			reminders = append(reminders, rem)
		}
	}
	c.JSON(http.StatusOK, gin.H{"reminders": reminders})
}

func (h *ReminderHandler) Overdue(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	if db.Pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	now := time.Now().UTC()
	rows, err := db.Pool.Query(ctx,
		`SELECT id, title, COALESCE(description,''), scheduled_at, timezone, status FROM reminders WHERE user_id = $1 AND status = 'pending' AND scheduled_at < $2 ORDER BY scheduled_at ASC LIMIT 50`,
		userID, now,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch reminders"})
		return
	}
	defer rows.Close()

	type r struct {
		ID          string    `json:"id"`
		Title       string    `json:"title"`
		Description string    `json:"description"`
		ScheduledAt time.Time `json:"scheduled_at"`
		Timezone    string    `json:"timezone"`
		Status      string    `json:"status"`
	}
	var reminders []r
	for rows.Next() {
		var rem r
		if rows.Scan(&rem.ID, &rem.Title, &rem.Description, &rem.ScheduledAt, &rem.Timezone, &rem.Status) == nil {
			reminders = append(reminders, rem)
		}
	}
	c.JSON(http.StatusOK, gin.H{"reminders": reminders})
}

func (h *ReminderHandler) Completed(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	if db.Pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := db.Pool.Query(ctx,
		`SELECT id, title, COALESCE(description,''), scheduled_at, timezone, status FROM reminders WHERE user_id = $1 AND status = 'completed' ORDER BY completed_at DESC LIMIT 50`,
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch reminders"})
		return
	}
	defer rows.Close()

	type r struct {
		ID          string    `json:"id"`
		Title       string    `json:"title"`
		Description string    `json:"description"`
		ScheduledAt time.Time `json:"scheduled_at"`
		Timezone    string    `json:"timezone"`
		Status      string    `json:"status"`
	}
	var reminders []r
	for rows.Next() {
		var rem r
		if rows.Scan(&rem.ID, &rem.Title, &rem.Description, &rem.ScheduledAt, &rem.Timezone, &rem.Status) == nil {
			reminders = append(reminders, rem)
		}
	}
	c.JSON(http.StatusOK, gin.H{"reminders": reminders})
}

func (h *ReminderHandler) Complete(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	id := c.Param("id")
	if db.Pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := db.Pool.Exec(ctx, `UPDATE reminders SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to complete reminder"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "reminder completed"})
}

func (h *ReminderHandler) DeleteReminder(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	id := c.Param("id")
	if db.Pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := db.Pool.Exec(ctx, `DELETE FROM reminders WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete reminder"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "reminder deleted"})
}
