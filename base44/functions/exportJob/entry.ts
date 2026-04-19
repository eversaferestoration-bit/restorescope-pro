import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function headerBar(doc, text, y, pageWidth) {
  doc.setFillColor(30, 64, 175); // primary blue
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(text.toUpperCase(), 16, y + 4.8);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  return y + 12;
}

function checkNewPage(doc, y, needed = 14, pageWidth) {
  if (y > doc.internal.pageSize.getHeight() - needed) {
    doc.addPage();
    return 20;
  }
  return y;
}

function jobInfoBlock(doc, job, insured, property, draft, y, pageWidth) {
  const col1 = 14, col2 = pageWidth / 2 + 5;
  const rows = [
    ['Job Number', job.job_number || '—', 'Loss Type', job.loss_type || '—'],
    ['Date of Loss', job.date_of_loss || '—', 'Service Type', job.service_type || '—'],
    ['Cause of Loss', job.cause_of_loss || '—', 'Status', (draft.status || '').toUpperCase()],
    ['Insured', insured?.full_name || '—', 'Property', property ? [property.address_line_1, property.city, property.state].filter(Boolean).join(', ') : '—'],
    ['Approved By', draft.approved_by || '—', 'Total', `$${(draft.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
  ];
  doc.setFontSize(8.5);
  for (const [l1, v1, l2, v2] of rows) {
    y = checkNewPage(doc, y, 8, pageWidth);
    doc.setFont('helvetica', 'bold'); doc.text(l1 + ':', col1, y);
    doc.setFont('helvetica', 'normal'); doc.text(String(v1), col1 + 32, y);
    if (l2) { doc.setFont('helvetica', 'bold'); doc.text(l2 + ':', col2, y); }
    if (v2) { doc.setFont('helvetica', 'normal'); doc.text(String(v2), col2 + 32, y); }
    y += 6;
  }
  return y + 4;
}

// ─── ESTIMATE PDF ─────────────────────────────────────────────────────────────

function buildEstimatePDF(job, insured, property, draft, rooms) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  let y = 14;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 64, 175);
  doc.text('RESTORATION ESTIMATE', pw / 2, y, { align: 'center' });
  y += 7;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} · ${draft.label}`, pw / 2, y, { align: 'center' });
  y += 10;

  // Approved badge
  doc.setFillColor(22, 163, 74);
  doc.roundedRect(pw / 2 - 20, y, 40, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('APPROVED ESTIMATE', pw / 2, y + 4.8, { align: 'center' });
  y += 14;
  doc.setTextColor(30, 30, 30);

  // Job info
  y = headerBar(doc, 'Job Information', y, pw);
  y = jobInfoBlock(doc, job, insured, property, draft, y, pw);
  y += 2;

  // Line items
  y = checkNewPage(doc, y, 20, pw);
  y = headerBar(doc, 'Line Items', y, pw);

  // Table header
  doc.setFillColor(240, 244, 255);
  doc.rect(14, y, pw - 28, 6.5, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  const cols = [14, 55, 98, 125, 152, 170];
  const headers = ['Category', 'Description', 'Room', 'Unit', 'Qty', 'Total'];
  headers.forEach((h, i) => doc.text(h, cols[i], y + 4.5));
  y += 9;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  let rowAlt = false;

  // Group by room
  const byRoom = {};
  for (const li of draft.line_items || []) {
    const k = li.room_name || 'General';
    if (!byRoom[k]) byRoom[k] = [];
    byRoom[k].push(li);
  }

  let subtotalCheck = 0;
  for (const [roomName, items] of Object.entries(byRoom)) {
    y = checkNewPage(doc, y, 12, pw);
    doc.setFillColor(245, 247, 250);
    doc.rect(14, y, pw - 28, 5.5, 'F');
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    doc.text(roomName, 16, y + 3.8);
    y += 6.5;

    for (const li of items) {
      y = checkNewPage(doc, y, 8, pw);
      doc.setFillColor(rowAlt ? 250 : 255, rowAlt ? 250 : 255, rowAlt ? 250 : 255);
      doc.rect(14, y, pw - 28, 5.5, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 30, 30);

      const desc = doc.splitTextToSize(li.description || '', 40);
      doc.text(li.category || '', cols[0], y + 3.8);
      doc.text(desc[0] || '', cols[1], y + 3.8);
      doc.text(li.room_name || 'General', cols[2], y + 3.8);
      doc.text(li.unit || '', cols[3], y + 3.8);
      doc.text(String(li.quantity || ''), cols[4], y + 3.8);
      doc.text(`$${(li.line_total || 0).toFixed(2)}`, cols[5], y + 3.8);

      // thin border
      doc.setDrawColor(230, 230, 230);
      doc.rect(14, y, pw - 28, 5.5, 'S');

      subtotalCheck += li.line_total || 0;
      rowAlt = !rowAlt;
      y += 5.5;
    }
  }

  // Totals
  y = checkNewPage(doc, y, 30, pw);
  y += 4;
  const totX = pw - 70;

  const totRows = [
    ['Subtotal', `$${(draft.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
  ];
  if (draft.applied_modifiers && Object.keys(draft.applied_modifiers).length) {
    for (const [k, v] of Object.entries(draft.applied_modifiers)) {
      totRows.push([`Modifier: ${k.replace(/_/g, ' ')}`, `×${v.toFixed(2)}`]);
    }
  }

  doc.setFontSize(8.5);
  for (const [label, val] of totRows) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(label, totX, y);
    doc.text(val, pw - 14, y, { align: 'right' });
    y += 6;
  }

  // Grand total box
  doc.setFillColor(30, 64, 175);
  doc.rect(totX - 4, y, pw - totX - 10, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL', totX, y + 6);
  doc.text(`$${(draft.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pw - 14, y + 6, { align: 'right' });
  y += 15;

  // Notes
  if (draft.notes) {
    y = checkNewPage(doc, y, 20, pw);
    y = headerBar(doc, 'Notes', y, pw);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(draft.notes, pw - 30);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 4;
  }

  // Approval block
  y = checkNewPage(doc, y, 30, pw);
  y = headerBar(doc, 'Approval Record', y, pw);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const apprRows = [
    ['Status', (draft.status || '').toUpperCase()],
    ['Approved By', draft.approved_by || '—'],
    ['Approved At', draft.approved_at ? new Date(draft.approved_at).toLocaleString() : '—'],
    ['Created By', draft.created_by || '—'],
    ['Version', String(draft.version_number || 1)],
  ];
  for (const [l, v] of apprRows) {
    y = checkNewPage(doc, y, 7, pw);
    doc.setFont('helvetica', 'bold'); doc.text(l + ':', 14, y);
    doc.setFont('helvetica', 'normal'); doc.text(v, 55, y);
    y += 6;
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`RestoreScope Pro · ${job.job_number || ''} · Page ${i} of ${pages}`, pw / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  }

  return doc.output('arraybuffer');
}

// ─── PHOTO REPORT PDF ─────────────────────────────────────────────────────────

async function buildPhotoReportPDF(job, insured, photos, rooms) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  let y = 14;
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r.name]));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 64, 175);
  doc.text('PHOTO DOCUMENTATION REPORT', pw / 2, y, { align: 'center' });
  y += 7;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Job: ${job.job_number || '—'} · Insured: ${insured?.full_name || '—'} · ${new Date().toLocaleDateString()}`, pw / 2, y, { align: 'center' });
  y += 12;

  // Summary bar
  y = headerBar(doc, `Photos: ${photos.length} total`, y, pw);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Analyzed: ${photos.filter(p => p.analysis_status === 'analysis_complete').length}  ·  Damage tags: ${[...new Set(photos.flatMap(p => p.damage_tags || []))].join(', ') || 'none'}`, 14, y);
  y += 10;

  // Photos 2 per row
  const imgW = (pw - 36) / 2;
  const imgH = imgW * 0.75;
  const leftX = 14, rightX = 14 + imgW + 8;
  let col = 0;

  for (const photo of photos) {
    if (!photo.file_url) continue;

    const x = col === 0 ? leftX : rightX;
    if (col === 0) y = checkNewPage(doc, y, imgH + 22, pw);

    try {
      const resp = await fetch(photo.file_url);
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const ext = (photo.mime_type || 'image/jpeg').includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(b64, ext, x, y, imgW, imgH);
      } else {
        doc.setFillColor(230, 230, 230);
        doc.rect(x, y, imgW, imgH, 'F');
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('Image unavailable', x + imgW / 2, y + imgH / 2, { align: 'center' });
      }
    } catch {
      doc.setFillColor(230, 230, 230);
      doc.rect(x, y, imgW, imgH, 'F');
    }

    // Caption
    const capY = y + imgH + 2;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(roomMap[photo.room_id] || 'Unknown Room', x, capY + 3);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    if (photo.caption) {
      const cap = doc.splitTextToSize(photo.caption, imgW);
      doc.text(cap[0], x, capY + 7);
    }
    if (photo.damage_tags?.length) {
      doc.setTextColor(180, 80, 80);
      doc.text('Tags: ' + photo.damage_tags.slice(0, 3).join(', '), x, capY + 11);
    }

    col = 1 - col;
    if (col === 0) y += imgH + 18;
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`RestoreScope Pro · ${job.job_number || ''} · Page ${i} of ${pages}`, pw / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  }

  return doc.output('arraybuffer');
}

// ─── JUSTIFICATION PACKAGE PDF ────────────────────────────────────────────────

function buildJustificationPDF(job, insured, draft, justifications, observations, moisture, env) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  let y = 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 64, 175);
  doc.text('SCOPE JUSTIFICATION PACKAGE', pw / 2, y, { align: 'center' });
  y += 7;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Job: ${job.job_number || '—'} · ${new Date().toLocaleDateString()} · Approved estimate: ${draft.label}`, pw / 2, y, { align: 'center' });
  y += 12;

  // Job summary
  y = headerBar(doc, 'Job Overview', y, pw);
  const rows = [
    ['Loss Type', job.loss_type || '—'], ['Service Type', job.service_type || '—'],
    ['Cause of Loss', job.cause_of_loss || '—'], ['Date of Loss', job.date_of_loss || '—'],
    ['Insured', insured?.full_name || '—'], ['Total Estimate', `$${(draft.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
  ];
  doc.setFontSize(8.5);
  for (const [l, v] of rows) {
    y = checkNewPage(doc, y, 7, pw);
    doc.setFont('helvetica', 'bold'); doc.text(l + ':', 14, y);
    doc.setFont('helvetica', 'normal'); doc.text(String(v), 60, y);
    y += 6;
  }
  y += 4;

  // Justifications per category
  y = checkNewPage(doc, y, 20, pw);
  y = headerBar(doc, 'Category Justifications', y, pw);

  const catColors = {
    containment: [147, 51, 234], demolition: [220, 38, 38], drying: [37, 99, 235],
    cleaning: [22, 163, 74], deodorization: [217, 119, 6], hepa: [15, 118, 110],
    contents: [234, 88, 12], documentation: [71, 85, 105],
  };

  for (const j of justifications) {
    y = checkNewPage(doc, y, 28, pw);
    const [r, g, b] = catColors[j.category] || [60, 60, 60];

    // Category chip
    doc.setFillColor(r, g, b);
    doc.roundedRect(14, y, 35, 6, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(j.category.toUpperCase(), 31.5, y + 4.2, { align: 'center' });
    y += 9;

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(j.note || '', pw - 28);
    for (const line of noteLines) {
      y = checkNewPage(doc, y, 7, pw);
      doc.text(line, 14, y);
      y += 5;
    }

    if (j.evidence_refs?.length) {
      y = checkNewPage(doc, y, 10, pw);
      y += 2;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bolditalic');
      doc.setTextColor(100, 100, 100);
      doc.text('Evidence cited:', 14, y);
      y += 4.5;
      doc.setFont('helvetica', 'italic');
      for (const ref of j.evidence_refs) {
        y = checkNewPage(doc, y, 6, pw);
        doc.text(`• ${ref}`, 17, y);
        y += 4.5;
      }
    }
    y += 6;
  }

  // Evidence Data Appendix
  y = checkNewPage(doc, y, 20, pw);
  y = headerBar(doc, 'Evidence Appendix — Moisture Readings', y, pw);
  doc.setFontSize(8);
  if (!moisture.length) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(130, 130, 130);
    doc.text('No moisture readings recorded.', 14, y);
    y += 6;
  } else {
    for (const m of moisture) {
      y = checkNewPage(doc, y, 6, pw);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(`${m.reading_value} ${m.unit || ''} — ${m.material || '?'} @ ${m.location_description || 'unknown location'}`, 14, y);
      y += 5;
    }
  }
  y += 4;

  y = checkNewPage(doc, y, 20, pw);
  y = headerBar(doc, 'Evidence Appendix — Observations', y, pw);
  doc.setFontSize(8);
  if (!observations.length) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(130, 130, 130);
    doc.text('No observations recorded.', 14, y);
    y += 6;
  } else {
    for (const o of observations) {
      y = checkNewPage(doc, y, 8, pw);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text(`[${o.severity || 'N/A'} · ${o.observation_type || 'General'}]`, 14, y);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(o.description, pw - 28);
      doc.text(lines[0], 75, y);
      y += 5;
    }
  }

  // Approval record
  y = checkNewPage(doc, y, 30, pw);
  y += 4;
  y = headerBar(doc, 'Approval Record', y, pw);
  const apprRows = [
    ['Approved By', draft.approved_by || '—'],
    ['Approved At', draft.approved_at ? new Date(draft.approved_at).toLocaleString() : '—'],
    ['Estimate Version', draft.label || '—'],
    ['Total', `$${(draft.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
  ];
  doc.setFontSize(8.5);
  for (const [l, v] of apprRows) {
    y = checkNewPage(doc, y, 7, pw);
    doc.setFont('helvetica', 'bold'); doc.text(l + ':', 14, y);
    doc.setFont('helvetica', 'normal'); doc.text(v, 60, y);
    y += 6;
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`RestoreScope Pro · ${job.job_number || ''} · Page ${i} of ${pages}`, pw / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  }

  return doc.output('arraybuffer');
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { job_id, export_type } = body; // export_type: 'estimate' | 'photos' | 'justification'

  if (!job_id || !export_type) return Response.json({ error: 'job_id and export_type required' }, { status: 400 });

  // Load all required data in parallel
  // Load job first so we can scope all subsequent queries by company_id
  const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id, is_deleted: false });
  if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });
  const job = jobs[0];

  // Verify caller belongs to this company (non-admins must have a UserProfile in this company)
  if (user.role !== 'admin') {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: job.company_id, is_deleted: false });
    if (!profiles.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [rooms, drafts, photos, observations, moisture, env] = await Promise.all([
    base44.asServiceRole.entities.Room.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.EstimateDraft.filter({ job_id, is_deleted: false }, '-version_number'),
    base44.asServiceRole.entities.Photo.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.Observation.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.MoistureReading.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.EnvironmentalReading.filter({ job_id, is_deleted: false }),
  ]);

  // Only approved/locked estimates are exportable
  const approved = drafts.find((d) => d.status === 'approved' || d.status === 'locked');
  if (!approved && export_type !== 'photos') {
    return Response.json({ error: 'no_approved_estimate', message: 'No approved estimate found. An estimate must be approved or locked before exporting.' }, { status: 422 });
  }

  // Fetch insured and property scoped to this company to prevent cross-company reads
  const [insureds, properties] = await Promise.all([
    job.insured_id ? base44.asServiceRole.entities.Insured.filter({ id: job.insured_id, company_id: job.company_id, is_deleted: false }) : Promise.resolve([]),
    job.property_id ? base44.asServiceRole.entities.Property.filter({ id: job.property_id, company_id: job.company_id, is_deleted: false }) : Promise.resolve([]),
  ]);
  const insured = insureds[0] || null;
  const property = properties[0] || null;

  let pdfBytes;
  let filename;

  if (export_type === 'estimate') {
    pdfBytes = buildEstimatePDF(job, insured, property, approved, rooms);
    filename = `estimate-${job.job_number || job_id}.pdf`;
  } else if (export_type === 'photos') {
    pdfBytes = await buildPhotoReportPDF(job, insured, photos, rooms);
    filename = `photos-${job.job_number || job_id}.pdf`;
  } else if (export_type === 'justification') {
    // Generate justification text via LLM (reuse logic)
    const scopeItems = await base44.asServiceRole.entities.ScopeItem.filter({ job_id, is_deleted: false, status: 'confirmed' });
    const categories = [...new Set(scopeItems.map((i) => i.category))];
    const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r.name]));

    const evidenceSummary = {
      job: { loss_type: job.loss_type, service_type: job.service_type, cause_of_loss: job.cause_of_loss },
      observations: observations.map((o) => ({ room: roomMap[o.room_id], type: o.observation_type, severity: o.severity, description: o.description })),
      moisture_readings: moisture.map((m) => ({ room: roomMap[m.room_id], material: m.material, value: m.reading_value, unit: m.unit, location: m.location_description })),
      confirmed_scope: scopeItems.map((s) => ({ category: s.category, description: s.description, unit: s.unit, quantity: s.quantity })),
    };

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a professional restoration scope writer. Write evidence-based justification notes for each confirmed scope category.

Evidence: ${JSON.stringify(evidenceSummary, null, 2)}

Categories: ${categories.join(', ')}

Rules: Tie every claim to specific evidence. Reference actual values. Professional carrier-review language. 3-5 sentences per category.

Return JSON with key "justifications": array of { "category": string, "note": string, "evidence_refs": string[] }`,
      response_json_schema: {
        type: 'object',
        properties: {
          justifications: { type: 'array', items: { type: 'object', properties: { category: { type: 'string' }, note: { type: 'string' }, evidence_refs: { type: 'array', items: { type: 'string' } } } } },
        },
      },
    });

    const justifications = result?.justifications || [];
    pdfBytes = buildJustificationPDF(job, insured, approved, justifications, observations, moisture, env);
    filename = `justification-${job.job_number || job_id}.pdf`;
  } else {
    return Response.json({ error: 'Invalid export_type' }, { status: 400 });
  }

  // Audit
  await base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: 'Job',
    entity_id: job_id,
    action: 'exported',
    actor_email: user.email,
    actor_id: user.id,
    description: `${export_type} exported for job ${job.job_number || job_id}`,
    metadata: { job_id, export_type },
  });

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});