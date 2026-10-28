package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"histeeria/backend/internal/ai"
	"histeeria/backend/internal/db"
	"histeeria/backend/internal/embedding"
	"histeeria/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

type AskHandler struct{}

func NewAskHandler() *AskHandler {
	return &AskHandler{}
}

func (h *AskHandler) RegisterRoutes(r *gin.RouterGroup) {
	ask := r.Group("/ask")
	ask.POST("", h.Ask)
}

type AskRequest struct {
	Question string `json:"question" binding:"required"`
}

func (h *AskHandler) Ask(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var req AskRequest
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

	// Semantic search first
	var retrieved []map[string]interface{}
	embClient := embedding.New()
	if vec, err := embClient.EmbedText(ctx, req.Question); err == nil {
		vecStr := embedding.VectorToString(vec)
		rows, err := db.Pool.Query(ctx,
			`SELECT m.id, m.title, m.original_content, m.summary, 1 - (e.embedding <=> $1::vector) as similarity
			 FROM memory_embeddings e
			 JOIN memories m ON m.id = e.memory_id
			 WHERE m.user_id = $2 AND m.archived_at IS NULL
			 ORDER BY e.embedding <=> $1::vector
			 LIMIT 10`,
			vecStr, userID,
		)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var id, title, content, summary string
				var sim float64
				if rows.Scan(&id, &title, &content, &summary, &sim) == nil {
					retrieved = append(retrieved, map[string]interface{}{
						"id": id, "title": title, "content": content, "summary": summary, "similarity": sim, "source": "semantic",
					})
				}
			}
		}
	}

	// Also do keyword search and merge
	rows, err := db.Pool.Query(ctx,
		`SELECT id, title, original_content, COALESCE(summary,'') FROM memories 
		 WHERE user_id = $1 AND to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(original_content,'')) @@ plainto_tsquery('english', $2)
		 LIMIT 10`,
		userID, req.Question,
	)
	if err == nil {
		defer rows.Close()
		seen := map[string]bool{}
		for _, r := range retrieved {
			if id, ok := r["id"].(string); ok {
				seen[id] = true
			}
		}
		for rows.Next() {
			var id, title, content, summary string
			if rows.Scan(&id, &title, &content, &summary) == nil {
				if !seen[id] {
					retrieved = append(retrieved, map[string]interface{}{
						"id": id, "title": title, "content": content, "summary": summary, "source": "keyword",
					})
					seen[id] = true
				}
			}
		}
	}

	if len(retrieved) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"answer":  "I don't have enough information in your stored memories to answer that yet.",
			"sources": []interface{}{},
		})
		return
	}

	// Build context
	var memTexts []string
	for _, r := range retrieved {
		if content, ok := r["content"].(string); ok {
			memTexts = append(memTexts, fmt.Sprintf("Title: %s\n%s", r["title"], content))
		}
	}

	gemini := ai.NewGeminiClient()
	answer, err := gemini.GenerateAnswer(ctx, req.Question, memTexts)
	if err != nil {
		// Fallback - simple concatenation
		answer = "Based on your memories:\n\n"
		for i, r := range retrieved {
			if i < 3 {
				answer += fmt.Sprintf("- %s\n", r["title"])
			}
		}
	}

	sources := make([]map[string]interface{}, 0)
	for _, r := range retrieved {
		sources = append(sources, map[string]interface{}{
			"id": r["id"], "title": r["title"],
		})
	}

	// Limit to unique sources
	c.JSON(http.StatusOK, gin.H{
		"answer":  strings.TrimSpace(answer),
		"sources": sources,
	})
}
