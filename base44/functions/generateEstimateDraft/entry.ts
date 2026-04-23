import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Default unit costs by category/unit when no pricing profile match found
const DEFAULT_COSTS = {
  containment: { LF: 4.50, EA: 125.00, 'EA/DAY': 85.00 },
  demolition: { SF: 2.25, SY: 18.00 },
  drying: { 'EA/DAY': 65.00, DAY: 45.00, EA: 85.00 },
  cleaning: { SF: 1.75, EA: 195.00, HR: 65.00 },
  deodorization: { EA: 225.00, 'EA/DAY': 95.00 },
  hepa: { SF: 1.20, 'EA/DAY': 95.00 },
  contents: { HR: 75.00, EA: 150.00 },
  documentation: { EA: 95.00 },
};

function lookupUnitCost(profileItems, category, unit, description) {
  if (!profileItems?.length) return null;
  // Exact description match first
  const exact = profileItems.find((p) => p.category === category && p.description === description);
  if (exact) return exact.unit_cost;
  // Category + unit match
  const catUnit = profileItems.find((p) => p.category === category && p.unit === unit);
  if (catUnit) return catUnit.unit_cost;
  return null;
}

function getDefaultCost(category, unit) {
  return DEFAULT_COSTS[category]?.[unit] ?? 50.00;
}

function computeModifiers(job, profile) {
  const mods = {};
  let total = 1.0;

  if (job.emergency_flag) {
    mods.emergency = profile?.modifier_emergency ?? 1.25;
    total *= mods.emergency;
  }
  if (job.after_hours_flag) {
    mods.after_hours = profile?.modifier_after_hours ?? 1.15;
    total *= mods.after_hours;
  }
  const complexity = job.complexity_level;
  if (complexity === 'complex') {
    mods.complexity = profile?.modifier_complexity_complex ?? 1.2;
    total *= mods.complexity;
  } else if (complexity === 'very_complex') {
    mods.complexity = profile?.modifier_complexity_very_complex ?? 1.4;
    total *= mods.complexity;
  }
  const access = job.access_difficulty;
  if (access === 'moderate') {
    mods.access = profile?.modifier_access_moderate ?? 1.1;
    total *= mods.access;
  } else if (access === 'difficult') {
    mods.access = profile?.modifier_access_difficult ?? 1.25;
    total *= mods.access;
  }

  return { mods, total };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Strict authentication
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized', type: 'auth_required' }, { status: 401 });
  }

  const body = await req.json();
  const { job_id, pricing_profile_id } = body;

  if (!job_id) {
    return Response.json({ error: 'job_id required' }, { status: 400 });
  }

  // Load job
  const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id, is_deleted: false });
  if (!jobs.length) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }
  const job = jobs[0];

  // Company isolation - verify access
  if (user.role !== 'admin') {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
      user_id: user.id, 
      company_id: job.company_id, 
      is_deleted: false 
    });
    if (!profiles.length) {
      return Response.json({ error: 'Forbidden', message: 'Access denied: You are not a member of this company.' }, { status: 403 });
    }
  }

  // Role validation - only certain roles can generate estimates
  const ALLOWED_ROLES = ['admin', 'manager', 'estimator'];
  if (!ALLOWED_ROLES.includes(user.role)) {
    return Response.json({ 
      error: 'Forbidden', 
      message: `Role '${user.role}' cannot generate estimates.` 
    }, { status: 403 });
  }

  // Check subscription (only if company_id is a valid non-empty value)
  if (job.company_id && job.company_id !== 'default') {
    try {
      const companies = await base44.asServiceRole.entities.Company.filter({ id: job.company_id, is_deleted: false });
      const company = companies[0];
      if (company && !company.plan_id && !company.subscription_id) {
        return Response.json({ error: 'subscription_required', message: 'An active subscription is required to generate estimates.' }, { status: 402 });
      }
    } catch {
      // Non-fatal — proceed without subscription check if company lookup fails
    }
  }

  // Load confirmed scope items only
  const scopeItems = await base44.asServiceRole.entities.ScopeItem.filter({
    job_id, is_deleted: false, status: 'confirmed',
  });
  if (!scopeItems.length) {
    return Response.json({ error: 'no_scope', message: 'No confirmed scope items found. Confirm scope items before generating an estimate.' }, { status: 422 });
  }

  // Load rooms for name lookup
  const rooms = await base44.asServiceRole.entities.Room.filter({ job_id, is_deleted: false });
  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r]));

  // Load pricing profile
  let profile = null;
  if (pricing_profile_id) {
    const profiles = await base44.asServiceRole.entities.PricingProfile.filter({ id: pricing_profile_id, is_deleted: false });
    profile = profiles[0] || null;
  } else {
    // Use company default profile
    const defaults = await base44.asServiceRole.entities.PricingProfile.filter({ company_id: job.company_id, is_default: true, is_deleted: false });
    profile = defaults[0] || null;
  }

  // Build line items
  const lineItems = scopeItems.map((si) => {
    const unitCost = lookupUnitCost(profile?.line_items, si.category, si.unit, si.description)
      ?? getDefaultCost(si.category, si.unit);
    const lineTotal = +(unitCost * (si.quantity || 1)).toFixed(2);
    return {
      scope_item_id: si.id,
      room_id: si.room_id,
      room_name: roomMap[si.room_id]?.name || 'General',
      category: si.category,
      description: si.description,
      unit: si.unit,
      quantity: si.quantity || 1,
      unit_cost: unitCost,
      line_total: lineTotal,
      source: si.source,
      override_reason: null,
    };
  });

  const subtotal = +lineItems.reduce((s, l) => s + l.line_total, 0).toFixed(2);
  const { mods, total: modTotal } = computeModifiers(job, profile);
  const total = +(subtotal * modTotal).toFixed(2);

  // Version number
  const existing = await base44.asServiceRole.entities.EstimateDraft.filter({ job_id, is_deleted: false });
  const versionNumber = existing.length + 1;

  const draft = await base44.asServiceRole.entities.EstimateDraft.create({
    company_id: job.company_id,
    job_id,
    version_number: versionNumber,
    label: `Draft v${versionNumber}`,
    pricing_profile_id: profile?.id || null,
    status: 'draft',
    subtotal,
    modifier_total: +modTotal.toFixed(4),
    total,
    applied_modifiers: mods,
    line_items: lineItems,
    created_by: user.email,
    is_deleted: false,
  });

  // Mark previous drafts superseded
  for (const prev of existing.filter((e) => e.status === 'draft')) {
    await base44.asServiceRole.entities.EstimateDraft.update(prev.id, { status: 'superseded' });
  }

  await base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: 'EstimateDraft',
    entity_id: draft.id,
    action: 'created',
    actor_email: user.email,
    actor_id: user.id,
    description: `Estimate v${versionNumber} generated — $${total.toLocaleString()} (${scopeItems.length} scope items)`,
    metadata: { job_id, subtotal, total, modifier_total: modTotal, version: versionNumber },
  });

  return Response.json({ draft });
});