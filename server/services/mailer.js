// Gmail SMTP mailer — sends HTML emails with professional template
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const DNC_PATH = path.join(__dirname, '..', 'data', 'do-not-contact.json');

// ── Daily cap tracking (in-memory, resets on server restart) ────────────
const sendLog = { date: null, count: 0 };

function checkDailyCap() {
  const today = new Date().toISOString().slice(0, 10);
  if (sendLog.date !== today) {
    sendLog.date = today;
    sendLog.count = 0;
  }
  const cap = parseInt(process.env.DAILY_EMAIL_CAP || '50', 10);
  return sendLog.count < cap;
}

function incrementSendCount() {
  const today = new Date().toISOString().slice(0, 10);
  if (sendLog.date !== today) {
    sendLog.date = today;
    sendLog.count = 0;
  }
  sendLog.count++;
}

function getSendStats() {
  const today = new Date().toISOString().slice(0, 10);
  if (sendLog.date !== today) return { date: today, sent: 0, cap: parseInt(process.env.DAILY_EMAIL_CAP || '50', 10) };
  return { date: sendLog.date, sent: sendLog.count, cap: parseInt(process.env.DAILY_EMAIL_CAP || '50', 10) };
}

// ── Do-Not-Contact list ─────────────────────────────────────────────────
function getDncList() {
  try {
    return JSON.parse(fs.readFileSync(DNC_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function addToDnc(email) {
  const list = getDncList();
  const normalized = email.toLowerCase().trim();
  if (!list.includes(normalized)) {
    list.push(normalized);
    fs.writeFileSync(DNC_PATH, JSON.stringify(list, null, 2));
  }
  return list;
}

function isOnDnc(email) {
  return getDncList().includes(email.toLowerCase().trim());
}

// ── Gmail transport ─────────────────────────────────────────────────────
function createTransport() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be set in .env');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ── HTML email template with banner ─────────────────────────────────────
// Using table-based layout for maximum email client compatibility.
// Inline styles because email clients strip <style> blocks.
function buildHtml(bodyText, { senderName, senderPhone, senderEmail, ctaUrl, studioName }) {
  // Convert plain text line breaks to <br> for HTML body
  const htmlBody = bodyText
    .split('\n')
    .map((line) => (line.trim() === '' ? '<br>' : `<p style="margin:0 0 12px;line-height:1.6;">${line}</p>`))
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f0f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f0f0f5;">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- ═══ Banner ═══ -->
  <tr>
    <td style="background:#667eea;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:36px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">${studioName}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;font-weight:400;">Web &bull; Apps &bull; Automation</p>
    </td>
  </tr>

  <!-- ═══ Greeting ═══ -->
  <tr>
    <td style="padding:32px 40px 0;">
      <p style="margin:0;font-size:16px;color:#1a1a2e;font-weight:600;">Hi there,</p>
    </td>
  </tr>

  <!-- ═══ Body ═══ -->
  <tr>
    <td style="padding:16px 40px 0;font-size:15px;color:#333344;">
      ${htmlBody}
    </td>
  </tr>

  <!-- ═══ CTA Button ═══ -->
  <tr>
    <td style="padding:24px 40px 32px;text-align:center;">
      <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:14px 36px;background:#667eea;background:linear-gradient(135deg,#667eea,#764ba2);color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">Let\u2019s Talk &rarr;</a>
    </td>
  </tr>

  <!-- ═══ Divider ═══ -->
  <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e8e8f0;margin:0;"></td></tr>

  <!-- ═══ Footer ═══ -->
  <tr>
    <td style="padding:24px 40px;text-align:center;font-size:13px;color:#9999aa;">
      <p style="margin:0;font-weight:500;">${senderName}</p>
      <p style="margin:4px 0 0;">${senderPhone}</p>
      <p style="margin:12px 0 0;font-size:11px;color:#bbbbcc;">
        You\u2019re receiving this because we think our services could help your business.
        <br>
        <a href="mailto:${senderEmail}?subject=Unsubscribe&body=Please%20remove%20me%20from%20your%20mailing%20list." style="color:#9999aa;text-decoration:underline;">Unsubscribe</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Send a single email ─────────────────────────────────────────────────
async function sendEmail({ to, subject, bodyText }) {
  // Preflight checks
  if (isOnDnc(to)) {
    return { to, status: 'skipped', reason: 'on do-not-contact list' };
  }
  if (!checkDailyCap()) {
    return { to, status: 'failed', reason: 'daily send cap reached' };
  }

  const senderName = process.env.SENDER_NAME || 'Your Name';
  const senderEmail = process.env.GMAIL_USER;
  const senderPhone = process.env.SENDER_PHONE || '';
  const studioName = process.env.SENDER_STUDIO || 'Your Studio';
  const ctaUrl = process.env.CTA_URL || `mailto:${senderEmail}`;

  const html = buildHtml(bodyText, { senderName, senderPhone, senderEmail, ctaUrl, studioName });
  const transport = createTransport();

  try {
    await transport.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      text: bodyText, // plain-text fallback
      html,
    });
    incrementSendCount();
    return { to, status: 'sent' };
  } catch (err) {
    return { to, status: 'failed', reason: err.message };
  }
}

module.exports = { sendEmail, getDncList, addToDnc, isOnDnc, getSendStats };
