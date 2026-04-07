const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/alerts — list all alerts for an email
router.get('/', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'email required' });

  const alerts = db.prepare(`
    SELECT * FROM alerts WHERE email = ? ORDER BY created_at DESC
  `).all(email);

  res.json(alerts);
});

// POST /api/alerts — create a new alert
router.post('/', (req, res) => {
  const { restaurant, meal, start_date, end_date, party_size, time_pref, email, phone } = req.body;

  if (!restaurant || !meal || !start_date || !end_date || !party_size || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (new Date(end_date) < new Date(start_date)) {
    return res.status(400).json({ error: 'end_date must be after start_date' });
  }

  const result = db.prepare(`
    INSERT INTO alerts (restaurant, meal, start_date, end_date, party_size, time_pref, email, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(restaurant, meal, start_date, end_date, party_size, time_pref || 'Any time', email, phone || null);

  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(alert);
});

// PATCH /api/alerts/:id/pause — pause an alert
router.patch('/:id/pause', (req, res) => {
  db.prepare(`UPDATE alerts SET status = 'paused' WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// PATCH /api/alerts/:id/resume — resume a paused alert
router.patch('/:id/resume', (req, res) => {
  db.prepare(`UPDATE alerts SET status = 'watching' WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// DELETE /api/alerts/:id — remove an alert
router.delete('/:id', (req, res) => {
  db.prepare(`DELETE FROM alerts WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// GET /api/alerts/:id/notifications — get all notifications for an alert
router.get('/:id/notifications', (req, res) => {
  const notifs = db.prepare(`
    SELECT * FROM notifications WHERE alert_id = ? ORDER BY sent_at DESC
  `).all(req.params.id);
  res.json(notifs);
});

module.exports = router;
