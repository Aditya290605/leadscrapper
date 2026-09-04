# LeadScrapper

Find businesses without websites → export to Excel → send AI-personalized outreach emails.

## Quick Start

```bash
# Install everything
npm run install:all

# Add your API keys
cp server/.env.example server/.env
# Edit server/.env with your keys (see below)

# Run both (in separate terminals)
npm run dev:server   # Express API on :3001
npm run dev:client   # Vite React on :5173
```

Open http://localhost:5173

## API Keys You Need

| Key | Where to get it | Free tier |
|-----|-----------------|-----------|
| Google Places API | [Cloud Console](https://console.cloud.google.com/) → enable "Places API (New)" → Credentials → API Key | $200/month credit (~90 searches of 100 results) |
| Gemini API | [AI Studio](https://aistudio.google.com/app/apikey) → Create API Key | 15 RPM, 1M tokens/day free |
| Gmail App Password | [Google Account](https://myaccount.google.com/apppasswords) (requires 2FA enabled) | 500 emails/day |

## Project Structure

```
server/
  services/places.js   — Google Places API wrapper
  services/gemini.js   — Gemini email generation
  services/mailer.js   — Gmail SMTP + HTML template
  routes/search.js     — POST /api/search
  routes/export.js     — POST /api/export/xlsx, /csv
  routes/email.js      — POST /api/email/generate, /send

client/
  src/App.jsx           — Main app (3-tab flow)
  src/components/
    SearchForm.jsx      — Category + city input
    ResultsTable.jsx    — Results with checkboxes + export
    EmailPreview.jsx    — AI email drafts + send
```

## Flow

1. **Search** — enter category + city → finds businesses via Google Places API → filters to those without websites
2. **Results** — review table, fill in emails manually, export to XLSX/CSV
3. **Email** — generate AI-personalized emails via Gemini → edit → send via Gmail

## Notes

- **Emails are NOT available from Google Places API.** You add them manually in the results table.
- **Gmail has a 500 emails/day limit.** Default cap is set to 50 in `.env`.
- **Do-not-contact list** lives in `server/data/do-not-contact.json`. Managed via API.
- **Every email includes an unsubscribe link** per Indian IT Act compliance.