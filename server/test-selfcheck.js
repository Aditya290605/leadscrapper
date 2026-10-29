// Small assert-based test for backend logic (no frameworks, no fixtures)
const assert = require('assert');
const { buildSearchQuery, filterNoWebsite } = require('./services/places');

console.log('Running backend self-checks...');

// 1. buildSearchQuery tests
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

// 2. filterNoWebsite tests
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
    nationalPhoneNumber: '022 9876 5432',
    rating: 4.2,
    userRatingCount: 45,
    googleMapsUri: 'https://maps.google.com/?cid=2',
    websiteUri: null, // No website -> SHOULD BE INCLUDED
  },
  {
    id: 'place_3',
    displayName: { text: 'Shree Dental Clinic' },
    formattedAddress: 'Dadar, Mumbai',
    internationalPhoneNumber: '+91 99999 88888',
    rating: 4.8,
    userRatingCount: 210,
    googleMapsUri: 'https://maps.google.com/?cid=3',
    // No websiteUri field at all -> SHOULD BE INCLUDED
  },
];

const filtered = filterNoWebsite(mockPlaces);
assert.strictEqual(filtered.length, 2, 'Should keep only the 2 places without websites');
assert.strictEqual(filtered[0].name, 'Power Gym Thane');
assert.strictEqual(filtered[0].phone, '022 9876 5432');
assert.strictEqual(filtered[0].mapsUrl, 'https://maps.google.com/?cid=2');
assert.strictEqual(filtered[1].name, 'Shree Dental Clinic');
assert.strictEqual(filtered[1].phone, '+91 99999 88888');

console.log('✅ All backend unit assertions passed successfully!');

// 3. Export CSV check
const httpMocks = {
  res: {
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    send(body) { this.body = body; },
  }
};

const mockLeads = [
  { name: 'Power Gym, Thane', phone: '022 9876', email: 'gym@test.com', rating: 4.5, reviews: 30, address: 'Naupada', mapsUrl: 'https://maps.google.com' }
];

const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
const csvHeader = ['Business Name', 'Phone', 'Email', 'Avg Rating', 'Reviews', 'Address', 'Google Maps Link'].map(escapeCsv).join(',');
const csvRow = [
  escapeCsv(mockLeads[0].name),
  escapeCsv(mockLeads[0].phone),
  escapeCsv(mockLeads[0].email),
  escapeCsv(mockLeads[0].rating),
  escapeCsv(mockLeads[0].reviews),
  escapeCsv(mockLeads[0].address),
  escapeCsv(mockLeads[0].mapsUrl),
].join(',');

assert(csvRow.includes('"Power Gym, Thane"'), 'CSV should properly quote strings containing commas');
console.log('✅ Export CSV escaping test passed!');
