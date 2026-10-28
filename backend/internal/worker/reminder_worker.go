package worker

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ReminderWorker struct {
	pool *pgxpool.Pool
}

func NewReminderWorker(pool *pgxpool.Pool) *ReminderWorker {
	return &ReminderWorker{pool: pool}
}

func (w *ReminderWorker) Start() {
	if w.pool == nil {
		log.Println("[WARN] Reminder worker not started: no database pool")
		return
	}
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		w.processDue()
	}
}

func (w *ReminderWorker) processDue() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find due pending reminders not yet delivered
	rows, err := w.pool.Query(ctx,
		`SELECT r.id, r.user_id, r.title, r.scheduled_at
		 FROM reminders r
		 LEFT JOIN reminder_deliveries d ON d.reminder_id = r.id AND d.status = 'sent'
		 WHERE r.status = 'pending' AND r.scheduled_at <= NOW() AND d.id IS NULL
		 LIMIT 50`,
	)
	if err != nil {
		log.Printf("[ERROR] worker query failed: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var rid, uid, title string
		var scheduled time.Time
		if rows.Scan(&rid, &uid, &title, &scheduled) != nil {
			continue
		}
		// Create delivery record
		var did string
		err = w.pool.QueryRow(ctx,
			`INSERT INTO reminder_deliveries (reminder_id, user_id, status) VALUES ($1, $2, 'pending') RETURNING id`,
			rid, uid,
		).Scan(&did)
		if err != nil {
			continue
		}
		// Mark as sent (in real app would push notification; for MVP log)
		_, _ = w.pool.Exec(ctx, `UPDATE reminder_deliveries SET status = 'sent', delivered_at = NOW(), attempt_count = 1, last_attempt_at = NOW() WHERE id = $1`, did)
		log.Printf("[REMINDER] Due: user=%s reminder=%s title=%s", uid, rid, title)
	}
}
