package embedding

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type Client struct {
	apiKey string
	model  string
}

func New() *Client {
	model := os.Getenv("EMBEDDING_MODEL")
	if model == "" {
		model = "text-embedding-004"
	}
	return &Client{
		apiKey: os.Getenv("GEMINI_API_KEY"),
		model:  model,
	}
}

func (c *Client) EmbedText(ctx context.Context, text string) ([]float32, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("gemini api key not configured")
	}
	model := c.model
	if model == "" {
		model = "text-embedding-004"
	}
	body := map[string]interface{}{
		"model": fmt.Sprintf("models/%s", model),
		"content": map[string]interface{}{
			"parts": []map[string]string{{"text": text}},
		},
	}
	jsonBody, _ := json.Marshal(body)
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:embedContent?key=%s", model, c.apiKey)
	req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("embedding api error: %d", resp.StatusCode)
	}
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	embedding := result["embedding"].(map[string]interface{})
	values := embedding["values"].([]interface{})
	vec := make([]float32, len(values))
	for i, v := range values {
		switch val := v.(type) {
		case float64:
			vec[i] = float32(val)
		default:
			vec[i] = 0
		}
	}
	return vec, nil
}

func VectorToString(vec []float32) string {
	s := "["
	for i, v := range vec {
		if i > 0 {
			s += ","
		}
		s += fmt.Sprintf("%f", v)
	}
	s += "]"
	return s
}
