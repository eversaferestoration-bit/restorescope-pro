import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Generates a supplement estimate by comparing job data vs approved estimate.
 * Detects missing scope, underpriced items, and newly discovered damage.
 */

// Default unit costs (same as generateEstimateDraft)
const DEFAULT_COSTS = {
  containment: { 'linear_ft': 2.50, 'sqft': 1.25 },
  demolition: { 'sqft': 3.50, 'lf': 2.00, 'each': 45.00 },
  drying: { 'each': 1.25, 'hr': 0.85 },
  cleaning: { 'sqft': 2.75, 'each': 35.00 },
  deodorization: { 'sqft': 1.50, 'each': 75.00 },
  hepa: { 'each': 2.50, 'hr': 1.25 },
  contents: { 'each': 25.00, 'hr': 65.00 },
  documentation: { 'each': 150.00, 'hr': 95.00 },
};

const CATEGORY_RULES = {
  containment: [
    { trigger: (job, photos, readings) => readings.moisture.some(r => r.reading_value > 40), description: 'Extended containment for high moisture areas', unit: 'linear_ft', qty: 25 },
    { trigger: (job, photos, readings) => photos.some(p => p.damage_tags?.includes('mold')), description: 'Mold containment barrier', unit: 'sqft', qty: 150 },
  ],
  demolition: [
    { trigger: (job, photos, readings) => readings.moisture.some(r => r.reading_value > 25), description: 'Remove baseboards in affected areas', unit: 'lf', qty: 45 },
    { trigger: (job, photos, readings) => readings.environmental.some(e => e.relative_humidity > 60), description: 'Remove damaged drywall', unit: 'sqft', qty: 80 },
  ],
  drying: [
    { trigger: (job, photos, readings) => readings.moisture.length > 5, description: 'Additional dehumidification capacity', unit: 'each', qty: 3 },
    { trigger: (job, photos, readings) => readings.environmental.some(e => (e.relative_humidity || 0) > 55), description: 'Extended drying equipment rental', unit: 'hr', qty: 72 },
  ],
  cleaning: [
    { trigger: (job, photos, readings) => photos.length > 3, description: 'Post-restoration cleaning', unit: 'sqft', qty: 200 },
  ],
  deodorization: [
    { trigger: (job, photos, readings) => photos.some(p => p.damage_tags?.includes('smoke') || p.damage_tags?.includes('mold')), description: 'Thermal fogging deodorization', unit: 'each', qty: 2 },
  ],
  hepa: [
    { trigger: (job, photos, readings) => photos.some(p => p.damage_tags?.includes('mold')) || readings.moisture.some(r => r.reading_value > 30), description: 'HEPA air scrubbing', unit: 'each', qty: 2 },
  ],
  contents: [
    { trigger: (job, photos, readings) => photos.some(p => p.room_id), description: 'Contents manipulation and reset', unit: 'hr', qty: 4 },
  ],
  documentation: [
    { trigger: (job, photos, readings) => true, description: 'Supplement documentation and justification', unit: 'each', qty: 1 },
  ],
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { job_id, reason } = body;

  if (!job_id) return Response.json({ error: 'job_id required' }, { status: 400 });

  // Load job
  const job = await base44.asServiceRole.entities.Job.get(job_id).catch(() => null);
  if (!job || job.is_deleted) return Response.json({ error: 'Job not found' }, { status: 404 });

  // Verify user belongs to company
  if (user.role !== 'admin') {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: job.company_id, is_deleted: false });
    if (!profiles.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Load approved estimate (latest approved version)
  const approvedDrafts = await base44.asServiceRole.entities.EstimateDraft.filter({ 
    job_id, 
    status: 'approved',
    is_deleted: false 
  }, '-version_number');

  if (!approvedDrafts.length) {
    return Response.json({ error: 'No approved estimate found for this job. Cannot create supplement without an approved baseline.' }, { status: 422 });
  }

  const originalEstimate = approvedDrafts[0];

  // Load supporting evidence
  const [photos, scopeItems, rooms, moistureReadings, envReadings, observations] = await Promise.all([
    base44.asServiceRole.entities.Photo.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.ScopeItem.filter({ job_id, is_deleted: false, status: 'confirmed' }),
    base44.asServiceRole.entities.Room.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.MoistureReading.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.EnvironmentalReading.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.Observation.filter({ job_id, is_deleted: false }),
  ]);

  // Detect missing scope items
  const detectedScope = [];
  const evidence = { photos, readings: { moisture: moistureReadings, environmental: envReadings }, observations, rooms };

  for (const [category, rules] of Object.entries(CATEGORY_RULES)) {
    for (const rule of rules) {
      if (rule.trigger(job, photos, { moisture: moistureReadings, environmental: envReadings })) {
        // Check if this scope already exists in original estimate
        const existingLineItem = originalEstimate.line_items?.find(
          item => item.category === category && item.description === rule.description
        );

        if (!existingLineItem) {
          detectedScope.push({
            category,
            description: rule.description,
            unit: rule.unit,
            quantity: rule.qty,
            reason: 'Newly discovered or missing scope',
          });
        }
      }
    }
  }

  // Detect underpriced items (compare original line items to current pricing)
  const underpricedItems = [];
  if (originalEstimate.line_items) {
    for (const item of originalEstimate.line_items) {
      const defaultCost = DEFAULT_COSTS[item.category]?.[item.unit] || 0;
      if (defaultCost > 0 && item.unit_cost < defaultCost * 0.8) {
        underpricedItems.push({
          ...item,
          suggested_unit_cost: defaultCost,
          price_difference: (defaultCost - item.unit_cost) * item.quantity,
          reason: 'Underpriced compared to current pricing profile',
        });
      }
    }
  }

  // Build supplement line items
  const supplementLineItems = [];

  // Add detected missing scope
  for (const scope of detectedScope) {
    const unitCost = DEFAULT_COSTS[scope.category]?.[scope.unit] || 50.0;
    supplementLineItems.push({
      scope_item_id: `supp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      room_id: null,
      room_name: 'Supplemental',
      category: scope.category,
      description: scope.description,
      unit: scope.unit,
      quantity: scope.quantity,
      unit_cost: unitCost,
      line_total: unitCost * scope.quantity,
      source: 'supplement_detection',
      override_reason: scope.reason,
    });
  }

  // Add price adjustments for underpriced items
  for (const item of underpricedItems) {
    const priceDiff = item.price_difference;
    supplementLineItems.push({
      scope_item_id: `adj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      room_id: item.room_id,
      room_name: item.room_name,
      category: item.category,
      description: `Price adjustment: ${item.description}`,
      unit: item.unit,
      quantity: item.quantity,
      unit_cost: item.suggested_unit_cost,
      line_total: item.suggested_unit_cost * item.quantity,
      source: 'supplement_detection',
      override_reason: item.reason,
    });
  }

  if (supplementLineItems.length === 0) {
    return Response.json({ 
      error: 'No supplemental scope detected. The current approved estimate appears complete based on available job data.',
      detected_scope: [],
      underpriced_items: [],
    }, { status: 422 });
  }

  // Calculate totals
  const subtotal = supplementLineItems.reduce((sum, item) => sum + item.line_total, 0);
  
  // Apply modifiers from job (use standard multipliers)
  let modifierTotal = 1.0;
  if (job.emergency_flag) modifierTotal *= 1.25;
  if (job.after_hours_flag) modifierTotal *= 1.15;
  if (job.complexity_level === 'complex') modifierTotal *= 1.2;
  if (job.complexity_level === 'very_complex') modifierTotal *= 1.4;
  if (job.access_difficulty === 'moderate') modifierTotal *= 1.1;
  if (job.access_difficulty === 'difficult') modifierTotal *= 1.25;

  const total = subtotal * modifierTotal;

  // Get next version number
  const allDrafts = await base44.asServiceRole.entities.EstimateDraft.filter({ job_id, is_deleted: false });
  const nextVersion = Math.max(...allDrafts.map((d) => d.version_number || 1)) + 1;

  // Create supplement estimate draft
  const supplementDraft = await base44.asServiceRole.entities.EstimateDraft.create({
    company_id: job.company_id,
    job_id,
    version_number: nextVersion,
    label: `Supplement v${nextVersion}`,
    pricing_profile_id: originalEstimate.pricing_profile_id,
    status: 'draft',
    subtotal,
    modifier_total: modifierTotal,
    total,
    applied_modifiers: {
      emergency: job.emergency_flag,
      after_hours: job.after_hours_flag,
      complexity: job.complexity_level,
      access: job.access_difficulty,
    },
    line_items: supplementLineItems,
    notes: `Supplement estimate: ${reason || 'Additional scope and pricing adjustments detected'}`,
    created_by: user.email,
    is_deleted: false,
  });

  // Create supplement record
  const supplement = await base44.asServiceRole.entities.Supplement.create({
    company_id: job.company_id,
    job_id,
    original_estimate_id: originalEstimate.id,
    supplement_estimate_id: supplementDraft.id,
    reason: reason || 'Additional scope detected',
    status: 'draft',
    created_by: user.email,
    created_at: new Date().toISOString(),
    is_deleted: false,
  });

  // Build justification summary
  const justificationNotes = [];
  if (detectedScope.length > 0) {
    justificationNotes.push(`**Missing Scope Detected (${detectedScope.length} items):**`);
    detectedScope.forEach((s, i) => justificationNotes.push(`${i + 1}. ${s.description} - ${s.quantity} ${s.unit}`));
  }
  if (underpricedItems.length > 0) {
    justificationNotes.push(`\n**Underpriced Items Detected (${underpricedItems.length} items):**`);
    underpricedItems.forEach((item, i) => justificationNotes.push(`${i + 1}. ${item.description} - Price adjustment: $${item.price_difference.toFixed(2)}`));
  }

  // Audit log
  await base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: 'Supplement',
    entity_id: supplement.id,
    action: 'created',
    actor_email: user.email,
    actor_id: user.id,
    description: `Supplement estimate v${nextVersion} created for job ${job.job_number || job_id}`,
    metadata: {
      job_id,
      original_estimate_id: originalEstimate.id,
      supplement_estimate_id: supplementDraft.id,
      detected_scope_count: detectedScope.length,
      underpriced_count: underpricedItems.length,
      total_value: total,
    },
  });

  return Response.json({
    supplement,
    draft: supplementDraft,
    detected_scope: detectedScope,
    underpriced_items: underpricedItems,
    justification_notes: justificationNotes.join('\n'),
    message: `Supplement estimate created with ${detectedScope.length} missing scope items and ${underpricedItems.length} price adjustments. Total: $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
  });
});