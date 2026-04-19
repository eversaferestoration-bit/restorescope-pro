import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

const rateLimitStore = new Map();
function checkRateLimit(apiKey) {
  const now = Date.now();
  const key = `rate:${apiKey}`;
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + 3600000 };
  if (now > record.resetAt) { record.count = 1; record.resetAt = now + 3600000; } else { record.count++; }
  rateLimitStore.set(key, record);
  return { allowed: record.count <= 100, remaining: Math.max(0, 100 - record.count), resetAt: record.resetAt };
}

async function authenticateApiKey(req, base44) {
  const authHeader = req.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  if (!apiKey) return { error: 'API key required', status: 401 };
  const apiKeys = await base44.asServiceRole.entities.ApiKey.filter({ key: apiKey, is_active: true, is_deleted: false });
  if (!apiKeys.length) return { error: 'Invalid API key', status: 401 };
  const apiKeyRecord = apiKeys[0];
  const rateLimit = checkRateLimit(apiKey);
  if (!rateLimit.allowed) return { error: 'Rate limit exceeded', status: 429, rateLimit };
  if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) return { error: 'API key expired', status: 401 };
  if (apiKeyRecord.allowed_ips?.length > 0) {
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    if (!apiKeyRecord.allowed_ips.includes(clientIp)) return { error: 'IP not allowed', status: 403 };
  }
  return { apiKeyRecord, rateLimit };
}

async function logApiRequest(apiKeyRecord, req, status = 'success', statusCode = 200) {
  try {
    const url = new URL(req.url);
    await base44.asServiceRole.entities.AuditLog.create({
      company_id: apiKeyRecord.company_id, entity_type: 'ApiKey', entity_id: apiKeyRecord.id,
      action: `api_${status}`, actor_email: apiKeyRecord.name || 'api', actor_id: apiKeyRecord.id,
      description: `External API ${url.pathname} - ${statusCode}`,
      metadata: { method: req.method, path: url.pathname, status_code: statusCode, user_agent: req.headers.get('user-agent'), ip: req.headers.get('x-forwarded-for') },
    });
  } catch (e) { console.error('Failed to log API request:', e); }
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  const base44 = createClientFromRequest(req);
  const auth = await authenticateApiKey(req, base44);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { apiKeyRecord, rateLimit } = auth;

  try {
    const url = new URL(req.url);
    const estimateId = url.pathname.split('/').pop();
    if (!estimateId) { await logApiRequest(apiKeyRecord, req, 'validation_error', 400); return Response.json({ error: 'estimate_id required' }, { status: 400 }); }

    const estimates = await base44.asServiceRole.entities.EstimateDraft.filter({ id: estimateId, company_id: apiKeyRecord.company_id, is_deleted: false });
    if (!estimates.length) { await logApiRequest(apiKeyRecord, req, 'not_found', 404); return Response.json({ error: 'Estimate not found' }, { status: 404 }); }
    const estimate = estimates[0];

    const jobs = await base44.asServiceRole.entities.Job.filter({ id: estimate.job_id, is_deleted: false });
    if (!jobs.length) { await logApiRequest(apiKeyRecord, req, 'not_found', 404); return Response.json({ error: 'Job not found' }, { status: 404 }); }
    const job = jobs[0];

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(18);
    doc.text('Restoration Estimate', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Job #${job.job_number || estimate.job_id.slice(-6)}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Estimate: ${estimate.label || 'v' + estimate.version_number}`, pageWidth / 2, 33, { align: 'center' });
    
    doc.setFontSize(9);
    doc.text(`Loss Type: ${job.loss_type || 'N/A'}`, 20, 45);
    doc.text(`Service Type: ${job.service_type || 'N/A'}`, 20, 50);
    doc.text(`Status: ${estimate.status}`, 20, 55);
    doc.text(`Generated: ${new Date(estimate.created_date).toLocaleDateString()}`, 20, 60);
    
    let y = 75;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Room', 20, y);
    doc.text('Description', 50, y);
    doc.text('Qty', 140, y);
    doc.text('Unit Cost', 160, y);
    doc.text('Total', 190, y);
    
    y += 5;
    doc.line(20, y, pageWidth - 20, y);
    y += 5;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    
    const lineItems = estimate.line_items || [];
    for (const item of lineItems) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(item.room_name || 'General', 20, y);
      doc.text(item.description || item.category, 50, y, { maxWidth: 85 });
      doc.text(String(item.quantity), 140, y, { align: 'right' });
      doc.text(`$${(item.unit_cost || 0).toFixed(2)}`, 160, y, { align: 'right' });
      doc.text(`$${(item.line_total || 0).toFixed(2)}`, 190, y, { align: 'right' });
      y += 5;
    }
    
    y += 3;
    doc.line(20, y, pageWidth - 20, y);
    y += 5;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Subtotal:', 140, y, { align: 'right' });
    doc.text(`$${(estimate.subtotal || 0).toFixed(2)}`, 190, y, { align: 'right' });
    
    if (estimate.modifier_total !== 1.0) {
      y += 5;
      doc.text('Modifier:', 140, y, { align: 'right' });
      doc.text(`×${(estimate.modifier_total || 1.0).toFixed(2)}`, 190, y, { align: 'right' });
    }
    
    y += 7;
    doc.setFontSize(12);
    doc.text('Total:', 140, y, { align: 'right' });
    doc.text(`$${(estimate.total || 0).toFixed(2)}`, 190, y, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Generated via External API', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    
    const pdfBytes = doc.output('arraybuffer');
    await logApiRequest(apiKeyRecord, req, 'estimate_exported', 200);

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="estimate_${estimateId}.pdf"`,
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
      },
    });
  } catch (error) {
    await logApiRequest(apiKeyRecord, req, 'error', 500);
    return Response.json({ error: 'internal_error', message: error.message }, { status: 500 });
  }
});