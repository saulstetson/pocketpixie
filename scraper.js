const axios = require('axios');
const { db } = require('./db');
const { sendNotification } = require('./notifications');

// Disney dining availability endpoint
const DISNEY_API = 'https://disneyworld.disney.go.com/dining-reservation/availability/search';

// Map friendly names to Disney's internal facility IDs
const RESTAURANT_IDS = {
  "Be Our Guest":              "90002424",
  "Cinderella's Royal Table":  "90001563",
  "Oga's Cantina":             "18521172",
  "California Grill":          "90002479",
  "Topolino's Terrace":        "18911593",
  "'Ohana":                    "90002195",
  "Space 220":                 "19748368",
  "Sanaa":                     "90002271",
  "Skipper Canteen":           "18482172",
  "The BOATHOUSE":             "18706495",
};

const MEAL_MAP = {
  Breakfast: 80000712,
  Lunch:     80000717,
  Dinner:    80000714,
  Brunch:    80000715,
  Any:       null,
};

async function checkReservations(alert) {
  const facilityId = RESTAURANT_IDS[alert.restaurant];
  if (!facilityId) {
    console.warn(`[scraper] Unknown restaurant: ${alert.restaurant}`);
    return;
  }

  // Build a list of dates to check between start_date and end_date
  const dates = getDatesInRange(alert.start_date, alert.end_date);

  for (const date of dates) {
    try {
      const slots = await fetchAvailability(facilityId, date, alert.party_size, alert.meal);
      for (const slot of slots) {
        if (!matchesTimePref(slot.time, alert.time_pref)) continue;
        if (isDuplicate(alert.id, date, slot.time)) continue;

        console.log(`[scraper] Found: ${alert.restaurant} on ${date} at ${slot.time}`);

        // Save to DB
        db.prepare(`
          INSERT INTO notifications (alert_id, restaurant, date, time, party_size, booking_url)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(alert.id, alert.restaurant, date, slot.time, alert.party_size, slot.bookingUrl);

        // Send email + SMS
        await sendNotification(alert, { date, time: slot.time, bookingUrl: slot.bookingUrl });
      }
    } catch (err) {
      console.error(`[scraper] Error checking ${alert.restaurant} on ${date}:`, err.message);
    }

    // Polite delay between requests to avoid rate limiting
    await sleep(1500);
  }
}

async function fetchAvailability(facilityId, date, partySize, meal) {
  const mealId = MEAL_MAP[meal] || null;

  const params = {
    facilityId,
    date,
    partySize,
    ...(mealId && { mealPeriod: mealId }),
  };

  const response = await axios.get(DISNEY_API, {
    params,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PocketPixie/1.0)',
      'Accept': 'application/json',
      'Referer': 'https://disneyworld.disney.go.com/',
    },
    timeout: 10000,
  });

  const data = response.data;

  // Parse Disney's response format into { time, bookingUrl }
  if (!data?.availability?.length) return [];

  return data.availability.map(slot => ({
    time: slot.time,
    bookingUrl: buildBookingUrl(facilityId, date, slot.time, partySize),
  }));
}

function buildBookingUrl(facilityId, date, time, partySize) {
  const base = 'https://disneyworld.disney.go.com/dining-reservation/setup-order/table-service';
  return `${base}/?facilityId=${facilityId}&startDate=${date}&startTime=${encodeURIComponent(time)}&partySize=${partySize}`;
}

function isDuplicate(alertId, date, time) {
  const row = db.prepare(`
    SELECT id FROM notifications
    WHERE alert_id = ? AND date = ? AND time = ?
    AND sent_at >= datetime('now', '-24 hours')
  `).get(alertId, date, time);
  return !!row;
}

function matchesTimePref(time, pref) {
  if (!pref || pref === 'Any time') return true;
  const hour = parseInt(time.split(':')[0]);
  if (pref === 'Before 12pm') return hour < 12;
  if (pref === '12pm – 3pm') return hour >= 12 && hour < 15;
  if (pref === '3pm – 6pm')  return hour >= 15 && hour < 18;
  if (pref === 'After 6pm')  return hour >= 18;
  return true;
}

function getDatesInRange(start, end) {
  const dates = [];
  const cur = new Date(start + 'T12:00:00Z');
  const last = new Date(end + 'T12:00:00Z');
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { checkReservations };
