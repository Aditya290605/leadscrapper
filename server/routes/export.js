// POST /api/export/xlsx  — styled Excel export with all business details
// POST /api/export/csv   — complete CSV export
const express = require('express');
const ExcelJS = require('exceljs');

const router = express.Router();

// ── XLSX export with styling ────────────────────────────────────────────
router.post('/xlsx', async (req, res) => {
  try {
    const { leads } = req.body;
    if (!leads?.length) return res.status(400).json({ error: 'No leads to export' });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'LeadScrapper';
    const ws = wb.addWorksheet('Businesses Without Websites');

    // Columns with proper widths
    ws.columns = [
      { header: 'Business Name', key: 'name', width: 34 },
      { header: 'Phone Number', key: 'phone', width: 20 },
      { header: 'Email Address', key: 'email', width: 28 },
      { header: 'Avg Rating', key: 'rating', width: 12 },
      { header: 'Review Count', key: 'reviews', width: 14 },
      { header: 'Address', key: 'address', width: 44 },
      { header: 'Google Maps Link', key: 'mapsUrl', width: 36 },
    ];

    // Header row styling
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }; // Matching green brand
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 30;

    // Data rows
    leads.forEach((lead) => {
      ws.addRow({
        name: lead.name || 'Unnamed Business',
        phone: lead.phone || '',
        email: lead.email || '',
        rating: lead.rating !== null && lead.rating !== undefined ? Number(lead.rating) : '—',
        reviews: lead.reviews ?? 0,
        address: lead.address || '',
        mapsUrl: lead.mapsUrl || '',
      });
    });

    // Formatting & Alternating row colors
    ws.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        if (rowNumber % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        }
        row.alignment = { vertical: 'middle', wrapText: true };
        row.height = 24;

        // Make Google Maps cell a clickable link if present
        const mapsCell = row.getCell('mapsUrl');
        if (mapsCell.value && typeof mapsCell.value === 'string' && mapsCell.value.startsWith('http')) {
          mapsCell.value = {
            text: 'View on Maps',
            hyperlink: mapsCell.value,
            tooltip: mapsCell.value,
          };
          mapsCell.font = { color: { argb: 'FF2563EB' }, underline: true };
        }
      }

      // Thin borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.xlsx');

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[export/xlsx] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── CSV export with all lead details ────────────────────────────────────
router.post('/csv', (req, res) => {
  try {
    const { leads } = req.body;
    if (!leads?.length) return res.status(400).json({ error: 'No leads to export' });

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const header = ['Business Name', 'Phone', 'Email', 'Avg Rating', 'Reviews', 'Address', 'Google Maps Link']
      .map(escapeCsv)
      .join(',');

    const rows = leads.map((l) => [
      escapeCsv(l.name || ''),
      escapeCsv(l.phone || ''),
      escapeCsv(l.email || ''),
      escapeCsv(l.rating ?? ''),
      escapeCsv(l.reviews ?? 0),
      escapeCsv(l.address || ''),
      escapeCsv(l.mapsUrl || ''),
    ].join(','));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    res.send([header, ...rows].join('\n'));
  } catch (err) {
    console.error('[export/csv] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
