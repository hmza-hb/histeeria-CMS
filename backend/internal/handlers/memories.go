package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"histeeria/backend/internal/ai"
	"histeeria/backend/internal/db"
	"histeeria/backend/internal/embedding"
	"histeeria/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

type MemoryHandler struct{}

func NewMemoryHandler() *MemoryHandler {
	return &MemoryHandler{}
}

func (h *MemoryHandler) RegisterRoutes(r *gin.RouterGroup) {
	mem := r.Group("/memories")
	mem.POST("", h.CreateMemory)
	mem.GET("", h.ListMemories)
	mem.GET("/:id", h.GetMemory)
	mem.PUT("/:id", h.UpdateMemory)
	mem.DELETE("/:id", h.DeleteMemory)
	mem.GET("/search", h.SearchMemories)
}

type CreateMemoryRequest struct {
	Content string `json:"content" binding:"required"`
	Title   string `json:"title"`
}

func (h *MemoryHandler) CreateMemory(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var req CreateMemoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if db.Pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	title := req.Title
	if title == "" {
		// simple fallback
		words := strings.Fields(req.Content)
		if len(words) > 6 {
			title = strings.Join(words[:6], " ") + "..."
		} else if len(words) > 0 {
			title = strings.Join(words, " ")
		} else {
			title = "Memory"
		}
	}
	summary := ""
	metadata := map[string]interface{}{}

	// Try AI extraction
	gemini := ai.NewGeminiClient()
	if ext, err := gemini.ExtractMemory(ctx, req.Content); err == nil {
		if ext.Title != "" {
			title = ext.Title
		}
		summary = ext.Summary
		metadata["facts"] = ext.Facts
		metadata["people"] = ext.People
		metadata["places"] = ext.Places
		metadata["events"] = ext.Events
		metadata["dates"] = ext.Dates
		metadata["commitments"] = ext.Commitments
		metadata["categories"] = ext.Categories
		// store facts separately
	}
	metaBytes, _ := json.Marshal(metadata)

	var memoryID string
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO memories (user_id, title, original_content, summary, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		userID, title, req.Content, summary, metaBytes,
	).Scan(&memoryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save memory"})
		return
	}

	// Store facts
	if facts, ok := metadata["facts"].([]interface{}); ok {
		for _, f := range facts {
			if fs, ok := f.(string); ok && fs != "" {
				// simple split
				parts := strings.SplitN(fs, " ", 3)
				subj, pred, obj := fs, "", ""
				if len(parts) >= 3 {
					subj, pred, obj = parts[0], parts[1], strings.Join(parts[2:], " ")
				}
				_, _ = db.Pool.Exec(ctx,
					`INSERT INTO memory_facts (memory_id, user_id, subject, predicate, object) VALUES ($1, $2, $3, $4, $5)`,
					memoryID, userID, subj, pred, obj,
				)
			}
		}
	}

	// Generate embeddings
	embClient := embedding.New()
	if vec, err := embClient.EmbedText(ctx, req.Content); err == nil {
		vecStr := embedding.VectorToString(vec)
		_, _ = db.Pool.Exec(ctx,
			`INSERT INTO memory_embeddings (memory_id, user_id, embedding, embedding_model) VALUES ($1, $2, $3, $4) ON CONFLICT (memory_id, embedding_model) DO UPDATE SET embedding = EXCLUDED.embedding`,
			memoryID, userID, vecStr, osGetEnv("EMBEDDING_MODEL", "text-embedding-004"),
		)
	}

	c.JSON(http.StatusCreated, gin.H{"id": memoryID, "title": title, "summary": summary})
}

func osGetEnv(k, d string) string {
	// avoid import cycle issues in simple form
	if v := getEnvSimple(k); v != "" {
		return v
	}
	return d
}

func getEnvSimple(k string) string {
	// minimal
	return ""
}

func (h *MemoryHandler) ListMemories(c *gin.Context) {
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
		`SELECT id, title, original_content, COALESCE(summary,''), metadata, created_at, updated_at FROM memories WHERE user_id = $1 AND archived_at IS NULL ORDER BY created_at DESC LIMIT 100`,
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch memories"})
		return
	}
	defer rows.Close()

	type mem struct {
		ID        string          `json:"id"`
		Title     string          `json:"title"`
		Content   string          `json:"content"`
		Summary   string          `json:"summary"`
		Metadata  json.RawMessage `json:"metadata"`
		CreatedAt time.Time       `json:"created_at"`
		UpdatedAt time.Time       `json:"updated_at"`
	}
	var memories []mem
	for rows.Next() {
		var m mem
		var meta []byte
		if err := rows.Scan(&m.ID, &m.Title, &m.Content, &m.Summary, &meta, &m.CreatedAt, &m.UpdatedAt); err == nil {
			m.Metadata = meta
			memories = append(memories, m)
		}
	}
	c.JSON(http.StatusOK, gin.H{"memories": memories})
}

func (h *MemoryHandler) GetMemory(c *gin.Context) {
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

	var m struct {
		ID        string          `json:"id"`
		Title     string          `json:"title"`
		Content   string          `json:"content"`
		Summary   string          `json:"summary"`
		Metadata  json.RawMessage `json:"metadata"`
		CreatedAt time.Time       `json:"created_at"`
		UpdatedAt time.Time       `json:"updated_at"`
	}
	var meta []byte
	err := db.Pool.QueryRow(ctx,
		`SELECT id, title, original_content, COALESCE(summary,''), metadata, created_at, updated_at FROM memories WHERE id = $1 AND user_id = $2`,
		id, userID,
	).Scan(&m.ID, &m.Title, &m.Content, &m.Summary, &meta, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "memory not found"})
		return
	}
	m.Metadata = meta
	c.JSON(http.StatusOK, m)
}

func (h *MemoryHandler) UpdateMemory(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	id := c.Param("id")
	var req struct {
		Title   string `json:"title"`
		Content string `json:"content"`
		Summary string `json:"summary"`
	}
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

	_, err := db.Pool.Exec(ctx,
		`UPDATE memories SET title = COALESCE(NULLIF($1,''), title), original_content = COALESCE(NULLIF($2,''), original_content), summary = COALESCE(NULLIF($3,''), summary), updated_at = NOW() WHERE id = $4 AND user_id = $5`,
		req.Title, req.Content, req.Summary, id, userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update memory"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "memory updated"})
}

func (h *MemoryHandler) DeleteMemory(c *gin.Context) {
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

	_, err := db.Pool.Exec(ctx, `DELETE FROM memories WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete memory"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "memory deleted"})
}

func (h *MemoryHandler) SearchMemories(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query required"})
		return
	}
	if db.Pool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := db.Pool.Query(ctx,
		`SELECT id, title, original_content, COALESCE(summary,''), ts_rank(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(original_content,'')), plainto_tsquery('english', $1)) as rank
		 FROM memories WHERE user_id = $2 AND to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(original_content,'')) @@ plainto_tsquery('english', $1)
		 ORDER BY rank DESC LIMIT 50`,
		q, userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "search failed"})
		return
	}
	defer rows.Close()

	type res struct {
		ID      string  `json:"id"`
		Title   string  `json:"title"`
		Content string  `json:"content"`
		Summary string  `json:"summary"`
		Rank    float32 `json:"rank"`
	}
	var results []res
	for rows.Next() {
		var r res
		if err := rows.Scan(&r.ID, &r.Title, &r.Content, &r.Summary, &r.Rank); err == nil {
			results = append(results, r)
		}
	}
	c.JSON(http.StatusOK, gin.H{"results": results})
}
