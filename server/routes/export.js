// POST /api/export/xlsx  — styled Excel export
// POST /api/export/csv   — plain CSV of emails + phones
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
    const ws = wb.addWorksheet('Leads');

    // Columns with widths
    ws.columns = [
      { header: 'Business Name', key: 'name', width: 32 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Rating', key: 'rating', width: 10 },
      { header: 'Reviews', key: 'reviews', width: 10 },
      { header: 'Email', key: 'email', width: 28 },
    ];

    // Header row styling
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF667EEA' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    // Data rows
    leads.forEach((lead) => {
      ws.addRow({
        name: lead.name,
        phone: lead.phone,
        address: lead.address,
        rating: lead.rating ?? '—',
        reviews: lead.reviews ?? 0,
        email: lead.email || '',
      });
    });

    // Alternate row shading
    ws.eachRow((row, i) => {
      if (i > 1 && i % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5FF' } };
      }
      row.alignment = { vertical: 'middle', wrapText: true };
    });

    // Borders
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
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

// ── CSV export (emails + phones only) ───────────────────────────────────
router.post('/csv', (req, res) => {
  try {
    const { leads } = req.body;
    if (!leads?.length) return res.status(400).json({ error: 'No leads to export' });

    const header = 'Business Name,Phone,Email';
    const rows = leads.map(
      (l) => `"${(l.name || '').replace(/"/g, '""')}","${l.phone || ''}","${l.email || ''}"`
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    res.send([header, ...rows].join('\n'));
  } catch (err) {
    console.error('[export/csv] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
