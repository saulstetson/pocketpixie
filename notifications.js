const nodemailer = require('nodemailer');
const twilio = require('twilio');

// --- Email (via SMTP / Gmail) ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// --- Twilio SMS ---
const twilioClient = process.env.TWILIO_ACCOUNT_SID
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

async function sendNotification(alert, slot) {
  const { date, time, bookingUrl } = slot;
  const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const subject = `PocketPixie: ${alert.restaurant} is available!`;
  const body = `
A reservation just opened up that matches your alert!

Restaurant:  ${alert.restaurant}
Date:        ${dateFormatted}
Time:        ${time}
Party size:  ${alert.party_size}

Book now (link expires fast):
${bookingUrl}

---
PocketPixie will keep watching until ${alert.end_date}.
Reply STOP to opt out of SMS alerts.
  `.trim();

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#185FA5;">A table just opened up!</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#666;">Restaurant</td><td style="padding:6px 0;font-weight:500;">${alert.restaurant}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Date</td><td style="padding:6px 0;">${dateFormatted}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Time</td><td style="padding:6px 0;">${time}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Party size</td><td style="padding:6px 0;">${alert.party_size} guests</td></tr>
      </table>
      <a href="${bookingUrl}" style="display:inline-block;margin-top:20px;background:#185FA5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;">
        Book now on Disney's website →
      </a>
      <p style="color:#999;font-size:12px;margin-top:24px;">
        PocketPixie is not affiliated with Disney. Reservations may be claimed by others before you tap Book.
      </p>
    </div>
  `;

  // Send email
  try {
    await transporter.sendMail({
      from: `"PocketPixie" <${process.env.SMTP_USER}>`,
      to: alert.email,
      subject,
      text: body,
      html: htmlBody,
    });
    console.log(`[notify] Email sent to ${alert.email}`);
  } catch (err) {
    console.error('[notify] Email failed:', err.message);
  }

  // Send SMS if phone provided and Twilio configured
  if (alert.phone && twilioClient) {
    const smsBody = `PocketPixie: ${alert.restaurant} open ${time} on ${dateFormatted} for ${alert.party_size}. Book: ${bookingUrl}`;
    try {
      await twilioClient.messages.create({
        body: smsBody,
        from: process.env.TWILIO_PHONE,
        to: alert.phone,
      });
      console.log(`[notify] SMS sent to ${alert.phone}`);
    } catch (err) {
      console.error('[notify] SMS failed:', err.message);
    }
  }
}

module.exports = { sendNotification };
