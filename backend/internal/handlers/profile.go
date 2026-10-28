package handlers

import (
	"context"
	"net/http"
	"time"

	"histeeria/backend/internal/db"
	"histeeria/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

type ProfileHandler struct{}

func NewProfileHandler() *ProfileHandler {
	return &ProfileHandler{}
}

func (h *ProfileHandler) RegisterRoutes(r *gin.RouterGroup) {
	profile := r.Group("/profile")
	profile.GET("", h.GetProfile)
	profile.PUT("", h.UpdateProfile)
	profile.POST("/signout", h.SignOut)
}

func (h *ProfileHandler) GetProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	if db.Pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var email, name, timezone, avatar string
	err := db.Pool.QueryRow(ctx, `SELECT email, COALESCE(name,''), COALESCE(timezone,'UTC'), COALESCE(avatar_url,'') FROM users WHERE id = $1`, userID).Scan(&email, &name, &timezone, &avatar)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": userID, "email": email, "name": name, "timezone": timezone, "avatar_url": avatar})
}

func (h *ProfileHandler) UpdateProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var req struct {
		Name     string `json:"name"`
		Timezone string `json:"timezone"`
		Avatar   string `json:"avatar_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if db.Pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := db.Pool.Exec(ctx, `UPDATE users SET name = COALESCE(NULLIF($1,''), name), timezone = COALESCE(NULLIF($2,''), timezone), avatar_url = COALESCE(NULLIF($3,''), avatar_url), updated_at = NOW() WHERE id = $4`, req.Name, req.Timezone, req.Avatar, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "profile updated"})
}

func (h *ProfileHandler) SignOut(c *gin.Context) {
	// Stateless JWT - client should discard token
	c.JSON(http.StatusOK, gin.H{"message": "signed out"})
}
