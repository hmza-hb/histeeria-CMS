package handlers

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"time"

	"histeeria/backend/internal/auth"
	"histeeria/backend/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
	"google.golang.org/api/idtoken"
)

type AuthHandler struct{}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

func (h *AuthHandler) RegisterRoutes(r *gin.RouterGroup) {
	a := r.Group("/auth")
	a.POST("/send-otp", h.SendOTP)
	a.POST("/verify-otp", h.VerifyOTP)
	a.POST("/google", h.GoogleSignIn)
}

// ─────────────────────────────────────────────
// OTP helpers
// ─────────────────────────────────────────────

func generateOTP() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(1000000))
	return fmt.Sprintf("%06d", n.Int64())
}

func sendOTPEmail(toEmail, toName, otp string) error {
	apiKey := os.Getenv("SENDGRID_API_KEY")
	fromEmail := os.Getenv("SENDGRID_FROM_EMAIL")
	fromName := os.Getenv("SENDGRID_FROM_NAME")
	if fromName == "" {
		fromName = "Histeeria Memory"
	}
	if fromEmail == "" {
		fromEmail = "noreply@histeeria.com"
	}

	// HTML email template
	htmlContent := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Histeeria Sign-In Code</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Histeeria Memory</h1>
              <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">Your personal cognitive memory</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;color:#64748b;font-size:14px;font-weight:500;">Hello%s</p>
              <h2 style="margin:0 0 24px;color:#0f172a;font-size:20px;font-weight:700;">Your sign-in code</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
                Use the 6-digit code below to sign in to your Histeeria Memory account. This code expires in <strong>10 minutes</strong>.
              </p>

              <!-- OTP Code Box -->
              <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin:0 0 28px;">
                <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#0f172a;font-family:'Courier New',monospace;">%s</span>
              </div>

              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                If you didn't request this code, you can safely ignore this email. Your account is secure.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">
                &copy; 2025 Histeeria Memory &bull; You live your life; Histeeria remembers it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, func() string {
		if toName != "" {
			return " " + toName + ","
		}
		return ","
	}(), otp)

	textContent := fmt.Sprintf("Your Histeeria Memory sign-in code is: %s\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, you can safely ignore this email.", otp)

	from := mail.NewEmail(fromName, fromEmail)
	to := mail.NewEmail(toName, toEmail)
	message := mail.NewSingleEmail(from, "Your Histeeria sign-in code: "+otp, to, textContent, htmlContent)

	if apiKey == "" {
		// Dev mode: log OTP instead
		fmt.Printf("[DEV] OTP for %s: %s\n", toEmail, otp)
		return nil
	}

	client := sendgrid.NewSendClient(apiKey)
	resp, err := client.Send(message)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 400 {
		return fmt.Errorf("sendgrid error: %d %s", resp.StatusCode, resp.Body)
	}
	return nil
}

// ─────────────────────────────────────────────
// POST /auth/send-otp
// Body: { email, name? }
// ─────────────────────────────────────────────
func (h *AuthHandler) SendOTP(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
		Name  string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid email is required"})
		return
	}
	if db.Pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Upsert user (create if not exists) — no password needed
	var userID string
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO users (email, name) VALUES ($1, NULLIF($2,''))
		 ON CONFLICT (email) DO UPDATE SET name = COALESCE(NULLIF(EXCLUDED.name,''), users.name)
		 RETURNING id`,
		req.Email, req.Name,
	).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process user"})
		return
	}

	// Invalidate old unused OTPs for this email
	_, _ = db.Pool.Exec(ctx,
		`UPDATE auth_otp SET used = true WHERE email = $1 AND used = false`,
		req.Email,
	)

	otp := generateOTP()
	expires := time.Now().Add(10 * time.Minute)

	_, err = db.Pool.Exec(ctx,
		`INSERT INTO auth_otp (email, code, expires_at) VALUES ($1, $2, $3)`,
		req.Email, otp, expires,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate OTP"})
		return
	}

	// Get user name for email
	var name string
	_ = db.Pool.QueryRow(ctx, `SELECT COALESCE(name,'') FROM users WHERE email = $1`, req.Email).Scan(&name)

	if err := sendOTPEmail(req.Email, name, otp); err != nil {
		fmt.Printf("[WARN] Failed to send OTP email: %v\n", err)
		// Still respond OK — dev mode logs it
	}

	c.JSON(http.StatusOK, gin.H{"message": "verification code sent to " + req.Email})
}

// ─────────────────────────────────────────────
// POST /auth/verify-otp
// Body: { email, code }
// ─────────────────────────────────────────────
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

	var otpID string
	err := db.Pool.QueryRow(ctx,
		`SELECT id FROM auth_otp
		 WHERE email = $1 AND code = $2 AND expires_at > NOW() AND used = false
		 ORDER BY created_at DESC LIMIT 1`,
		req.Email, req.Code,
	).Scan(&otpID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired code"})
		return
	}

	// Mark OTP used
	_, _ = db.Pool.Exec(ctx, `UPDATE auth_otp SET used = true WHERE id = $1`, otpID)

	// Get user
	var userID string
	err = db.Pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, req.Email).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user not found"})
		return
	}

	// Get profile
	var name string
	_ = db.Pool.QueryRow(ctx, `SELECT COALESCE(name,'') FROM users WHERE id = $1`, userID).Scan(&name)

	token, err := auth.GenerateToken(userID, req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":   token,
		"user_id": userID,
		"name":    name,
		"email":   req.Email,
	})
}

// ─────────────────────────────────────────────
// POST /auth/google
// Body: { id_token } or { access_token, email, name }
// ─────────────────────────────────────────────
func (h *AuthHandler) GoogleSignIn(c *gin.Context) {
	var req struct {
		IDToken     string `json:"id_token"`
		AccessToken string `json:"access_token"`
		Email       string `json:"email"`
		Name        string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var email, name string

	if req.IDToken != "" && req.Email == "" {
		// Verify Google ID token (from GoogleLogin button / one-tap)
		googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
		if googleClientID == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "google client ID not configured"})
			return
		}
		payload, err := idtoken.Validate(ctx, req.IDToken, googleClientID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid Google token"})
			return
		}
		email, _ = payload.Claims["email"].(string)
		name, _ = payload.Claims["name"].(string)
	} else if req.Email != "" {
		// Access token flow — email already verified via Google userinfo on frontend
		email = req.Email
		name = req.Name
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_token or email required"})
		return
	}

	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "could not determine email"})
		return
	}

	if db.Pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}

	// Upsert user
	var userID string
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO users (email, name, auth_provider)
		 VALUES ($1, NULLIF($2,''), 'google')
		 ON CONFLICT (email) DO UPDATE
		   SET name = COALESCE(NULLIF(EXCLUDED.name,''), users.name),
		       auth_provider = COALESCE(users.auth_provider, 'google')
		 RETURNING id`,
		email, name,
	).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to sign in with Google"})
		return
	}

	token, err := auth.GenerateToken(userID, email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":   token,
		"user_id": userID,
		"name":    name,
		"email":   email,
	})
}
