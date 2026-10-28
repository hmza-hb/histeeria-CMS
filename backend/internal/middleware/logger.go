package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

func StructuredLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		statusCode := c.Writer.Status()
		clientIP := c.ClientIP()
		method := c.Request.Method

		if raw != "" {
			path = path + "?" + raw
		}

		log.Printf("[HTTP] %s %s %d %v %s", method, path, statusCode, latency, clientIP)
	}
}
