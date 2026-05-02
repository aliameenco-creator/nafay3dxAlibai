require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests. Please try again in 15 minutes.' }
});

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name, email, company, interest, message, website } = req.body ?? {};

  // Honeypot: bots fill this, humans don't see it
  if (website) return res.json({ ok: true });

  const emailRE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ ok: false, error: 'Please fill in your name, email, and message.' });
  }
  if (!emailRE.test(email.trim())) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
  }
  if (name.length > 100 || email.length > 200 || message.length > 5000) {
    return res.status(400).json({ ok: false, error: 'One or more fields are too long.' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  const subject = `New inquiry from ${escapeHtml(name)}${company ? ` · ${escapeHtml(company)}` : ''} — ${escapeHtml(interest ?? 'General')}`;

  const html = `<!DOCTYPE html>
<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="border-bottom:2px solid #c99a45;padding-bottom:12px;color:#0c0d12">
    New inquiry — Ali Baii Official
  </h2>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px 4px;font-weight:bold;color:#555;width:100px">Name</td><td style="padding:8px 4px">${escapeHtml(name)}</td></tr>
    <tr><td style="padding:8px 4px;font-weight:bold;color:#555">Email</td><td style="padding:8px 4px"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
    <tr><td style="padding:8px 4px;font-weight:bold;color:#555">Company</td><td style="padding:8px 4px">${escapeHtml(company || '—')}</td></tr>
    <tr><td style="padding:8px 4px;font-weight:bold;color:#555">Interest</td><td style="padding:8px 4px">${escapeHtml(interest || '—')}</td></tr>
  </table>
  <div style="background:#f5f4f0;padding:16px;border-radius:4px;border-left:3px solid #c99a45">
    <strong style="color:#555">Message:</strong>
    <p style="margin:8px 0 0;white-space:pre-wrap;color:#333">${escapeHtml(message)}</p>
  </div>
  <p style="margin-top:24px;font-size:12px;color:#999">
    Sent from alibaii.com contact form · Reply to this email to respond directly to ${escapeHtml(email)}.
  </p>
</body></html>`;

  try {
    await transporter.sendMail({
      from: `"Ali Baii Official" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      replyTo: email.trim(),
      subject,
      html
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err.message);
    res.status(500).json({ ok: false, error: 'Message failed to send. Please try emailing us directly.' });
  }
});

app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));

app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ali Baii Official → http://localhost:${PORT}`);
});
