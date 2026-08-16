// ─────────────────────────────────────────────────────────────────────────────
// ERMS — HOD Lab Report PDF Generator
// Faculty of Engineering, University of Jaffna
// ─────────────────────────────────────────────────────────────────────────────

export function buildLabReportData(requests, purchaseRequests, labId, labEquipmentNames = []) {
  const lid = String(labId)
  const inLab = (Array.isArray(requests) ? requests : []).filter(r => String(r.labId) === lid)
  const labName = inLab[0]?.labName || `Lab ${labId}`

  const studentRows = []
  for (const r of inLab) {
    if (!r?.requesterRegNo && !r?.requesterName) continue

    const items = Array.isArray(r.items) ? r.items : []
    if (items.length === 0) {
      studentRows.push({
        key:           `${r.requestId}-0`,
        requestId:     r.requestId || "–",
        requesterName: r.requesterName || "–",
        regNo:         r.requesterRegNo || "–",
        role:          r.requesterRole  || "–",
        equipment:     "–",
        quantity:      0,
        status:        r.status || "–",
        fromDate:      r.fromDate || "–",
        toDate:        r.toDate   || "–",
        returned:      "Non-Returned",
      })
      continue
    }

    items.forEach((it, idx) => {
      studentRows.push({
        key:           `${r.requestId}-${idx}`,
        requestId:     r.requestId || "–",
        requesterName: r.requesterName || "–",
        regNo:         r.requesterRegNo || "–",
        role:          r.requesterRole  || "–",
        equipment:     it?.equipmentName || "–",
        quantity:      it?.quantity || 0,
        status:        it?.status || r.status || "–",
        fromDate:      r.fromDate || "–",
        toDate:        r.toDate   || "–",
        returned:      it?.returned ? "Returned" : "Not Returned",
      })
    })
  }

  const equipmentSet = new Set(
    (Array.isArray(labEquipmentNames) ? labEquipmentNames : []).map(x => String(x).trim().toLowerCase())
  )

  const purchaseRows = []
  for (const p of Array.isArray(purchaseRequests) ? purchaseRequests : []) {
    for (const it of p.items || []) {
      const eqName = String(it?.equipmentName || "").trim()
      if (!eqName) continue
      if (equipmentSet.size > 0 && !equipmentSet.has(eqName.toLowerCase())) continue
      purchaseRows.push({
        equipment:     eqName,
        quantity:      it?.quantityRequested ?? it?.quantity ?? 0,
        requestedDate: p?.createdDate   || "–",
        issuedDate:    p?.issuedDate    || "–",
        receivedDate:  p?.receivedDate  || "–",
        status:        p?.status        || "–",
        submittedBy:   p?.requestedByName || "–",
      })
    }
  }

  purchaseRows.sort((a, b) => String(b.requestedDate).localeCompare(String(a.requestedDate)))

  const returnedCount    = studentRows.filter(r => r.returned === "Returned").length
  const nonReturnedCount = studentRows.filter(r => r.returned !== "Returned").length
  const summary = {
    totalRequests:  studentRows.length,
    returnedCount,
    nonReturnedCount,
    returnRate: studentRows.length > 0
      ? Math.round((returnedCount / studentRows.length) * 100)
      : 0,
  }

  return { labName, studentRows, purchaseRows, summary }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function fmtStatus(s) {
  return String(s || "–")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
}

function statusColor(s) {
  const v = String(s || "").toUpperCase()
  if (v.includes("APPROVED") || v.includes("VERIFIED") || v.includes("CONFIRMED") || v.includes("RECEIVED"))
    return { bg: "#dcfce7", color: "#166534", border: "#86efac" }
  if (v.includes("REJECTED") || v.includes("DAMAGED"))
    return { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" }
  if (v.includes("ISSUED") || v.includes("PROCESSING"))
    return { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" }
  if (v.includes("PENDING") || v.includes("SUBMITTED") || v.includes("WAITING"))
    return { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" }
  return { bg: "#f1f5f9", color: "#334155", border: "#cbd5e1" }
}

function statusBadge(s) {
  const { bg, color, border } = statusColor(s)
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:9.5px;font-weight:700;letter-spacing:.4px;background:${bg};color:${color};border:1px solid ${border}">${esc(fmtStatus(s))}</span>`
}

function returnBadge(r) {
  if (r === "Returned")
    return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:9.5px;font-weight:700;background:#dcfce7;color:#166534;border:1px solid #86efac">Returned</span>`
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:9.5px;font-weight:700;background:#fef3c7;color:#92400e;border:1px solid #fcd34d">Not Returned</span>`
}

function renderRequestRows(rows) {
  if (!rows.length) return `
    <tr>
      <td colspan="9" style="text-align:center;padding:20px;color:#94a3b8;font-style:italic;font-size:11px">
        No equipment request records found for this lab.
      </td>
    </tr>`

  return rows.map((row, i) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"}">
      <td style="text-align:center;color:#64748b">${esc(row.requestId)}</td>
      <td style="font-weight:500">${esc(row.requesterName)}</td>
      <td style="color:#64748b">${esc(row.regNo)}</td>
      <td style="color:#64748b">${esc(row.role)}</td>
      <td>${esc(row.equipment)}</td>
      <td style="text-align:center">${esc(row.quantity)}</td>
      <td style="text-align:center;color:#64748b;font-size:10px">${esc(row.fromDate)}</td>
      <td style="text-align:center">${statusBadge(row.status)}</td>
      <td style="text-align:center">${returnBadge(row.returned)}</td>
    </tr>`).join("")
}

function renderPurchaseRows(rows) {
  if (!rows.length) return `
    <tr>
      <td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;font-style:italic;font-size:11px">
        No purchase records found for this lab.
      </td>
    </tr>`

  return rows.map((row, i) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"}">
      <td style="font-weight:500">${esc(row.equipment)}</td>
      <td style="text-align:center">${esc(row.quantity)}</td>
      <td style="color:#64748b">${esc(row.submittedBy)}</td>
      <td style="text-align:center;color:#64748b;font-size:10px">${esc(row.requestedDate)}</td>
      <td style="text-align:center;color:#64748b;font-size:10px">${esc(row.receivedDate !== "–" ? row.receivedDate : row.issuedDate !== "–" ? row.issuedDate : "–")}</td>
      <td style="text-align:center">${statusBadge(row.status)}</td>
    </tr>`).join("")
}

// ─────────────────────────────────────────────────────────────────────────────
// Main PDF generator
// ─────────────────────────────────────────────────────────────────────────────

export function generateHodLabReportPdf({
  labName,
  studentRows = [],
  purchaseRows = [],
  summary = {},
  department = "",
  hodName = "",
}) {
  const now      = new Date()
  const dateStr  = now.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
  const timeStr  = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  const refNo    = `ERMS/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`

  const returnRate    = summary.returnRate ?? 0
  const totalRequests = summary.totalRequests ?? studentRows.length
  const returned      = summary.returnedCount ?? 0
  const notReturned   = summary.nonReturnedCount ?? 0

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Lab Report — ${esc(labName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11px;
      color: #1e293b;
      background: #fff;
      padding: 0;
    }

    /* ── Page layout ── */
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 18mm 18mm 20mm;
      position: relative;
    }

    /* ── Letterhead ── */
    .letterhead {
      display: flex;
      align-items: center;
      gap: 18px;
      padding-bottom: 14px;
      border-bottom: 3px solid #1e3a5f;
      margin-bottom: 6px;
    }
    .letterhead-logo {
      width: 58px;
      height: 58px;
      border: 2px solid #1e3a5f;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      color: #1e3a5f;
      font-weight: 900;
      flex-shrink: 0;
      background: #f0f4ff;
      font-family: Arial, sans-serif;
    }
    .letterhead-text { flex: 1; }
    .letterhead-uni {
      font-size: 16px;
      font-weight: 900;
      color: #1e3a5f;
      letter-spacing: .5px;
      font-family: Arial, sans-serif;
      line-height: 1.2;
    }
    .letterhead-faculty {
      font-size: 12px;
      color: #475569;
      margin-top: 2px;
      font-family: Arial, sans-serif;
    }
    .letterhead-system {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 1px;
      font-family: Arial, sans-serif;
      letter-spacing: .3px;
    }
    .letterhead-right {
      text-align: right;
      font-family: Arial, sans-serif;
      font-size: 10px;
      color: #64748b;
      line-height: 1.6;
    }
    .letterhead-right strong { color: #1e3a5f; font-size: 11px; }

    /* ── Document stripe ── */
    .doc-stripe {
      background: #1e3a5f;
      color: #fff;
      padding: 7px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      border-radius: 0;
      font-family: Arial, sans-serif;
    }
    .doc-stripe-title { font-size: 13px; font-weight: 800; letter-spacing: .5px; }
    .doc-stripe-meta  { font-size: 10px; opacity: .85; }

    /* ── Info grid ── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      border: 1px solid #cbd5e1;
      margin-bottom: 18px;
      border-radius: 4px;
      overflow: hidden;
    }
    .info-row {
      display: contents;
    }
    .info-cell {
      padding: 6px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-family: Arial, sans-serif;
    }
    .info-cell:nth-child(odd) { border-right: 1px solid #e2e8f0; background: #f8fafc; }
    .info-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .6px;
      color: #94a3b8;
      margin-bottom: 2px;
    }
    .info-value {
      font-size: 11px;
      font-weight: 600;
      color: #1e293b;
    }

    /* ── Summary stat cards ── */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .summary-card {
      border-radius: 6px;
      padding: 10px 12px;
      text-align: center;
      font-family: Arial, sans-serif;
    }
    .summary-card .sc-value {
      font-size: 24px;
      font-weight: 900;
      line-height: 1;
      margin-bottom: 3px;
    }
    .summary-card .sc-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .5px;
      opacity: .75;
    }
    .sc-blue   { background: #dbeafe; color: #1e40af; }
    .sc-green  { background: #dcfce7; color: #166534; }
    .sc-amber  { background: #fef3c7; color: #92400e; }
    .sc-purple { background: #ede9fe; color: #5b21b6; }

    /* ── Return rate bar ── */
    .rate-bar-wrap {
      margin-bottom: 20px;
      font-family: Arial, sans-serif;
    }
    .rate-bar-header {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #475569;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .rate-bar-track {
      height: 8px;
      background: #fee2e2;
      border-radius: 99px;
      overflow: hidden;
    }
    .rate-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #16a34a, #22c55e);
      border-radius: 99px;
      width: ${returnRate}%;
    }

    /* ── Section headings ── */
    .section-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f1f5f9;
      border-left: 4px solid #1e3a5f;
      padding: 6px 12px;
      margin: 0 0 0;
      font-family: Arial, sans-serif;
    }
    .section-heading-text {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .6px;
      color: #1e3a5f;
    }
    .section-heading-count {
      font-size: 10px;
      color: #94a3b8;
      font-weight: 600;
    }

    /* ── Tables ── */
    .report-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-family: Arial, sans-serif;
      font-size: 10px;
    }
    .report-table thead tr {
      background: #1e3a5f;
      color: #fff;
    }
    .report-table thead th {
      padding: 7px 8px;
      text-align: left;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .5px;
      white-space: nowrap;
    }
    .report-table thead th.tc { text-align: center; }
    .report-table tbody td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
      line-height: 1.4;
    }
    .report-table tbody tr:last-child td { border-bottom: 2px solid #1e3a5f; }
    .report-table tbody tr:hover { background: #f0f7ff !important; }

    /* ── Signature block ── */
    .signature-section {
      margin-top: 28px;
      border-top: 2px solid #1e3a5f;
      padding-top: 18px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      font-family: Arial, sans-serif;
    }
    .sig-block { text-align: center; }
    .sig-line {
      height: 1px;
      background: #475569;
      margin: 36px 16px 6px;
    }
    .sig-name  { font-size: 10px; font-weight: 700; color: #1e293b; }
    .sig-title { font-size: 9px; color: #64748b; margin-top: 2px; }
    .sig-date  { font-size: 9px; color: #94a3b8; margin-top: 4px; }

    /* ── Footer ── */
    .report-footer {
      margin-top: 20px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: Arial, sans-serif;
      font-size: 9px;
      color: #94a3b8;
    }
    .footer-left  { line-height: 1.5; }
    .footer-right { text-align: right; line-height: 1.5; }

    /* ── Watermark ── */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 90px;
      font-weight: 900;
      font-family: Arial, sans-serif;
      color: rgba(30, 58, 95, 0.04);
      pointer-events: none;
      white-space: nowrap;
      z-index: 0;
      letter-spacing: 8px;
    }

    /* ── Print ── */
    @media print {
      body { padding: 0; font-size: 10px; }
      .page { padding: 12mm 14mm 16mm; width: 100%; }
      .watermark { position: fixed; }
      .no-print { display: none !important; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }

    @page {
      size: A4;
      margin: 0;
    }
  </style>
</head>
<body>

<div class="watermark">UNIVERSITY OF JAFFNA</div>

<div class="page">

  <!-- ── LETTERHEAD ── -->
  <div class="letterhead">
    <div class="letterhead-logo">UOJ</div>
    <div class="letterhead-text">
      <div class="letterhead-uni">University of Jaffna</div>
      <div class="letterhead-faculty">Faculty of Engineering</div>
      <div class="letterhead-system">Equipment Request Management System (ERMS)</div>
    </div>
    <div class="letterhead-right">
      <strong>Official Report</strong><br/>
      Date: ${esc(dateStr)}<br/>
      Time: ${esc(timeStr)}<br/>
      Ref: ${esc(refNo)}
    </div>
  </div>

  <!-- ── DOCUMENT TITLE STRIPE ── -->
  <div class="doc-stripe">
    <span class="doc-stripe-title">📋 LAB EQUIPMENT REQUEST REPORT</span>
    <span class="doc-stripe-meta">Confidential · For Internal Use Only</span>
  </div>

  <!-- ── REPORT INFO GRID ── -->
  <div class="info-grid">
    <div class="info-cell">
      <div class="info-label">Laboratory</div>
      <div class="info-value">${esc(labName)}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Department</div>
      <div class="info-value">${esc(department || "Faculty of Engineering")}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Report Prepared By</div>
      <div class="info-value">${esc(hodName || "Head of Department")}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Report Date</div>
      <div class="info-value">${esc(dateStr)}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Total Equipment Requests</div>
      <div class="info-value">${esc(studentRows.length)} Records</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Total Purchase Records</div>
      <div class="info-value">${esc(purchaseRows.length)} Transactions</div>
    </div>
  </div>

  <!-- ── SUMMARY STATISTICS ── -->
  <div class="summary-grid">
    <div class="summary-card sc-blue">
      <div class="sc-value">${esc(totalRequests)}</div>
      <div class="sc-label">Total Requests</div>
    </div>
    <div class="summary-card sc-green">
      <div class="sc-value">${esc(returned)}</div>
      <div class="sc-label">Items Returned</div>
    </div>
    <div class="summary-card sc-amber">
      <div class="sc-value">${esc(notReturned)}</div>
      <div class="sc-label">Not Returned</div>
    </div>
    <div class="summary-card sc-purple">
      <div class="sc-value">${esc(purchaseRows.length)}</div>
      <div class="sc-label">Purchases</div>
    </div>
  </div>

  <!-- ── RETURN RATE BAR ── -->
  <div class="rate-bar-wrap">
    <div class="rate-bar-header">
      <span>Equipment Return Rate</span>
      <span>${returnRate}% (${returned} of ${totalRequests} returnable items)</span>
    </div>
    <div class="rate-bar-track">
      <div class="rate-bar-fill"></div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════ -->
  <!-- SECTION 1: EQUIPMENT REQUEST RECORDS          -->
  <!-- ══════════════════════════════════════════════ -->
  <div class="section-heading" style="margin-bottom:0">
    <span class="section-heading-text">Section 1 — Equipment Request Records</span>
    <span class="section-heading-count">${esc(studentRows.length)} records</span>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th class="tc">#ID</th>
        <th>Requester Name</th>
        <th>Reg No</th>
        <th>Role</th>
        <th>Equipment</th>
        <th class="tc">Qty</th>
        <th class="tc">From Date</th>
        <th class="tc">Status</th>
        <th class="tc">Return</th>
      </tr>
    </thead>
    <tbody>
      ${renderRequestRows(studentRows)}
    </tbody>
  </table>

  <!-- ══════════════════════════════════════════════ -->
  <!-- SECTION 2: PURCHASE HISTORY                   -->
  <!-- ══════════════════════════════════════════════ -->
  <div class="section-heading" style="margin-bottom:0">
    <span class="section-heading-text">Section 2 — Purchase History</span>
    <span class="section-heading-count">${esc(purchaseRows.length)} transactions</span>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th>Equipment</th>
        <th class="tc">Qty</th>
        <th>Submitted By (TO)</th>
        <th class="tc">Submitted Date</th>
        <th class="tc">Received / Issued Date</th>
        <th class="tc">Status</th>
      </tr>
    </thead>
    <tbody>
      ${renderPurchaseRows(purchaseRows)}
    </tbody>
  </table>

  <!-- ── OBSERVATIONS / REMARKS ── -->
  <div class="section-heading" style="margin-bottom:8px">
    <span class="section-heading-text">Section 3 — Observations & Remarks</span>
  </div>
  <div style="border:1px solid #e2e8f0;border-radius:4px;padding:12px 14px;min-height:60px;margin-bottom:24px;font-family:Arial,sans-serif;font-size:10px;color:#94a3b8;font-style:italic">

  
  </div>

  <!-- ── SIGNATURE BLOCK ── -->
  <div class="signature-section">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-name">${esc(hodName || "Head of Department")}</div>
      <div class="sig-title">Head of Department</div>
      <div class="sig-date">Date: _______________</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-name">Technical Officer</div>
      <div class="sig-title">Laboratory Technical Officer</div>
      <div class="sig-date">Date: _______________</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-name">Dean / AR</div>
      <div class="sig-title">Faculty of Engineering</div>
      <div class="sig-date">Date: _______________</div>
    </div>
  </div>

  <!-- ── FOOTER ── -->
  <div class="report-footer">
    <div class="footer-left">
      <strong>Faculty of Engineering — University of Jaffna</strong><br/>
      Equipment Request Management System (ERMS) · Official Document
    </div>
    <div class="footer-right">
      Generated: ${esc(dateStr)} at ${esc(timeStr)}<br/>
      Ref No: ${esc(refNo)} · Page 1 of 1
    </div>
  </div>

</div><!-- /page -->

<script>
  window.onload = function() { window.print(); };
</script>

</body>
</html>`

  const win = window.open("", "_blank", "width=1100,height=850")
  if (!win) throw new Error("Popup blocked. Please allow popups and try again.")
  win.document.open()
  win.document.write(html)
  win.document.close()
}