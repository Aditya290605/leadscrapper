// Comprehensive self-check for backend logic (no external dependencies, assert-based)
const assert = require('assert');
const { buildSearchQuery, filterNoWebsite, formatWhatsAppLink } = require('./services/places');
const { generateMasterTemplate, renderTemplateForLead } = require('./services/gemini');

async function runSelfChecks() {
  console.log('Running backend self-checks...');

  // 1. Query builder checks
  assert.strictEqual(
    buildSearchQuery('turf in mumbai', '', ''),
    'turf in mumbai',
    'Direct query should be preserved'
  );

  assert.strictEqual(
    buildSearchQuery('', 'gyms', 'Thane'),
    'gyms in Thane',
    'Category and location should be joined'
  );

  assert.strictEqual(
    buildSearchQuery('', 'turf in mumbai', 'mumbai'),
    'turf in mumbai',
    'Duplicate location should be avoided'
  );

  assert.strictEqual(
    buildSearchQuery('', 'hospital dentist', ''),
    'hospital dentist',
    'Standalone category should work'
  );

  // 2. WhatsApp link generator checks
  assert.strictEqual(
    formatWhatsAppLink('+91 98765 43210'),
    'https://wa.me/919876543210',
    'Indian phone number should format cleanly'
  );

  assert.strictEqual(
    formatWhatsAppLink('9876543210'),
    'https://wa.me/919876543210',
    '10-digit number should prepend 91 country code'
  );

  assert.strictEqual(
    formatWhatsAppLink('085917 22823'),
    'https://wa.me/918591722823',
    'Number with leading zero (STD/trunk prefix) should strip zero and add 91'
  );

  assert.strictEqual(
    formatWhatsAppLink('+91 088286 09966'),
    'https://wa.me/918828609966',
    'Number with +91 0 should strip the 0 after country code'
  );

  // 3. filterNoWebsite checks
  const mockPlaces = [
    {
      id: 'place_1',
      displayName: { text: 'Mumbai Turf Club' },
      formattedAddress: 'Mahalaxmi, Mumbai',
      nationalPhoneNumber: '022 1234 5678',
      rating: 4.5,
      userRatingCount: 120,
      googleMapsUri: 'https://maps.google.com/?cid=1',
      websiteUri: 'https://mumbaiturf.com', // Has website -> SHOULD BE EXCLUDED
    },
    {
      id: 'place_2',
      displayName: { text: 'Power Gym Thane' },
      formattedAddress: 'Naupada, Thane West',
      nationalPhoneNumber: '9876543210',
      rating: 4.2,
      userRatingCount: 45,
      googleMapsUri: 'https://maps.google.com/?cid=2',
      websiteUri: null, // No website -> SHOULD BE INCLUDED
    },
  ];

  const filtered = filterNoWebsite(mockPlaces);
  assert.strictEqual(filtered.length, 1, 'Should keep only the 1 place without a website');
  assert.strictEqual(filtered[0].name, 'Power Gym Thane');
  assert.strictEqual(filtered[0].mapsUrl, 'https://maps.google.com/?cid=2');
  assert.strictEqual(filtered[0].whatsappUrl, 'https://wa.me/919876543210');
  assert(filtered[0].instagramSearchUrl.includes('Power%20Gym%20Thane'), 'Instagram search URL should encode business name');

  // 4. Outreach Template generator checks (fallback / structure test)
  const template = await generateMasterTemplate({ query: 'turf in mumbai', category: 'turf', city: 'Mumbai' });
  assert(template.subjectLines && template.subjectLines.length >= 2, 'Should provide at least 2 subject line options');
  assert(template.emailBody && template.emailBody.includes('{{business_name}}'), 'Email body must have {{business_name}} placeholder');
  assert(template.whatsappMessage && template.whatsappMessage.includes('{{business_name}}'), 'WhatsApp pitch must have {{business_name}} placeholder');
  assert(template.talkingPoints && template.talkingPoints.length > 0, 'Must provide talking points');

  // 5. Template rendering check
  const rendered = renderTemplateForLead(template.emailBody, { name: 'Super Kick Turf', city: 'Mumbai', ownerName: 'Aditya' });
  assert(rendered.includes('Super Kick Turf'), 'Rendered template must contain actual business name');
  assert(!rendered.includes('{{business_name}}'), 'Placeholders should be completely replaced');

  console.log('✅ All backend self-checks passed successfully!');
}

runSelfChecks().catch((err) => {
  console.error('❌ Self-check failed:', err);
  process.exit(1);
});

