const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'pocketpixie.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS alerts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant  TEXT    NOT NULL,
    meal        TEXT    NOT NULL,
    start_date  TEXT    NOT NULL,
    end_date    TEXT    NOT NULL,
    party_size  INTEGER NOT NULL,
    time_pref   TEXT    DEFAULT 'Any time',
    email       TEXT    NOT NULL,
    phone       TEXT,
    status      TEXT    DEFAULT 'watching',
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id    INTEGER NOT NULL,
    restaurant  TEXT    NOT NULL,
    date        TEXT    NOT NULL,
    time        TEXT    NOT NULL,
    party_size  INTEGER NOT NULL,
    booking_url TEXT,
    sent_at     TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (alert_id) REFERENCES alerts(id)
  );
`);

module.exports = { db };
