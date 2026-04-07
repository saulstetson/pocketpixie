const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { db } = require('./db');
const { checkReservations } = require('./scraper');
const alertRoutes = require('./routes/alerts');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/alerts', alertRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Run the scraper every 2 minutes for all active alerts
cron.schedule('*/2 * * * *', async () => {
  console.log('[cron] Checking reservations...');
  const alerts = db.prepare(`
    SELECT * FROM alerts WHERE status = 'watching' AND end_date >= date('now')
  `).all();

  for (const alert of alerts) {
    await checkReservations(alert);
  }
});

// Expire alerts whose end date has passed
cron.schedule('0 * * * *', () => {
  db.prepare(`
    UPDATE alerts SET status = 'expired' WHERE end_date < date('now') AND status = 'watching'
  `).run();
  console.log('[cron] Expired old alerts.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PocketPixie running on port ${PORT}`));
