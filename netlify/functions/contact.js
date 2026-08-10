// Netlify Function: /.netlify/functions/contact
// Receives the contact form POST, validates it server-side, and sends an email
// notification to the site owner via the Resend API (https://resend.com).
//
// Why Resend and not raw SMTP: no mail server to run/maintain, generous free tier,
// simple HTTP API. Swap for SendGrid/Mailgun/SES easily - only sendEmail() below
// needs to change.
//
// SETUP (not covered by this file - see README.md):
//   1. Create a Resend account, verify the kkcoaching.fit domain.
//   2. Set environment variables in Netlify dashboard:
//        RESEND_API_KEY   - your Resend API key
//        CONTACT_TO_EMAIL - the address enquiries should land in (owner's inbox)
//        CONTACT_FROM_EMAIL - a verified sender, e.g. noreply@kkcoaching.fit

const RESEND_API_URL = 'https://api.resend.com/emails';

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // --- Honeypot: bots fill every field, real users never see or fill this one. ---
  if (data.company) {
    // Pretend success so the bot doesn't learn anything - don't send an email though.
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  // --- Server-side validation (never trust the client alone) ---
  const required = ['name', 'email', 'phone', 'goal', 'consent'];
  const missing = required.filter((field) => !data[field]);
  if (missing.length > 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Missing required fields: ${missing.join(', ')}` })
    };
  }
  if (!isValidEmail(data.email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email address' }) };
  }

  // Basic length caps to keep the email readable and reduce spam payload size.
  const cap = (val, max) => String(val || '').slice(0, max);

  const safe = {
    name: cap(data.name, 100),
    email: cap(data.email, 150),
    phone: cap(data.phone, 40),
    location: cap(data.location, 100),
    language: cap(data.language, 30),
    interest: cap(data.interest, 60),
    goal: cap(data.goal, 1000),
    blocker: cap(data.blocker, 1000)
  };

  const htmlBody = `
    <h2>New enquiry from kkcoaching.fit</h2>
    <p><strong>Name:</strong> ${escapeHtml(safe.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(safe.email)}</p>
    <p><strong>Phone / WhatsApp:</strong> ${escapeHtml(safe.phone)}</p>
    <p><strong>Location:</strong> ${escapeHtml(safe.location)}</p>
    <p><strong>Preferred language:</strong> ${escapeHtml(safe.language)}</p>
    <p><strong>Interested in:</strong> ${escapeHtml(safe.interest)}</p>
    <p><strong>Main goal:</strong><br>${escapeHtml(safe.goal)}</p>
    <p><strong>What's holding them back:</strong><br>${escapeHtml(safe.blocker)}</p>
  `;

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL,
        to: process.env.CONTACT_TO_EMAIL,
        reply_to: safe.email, // owner can hit "reply" and it goes straight to the enquirer
        subject: `New KK Coaching enquiry - ${safe.name}`,
        html: htmlBody
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Resend API error:', errText);
      return { statusCode: 502, body: JSON.stringify({ error: 'Email provider error' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Contact function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
