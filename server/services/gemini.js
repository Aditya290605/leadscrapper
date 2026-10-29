// Gemini API — personalized cold outreach and outreach template generation
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured in server/.env. Please add a valid Gemini API key.');
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

/**
 * Clean and parse JSON from model response text
 */
function cleanJsonOutput(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  }
  return JSON.parse(cleaned);
}

/**
 * Generate a personalized cold email for a single lead in ONE single prompt.
 * Returns { subject, body }
 */
async function generateEmail({ businessName, category, city }) {
  const senderName = process.env.SENDER_NAME || 'Your Name';
  const studio = process.env.SENDER_STUDIO || 'Your Studio';
  const model = getModel();

  const prompt = `You are an expert copywriter crafting a cold outreach email.

SENDER: ${senderName} at ${studio} (a digital agency specializing in website design, mobile apps, and booking automations)
RECIPIENT: ${businessName}, a ${category || 'local'} business in ${city || 'the area'} that currently has NO website.

Generate a JSON object with:
1. "subject": A short, intriguing subject line under 7 words. No spam words, no emojis, no quotes.
2. "body": An email body (3 short paragraphs, under 120 words total, plain text only with no greeting or signature lines):
   - Para 1: Compliment the business and note that customers in ${city || 'their area'} searching on Google can't find their official site.
   - Para 2: Briefly explain how a modern website with WhatsApp/online booking helps their specific business model.
   - Para 3: Low-pressure call to action (e.g. "Open to a quick 5-min demo?").

Respond ONLY with valid JSON in this exact structure:
{
  "subject": "...",
  "body": "..."
}`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
  });

  const responseText = result.response.text();
  try {
    const parsed = cleanJsonOutput(responseText);
    return {
      subject: (parsed.subject || '').trim(),
      body: (parsed.body || '').trim(),
    };
  } catch (err) {
    console.warn('[gemini] JSON parse failed, returning raw response:', err.message);
    return {
      subject: `Website for ${businessName}`,
      body: responseText.trim(),
    };
  }
}

/**
 * Generate a master customizable outreach template based on the search query.
 * Produces email template, WhatsApp copy, and specific talking points in 1 API call.
 */
async function generateMasterTemplate({ query, category, city }) {
  const senderName = process.env.SENDER_NAME || 'Your Name';
  const studio = process.env.SENDER_STUDIO || 'Your Studio';
  const model = getModel();

  const niche = category || query || 'Local Business';
  const location = city || 'your city';

  const prompt = `You are a cold outreach and lead conversion specialist.
Create a versatile outreach master template for pitching website design, Google presence, and WhatsApp/online booking systems to ${niche} in ${location} who currently have no website.

Include placeholders like {{business_name}}, {{city}}, {{owner_name}}, {{sender_name}}, and {{sender_phone}} so the user can easily customize and copy-paste.

Respond ONLY with valid JSON matching this schema:
{
  "subjectOptions": [
    "Subject line 1",
    "Subject line 2",
    "Subject line 3"
  ],
  "emailTemplate": "Full email body template with {{business_name}} and {{city}} placeholders (3 punchy paragraphs with conversational tone)",
  "whatsappTemplate": "Short, friendly WhatsApp message (under 60 words) suitable for direct messaging to business owners",
  "talkingPoints": [
    "Industry-specific pain point 1 (e.g. lost bookings, missed calls)",
    "Industry-specific benefit 2 (e.g. WhatsApp automated orders/slots)",
    "Industry-specific benefit 3 (e.g. showing up ahead of local competitors on Google)"
  ]
}`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
  });

  const responseText = result.response.text();
  try {
    const parsed = cleanJsonOutput(responseText);
    return {
      subjectOptions: parsed.subjectOptions || [],
      emailTemplate: (parsed.emailTemplate || '').trim(),
      whatsappTemplate: (parsed.whatsappTemplate || '').trim(),
      talkingPoints: parsed.talkingPoints || [],
      senderName,
      studioName: studio,
    };
  } catch (err) {
    console.error('[gemini] Failed to parse template JSON:', err.message);
    throw new Error('Failed to generate template from AI response');
  }
}

module.exports = {
  generateEmail,
  generateMasterTemplate,
};
