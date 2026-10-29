// Gemini API — personalized cold outreach and outreach template generation
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null; // Signals we need fallback mode
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
 * High-converting fallback templates when Gemini API key is absent or offline.
 */
function getFallbackTemplate({ niche, location, senderName, studioName, senderPhone }) {
  const bizNiche = niche || 'your business';
  const loc = location || 'your city';

  return {
    isFallback: true,
    niche: bizNiche,
    location: loc,
    subjectLines: [
      `Quick question regarding {{business_name}}`,
      `Online bookings & website for {{business_name}} in {{city}}`,
      `Noticed {{business_name}} has no website on Google Maps`,
    ],
    emailBody: `Hi {{owner_name}},

Came across {{business_name}} on Google Maps while looking up ${bizNiche} in {{city}}. You've got great reviews, but I noticed you don't have an official website or direct booking link listed.

Right now, potential customers searching on Google end up clicking on competitors who offer instant booking and WhatsApp inquiries. We build modern, lightning-fast websites for ${bizNiche} with automated WhatsApp booking, Google review boosters, and mobile-friendly menus/catalogs.

I put together a quick 2-minute live demo showing what this could look like for {{business_name}}. Are you open to checking it out this week?

Best regards,
{{sender_name}}
{{sender_studio}} | {{sender_phone}}`,
    whatsappMessage: `Hi {{owner_name}}! Came across {{business_name}} on Google Maps in {{city}}. Loved your reviews! Noticed you don't have an online booking website yet — are you still taking all bookings and inquiries manually over phone calls? We build quick WhatsApp-integrated sites for ${bizNiche}. Open to a quick 2-min demo preview?`,
    followUpEmail: `Hi {{owner_name}},

Just following up on my previous note. I know you're busy running {{business_name}}, so no worries at all if you have this handled. 

If you'd like to see how other ${bizNiche} in {{city}} are capturing more bookings from Google Search, let me know and I'll send over the short demo.

Thanks,
{{sender_name}}`,
    talkingPoints: [
      `Customers searching on Google Maps expect an instant WhatsApp or booking link instead of making phone calls.`,
      `Competitors in ${loc} with websites rank higher on Google local search and capture first-time visitors.`,
      `Automating slot/appointment bookings eliminates manual phone scheduling and missed calls during rush hours.`,
    ],
    placeholders: [
      '{{business_name}}',
      '{{city}}',
      '{{owner_name}}',
      '{{sender_name}}',
      '{{sender_studio}}',
      '{{sender_phone}}',
    ],
    senderName,
    studioName,
    senderPhone,
  };
}

/**
 * Generate a personalized cold email for a single lead in ONE single prompt.
 */
async function generateEmail({ businessName, category, city }) {
  const senderName = process.env.SENDER_NAME || 'Aditya Magar';
  const studio = process.env.SENDER_STUDIO || 'Aditya Web Studio';
  const model = getModel();

  if (!model) {
    return {
      subject: `Website & online booking for ${businessName}`,
      body: `Hi there,\n\nCame across ${businessName} in ${city || 'your area'} and noticed you don't have an official website linked on Google Maps.\n\nWe build high-converting websites and WhatsApp booking systems for ${category || 'local businesses'} to help capture customers who search online.\n\nWould you be open to a quick 5-minute preview of what we could build for you?`,
    };
  }

  const prompt = `You are an expert copywriter crafting a cold outreach email.

SENDER: ${senderName} at ${studio} (a studio specializing in website design, mobile apps, and booking automations)
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
    return {
      subject: `Website for ${businessName}`,
      body: responseText.trim(),
    };
  }
}

/**
 * Generate a master customizable outreach template based on the search query.
 * Produces subject lines, email template, WhatsApp copy, follow-up, and talking points.
 */
async function generateMasterTemplate({ query, category, city }) {
  const senderName = process.env.SENDER_NAME || 'Aditya Magar';
  const studioName = process.env.SENDER_STUDIO || 'Aditya Web Studio';
  const senderPhone = process.env.SENDER_PHONE || '+91 98765 43210';

  const niche = (category || query || 'Local Business').trim();
  const location = (city || 'your area').trim();

  const model = getModel();
  if (!model) {
    console.log('[gemini] GEMINI_API_KEY is not configured. Serving intelligent fallback template.');
    return getFallbackTemplate({ niche, location, senderName, studioName, senderPhone });
  }

  const prompt = `You are a cold outreach and lead generation specialist.
Create a versatile outreach master template for pitching website design, Google presence, and WhatsApp/online booking systems to "${niche}" in "${location}" who currently have NO website.

Use standard placeholders like {{business_name}}, {{city}}, {{owner_name}}, {{sender_name}}, {{sender_studio}}, and {{sender_phone}}.

Respond ONLY with valid JSON matching this exact schema:
{
  "subjectLines": [
    "Subject line option 1 (Curiosity/Question)",
    "Subject line option 2 (Value Proposition)",
    "Subject line option 3 (Local Relevance)"
  ],
  "emailBody": "Full email body template with {{business_name}}, {{city}}, {{owner_name}}, {{sender_name}}, and {{sender_studio}} placeholders. 3 punchy, conversational paragraphs.",
  "whatsappMessage": "Short, friendly WhatsApp message (under 55 words) suitable for direct messaging to business owners with {{business_name}} and {{city}} placeholders.",
  "followUpEmail": "A short 2-3 sentence follow-up email template to send 3 days later if they didn't reply.",
  "talkingPoints": [
    "Industry-specific pain point 1 (e.g. lost bookings or missed calls)",
    "Industry-specific benefit 2 (e.g. WhatsApp automated orders/slots)",
    "Industry-specific benefit 3 (e.g. beating local competitors on Google Maps)"
  ]
}`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    const parsed = cleanJsonOutput(result.response.text());
    return {
      isFallback: false,
      niche,
      location,
      subjectLines: parsed.subjectLines || [],
      emailBody: (parsed.emailBody || '').trim(),
      whatsappMessage: (parsed.whatsappMessage || '').trim(),
      followUpEmail: (parsed.followUpEmail || '').trim(),
      talkingPoints: parsed.talkingPoints || [],
      placeholders: [
        '{{business_name}}',
        '{{city}}',
        '{{owner_name}}',
        '{{sender_name}}',
        '{{sender_studio}}',
        '{{sender_phone}}',
      ],
      senderName,
      studioName,
      senderPhone,
    };
  } catch (err) {
    console.warn('[gemini] AI generation failed, using fallback template:', err.message);
    const fallback = getFallbackTemplate({ niche, location, senderName, studioName, senderPhone });
    fallback.error = err.message;
    return fallback;
  }
}

/**
 * Replace placeholders in template text with actual lead details.
 */
function renderTemplateForLead(templateText, lead, senderInfo = {}) {
  if (!templateText) return '';
  const senderName = senderInfo.senderName || process.env.SENDER_NAME || 'Aditya Magar';
  const studioName = senderInfo.studioName || process.env.SENDER_STUDIO || 'Aditya Web Studio';
  const senderPhone = senderInfo.senderPhone || process.env.SENDER_PHONE || '+91 98765 43210';

  return templateText
    .replace(/\{\{business_name\}\}/gi, lead.name || 'there')
    .replace(/\{\{city\}\}/gi, lead.city || 'your area')
    .replace(/\{\{owner_name\}\}/gi, lead.ownerName || lead.name || 'there')
    .replace(/\{\{sender_name\}\}/gi, senderName)
    .replace(/\{\{sender_studio\}\}/gi, studioName)
    .replace(/\{\{sender_phone\}\}/gi, senderPhone);
}

module.exports = {
  generateEmail,
  generateMasterTemplate,
  renderTemplateForLead,
};
