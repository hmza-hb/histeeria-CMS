package handlers

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"net/http"
	"time"

	"histeeria/backend/internal/auth"
	"histeeria/backend/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct{}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

func (h *AuthHandler) RegisterRoutes(r *gin.RouterGroup) {
	auth := r.Group("/auth")
	auth.POST("/register", h.Register)
	auth.POST("/login", h.Login)
	auth.POST("/google", h.GoogleSignIn)
	auth.POST("/send-otp", h.SendOTP)
	auth.POST("/verify-otp", h.VerifyOTP)
	auth.POST("/forgot-password", h.ForgotPassword)
	auth.POST("/reset-password", h.ResetPassword)
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
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

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	var userID string
	err = db.Pool.QueryRow(ctx,
		`INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id`,
		req.Email, req.Name, string(hash),
	).Scan(&userID)
	if err != nil {
		// try to get existing user
		err = db.Pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, req.Email).Scan(&userID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "user registration failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "user exists"})
		return
	}

	token, _ := auth.GenerateToken(userID, req.Email)
	c.JSON(http.StatusCreated, gin.H{"token": token, "user_id": userID})
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
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

	var userID, hash string
	err := db.Pool.QueryRow(ctx, `SELECT id, password_hash FROM users WHERE email = $1`, req.Email).Scan(&userID, &hash)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	token, _ := auth.GenerateToken(userID, req.Email)
	c.JSON(http.StatusOK, gin.H{"token": token, "user_id": userID})
}

func (h *AuthHandler) GoogleSignIn(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
		Name  string `json:"name"`
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

	var userID string
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO users (email, name, auth_provider) VALUES ($1, $2, 'google') ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name) RETURNING id`,
		req.Email, req.Name,
	).Scan(&userID)
	if err != nil {
		err = db.Pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, req.Email).Scan(&userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to sign in with google"})
			return
		}
	}
	token, _ := auth.GenerateToken(userID, req.Email)
	c.JSON(http.StatusOK, gin.H{"token": token, "user_id": userID})
}

func generateOTP() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(1000000))
	return fmt.Sprintf("%06d", n.Int64())
}

func (h *AuthHandler) SendOTP(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
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

	otp := generateOTP()
	expires := time.Now().Add(10 * time.Minute)
	_, err := db.Pool.Exec(ctx,
		`INSERT INTO auth_otp (email, code, expires_at) VALUES ($1, $2, $3)`,
		req.Email, otp, expires,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send otp"})
		return
	}
	// In production, send via email service; for MVP return success message
	c.JSON(http.StatusOK, gin.H{"message": "otp sent", "otp_debug": otp}) // debug only for dev
}

func (h *AuthHandler) VerifyOTP(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
		Code  string `json:"code" binding:"required"`
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

	var id string
	err := db.Pool.QueryRow(ctx,
		`SELECT id FROM auth_otp WHERE email = $1 AND code = $2 AND expires_at > NOW() AND used = false ORDER BY created_at DESC LIMIT 1`,
		req.Email, req.Code,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired otp"})
		return
	}
	_, _ = db.Pool.Exec(ctx, `UPDATE auth_otp SET used = true WHERE id = $1`, id)

	// Get or create user
	var userID string
	err = db.Pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, req.Email).Scan(&userID)
	if err != nil {
		err = db.Pool.QueryRow(ctx, `INSERT INTO users (email) VALUES ($1) RETURNING id`, req.Email).Scan(&userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
			return
		}
	}
	token, _ := auth.GenerateToken(userID, req.Email)
	c.JSON(http.StatusOK, gin.H{"token": token, "user_id": userID})
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
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

	// Generate reset token
	resetToken := uuid.New().String()
	expires := time.Now().Add(1 * time.Hour)
	_, _ = db.Pool.Exec(ctx,
		`INSERT INTO password_reset_tokens (email, token, expires_at) VALUES ($1, $2, $3)`,
		req.Email, resetToken, expires,
	)
	c.JSON(http.StatusOK, gin.H{"message": "password reset instructions sent", "reset_token_debug": resetToken})
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req struct {
		Token    string `json:"token" binding:"required"`
		Password string `json:"password" binding:"required,min=6"`
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

	var email string
	err := db.Pool.QueryRow(ctx,
		`SELECT email FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used = false ORDER BY created_at DESC LIMIT 1`,
		req.Token,
	).Scan(&email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	_, _ = db.Pool.Exec(ctx, `UPDATE users SET password_hash = $1 WHERE email = $2`, string(hash), email)
	_, _ = db.Pool.Exec(ctx, `UPDATE password_reset_tokens SET used = true WHERE token = $1`, req.Token)
	c.JSON(http.StatusOK, gin.H{"message": "password updated successfully"})
}
