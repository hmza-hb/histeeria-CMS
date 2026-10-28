package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type ExtractionResult struct {
	Title      string   `json:"title"`
	Summary    string   `json:"summary"`
	Facts      []string `json:"facts"`
	People     []string `json:"people"`
	Places     []string `json:"places"`
	Events     []string `json:"events"`
	Dates      []string `json:"dates"`
	Commitments []string `json:"commitments"`
	Categories []string `json:"categories"`
}

type GeminiClient struct {
	apiKey string
}

func NewGeminiClient() *GeminiClient {
	return &GeminiClient{apiKey: os.Getenv("GEMINI_API_KEY")}
}

func (g *GeminiClient) ExtractMemory(ctx context.Context, content string) (*ExtractionResult, error) {
	if g.apiKey == "" {
		return nil, fmt.Errorf("gemini api key not configured")
	}
	prompt := fmt.Sprintf(`Extract structured information from the following personal memory. Return valid JSON with keys: title, summary, facts, people, places, events, dates, commitments, categories. Be concise and grounded only in the text.

Text: %s`, content)

	body := map[string]interface{}{
		"contents": []map[string]interface{}{
			{"parts": []map[string]string{{"text": prompt}}},
		},
		"generationConfig": map[string]interface{}{
			"temperature":     0.2,
			"responseMimeType": "application/json",
		},
	}
	jsonBody, _ := json.Marshal(body)
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=%s", g.apiKey)
	req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("gemini api error: %d", resp.StatusCode)
	}
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	// Extract text
	candidates, _ := result["candidates"].([]interface{})
	if len(candidates) == 0 {
		return nil, fmt.Errorf("no candidates")
	}
	cand := candidates[0].(map[string]interface{})
	contentMap := cand["content"].(map[string]interface{})
	parts := contentMap["parts"].([]interface{})
	part := parts[0].(map[string]interface{})
	text, _ := part["text"].(string)
	var ext ExtractionResult
	if err := json.Unmarshal([]byte(text), &ext); err != nil {
		return nil, err
	}
	return &ext, nil
}

func (g *GeminiClient) GenerateAnswer(ctx context.Context, question string, memories []string) (string, error) {
	if g.apiKey == "" {
		return "", fmt.Errorf("gemini api key not configured")
	}
	prompt := fmt.Sprintf(`You are Histeeria, a personal memory assistant. Answer the user's question ONLY using the provided memories. If the answer is not found in the memories, say so clearly and do not hallucinate. Be natural and concise.

Question: %s

Memories:
%s`, question, joinMemories(memories))

	body := map[string]interface{}{
		"contents": []map[string]interface{}{
			{"parts": []map[string]string{{"text": prompt}}},
		},
		"generationConfig": map[string]interface{}{
			"temperature": 0.3,
		},
	}
	jsonBody, _ := json.Marshal(body)
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=%s", g.apiKey)
	req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("gemini api error: %d", resp.StatusCode)
	}
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	candidates := result["candidates"].([]interface{})
	if len(candidates) == 0 {
		return "", fmt.Errorf("no candidates")
	}
	cand := candidates[0].(map[string]interface{})
	contentMap := cand["content"].(map[string]interface{})
	parts := contentMap["parts"].([]interface{})
	part := parts[0].(map[string]interface{})
	text, _ := part["text"].(string)
	return text, nil
}

func joinMemories(memories []string) string {
	result := ""
	for i, m := range memories {
		result += fmt.Sprintf("--- Memory %d ---\n%s\n\n", i+1, m)
	}
	return result
}
