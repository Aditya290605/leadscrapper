// Gemini API — generate personalized cold outreach emails
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

function getModel() {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set in .env');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

/**
 * Generate a personalized cold email for a single lead.
 * Returns { subject, body } — plain text body (HTML wrapping is done by mailer).
 */
async function generateEmail({ businessName, category, city }) {
  const senderName = process.env.SENDER_NAME || 'Your Name';
  const studio = process.env.SENDER_STUDIO || 'Your Studio';
  const model = getModel();

  const prompt = `You are writing a professional cold outreach email.

FROM: ${senderName} at ${studio} (a freelance studio offering website development, app development, and business automation services)
TO: ${businessName}, a ${category} business in ${city} that currently has NO website.

Write ONLY the email body (3 short paragraphs, under 120 words total):
- Paragraph 1: Notice they don't have a website and mention how competitors in ${city} are using websites to attract more customers.
- Paragraph 2: Briefly pitch how a modern website + optional automation (online booking, WhatsApp integration, Google reviews) could help their specific type of business.
- Paragraph 3: Soft CTA — suggest a quick 10-minute call, no pressure.

Rules:
- Warm and conversational tone, NOT salesy or pushy
- Do NOT include a subject line, greeting (Hi/Dear), or sign-off/signature
- Do NOT use markdown formatting — plain text only
- Be specific to their business type, not generic`;

  const bodyResult = await model.generateContent(prompt);
  const body = bodyResult.response.text().trim();

  const subjectPrompt = `Write ONE short email subject line (under 8 words) for a cold outreach to "${businessName}", a ${category} in ${city}, about building them a website. No quotes, no emojis, no punctuation at the end. Just the subject line text.`;
  const subjectResult = await model.generateContent(subjectPrompt);
  const subject = subjectResult.response.text().trim();

  return { subject, body };
}

module.exports = { generateEmail };
