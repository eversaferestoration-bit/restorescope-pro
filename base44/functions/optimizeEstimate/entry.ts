import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CATEGORY_MIN_COSTS = {
  containment: { sqft: 1.25, linear_ft: 2.00, each: 150.00 },
  demolition: { sqft: 2.50, lf: 1.50, each: 35.00 },
  drying: { each: 1.00, hr: 0.75, day: 25.00 },
  cleaning: { sqft: 2.00, each: 25.00 },
  deodorization: { sqft: 1.25, each: 65.00, hr: 45.00 },
  hepa: { each: 2.00, hr: 1.00, day: 35.00 },
  contents: { each: 20.00, hr: 55.00 },
  documentation: { each: 125.00, hr: 85.00 },
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { estimate_version_id } = body;

  if (!estimate_version_id) return Response.json({ error: 'estimate_version_id required' }, { status: 400 });

  const drafts = await base44.asServiceRole.entities.EstimateDraft.filter({ id: estimate_version_id, is_deleted: false });
  if (!drafts.length) return Response.json({ error: 'Estimate not found' }, { status: 404 });
  const estimate = drafts[0];

  // Strict company isolation — no admin bypass
  const callerProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
  const callerCompanyId = callerProfiles[0]?.company_id;
  if (!callerCompanyId || callerCompanyId !== estimate.company_id) {
    return Response.json({ error: 'Forbidden', message: 'Access denied: resource belongs to a different company.' }, { status: 403 });
  }

  const [jobs, pricingProfiles] = await Promise.all([
    base44.asServiceRole.entities.Job.filter({ id: estimate.job_id, is_deleted: false }),
    estimate.pricing_profile_id
      ? base44.asServiceRole.entities.PricingProfile.filter({ id: estimate.pricing_profile_id, company_id: estimate.company_id, is_deleted: false })
      : base44.asServiceRole.entities.PricingProfile.filter({ company_id: estimate.company_id, is_deleted: false }),
  ]);

  if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });
  const job = jobs[0];
  const profile = pricingProfiles[0] || null;
  const profileLineItems = profile?.line_items || [];

  const optimizations = [];
  const beforeState = { line_items: estimate.line_items || [], modifier_total: estimate.modifier_total || 1.0, subtotal: estimate.subtotal || 0, total: estimate.total || 0 };
  const afterLineItems = JSON.parse(JSON.stringify(beforeState.line_items));

  for (let i = 0; i < afterLineItems.length; i++) {
    const item = afterLineItems[i];
    const minCost = CATEGORY_MIN_COSTS[item.category]?.[item.unit] || 0;
    if (minCost > 0 && item.unit_cost < minCost) {
      const increase = (minCost - item.unit_cost) * item.quantity;
      optimizations.push({ type: 'underpriced_items', line_item_id: item.scope_item_id, description: item.description, current_value: `$${item.unit_cost.toFixed(2)}/${item.unit}`, suggested_value: `$${minCost.toFixed(2)}/${item.unit}`, margin_impact: increase, justification: `Below minimum cost for ${item.category} ${item.unit}`, risk: 'low' });
      item.unit_cost = minCost;
      item.line_total = minCost * item.quantity;
      item.optimization_applied = true;
    }
  }

  const currentModifiers = estimate.applied_modifiers || {};
  const modifierChanges = [];

  if (job.emergency_flag && !currentModifiers.emergency) {
    const m = profile?.modifier_emergency || 1.25;
    modifierChanges.push({ type: 'missing_modifiers', modifier: 'emergency', current_value: 'Not applied', suggested_value: `${(m * 100).toFixed(0)}%`, justification: 'Job flagged as emergency', impact_multiplier: m });
  }
  if (job.after_hours_flag && !currentModifiers.after_hours) {
    const m = profile?.modifier_after_hours || 1.15;
    modifierChanges.push({ type: 'missing_modifiers', modifier: 'after_hours', current_value: 'Not applied', suggested_value: `${(m * 100).toFixed(0)}%`, justification: 'Job flagged as after hours', impact_multiplier: m });
  }
  if (job.complexity_level === 'complex' && currentModifiers.complexity !== 'complex') {
    const m = profile?.modifier_complexity_complex || 1.2;
    modifierChanges.push({ type: 'missing_modifiers', modifier: 'complexity', current_value: currentModifiers.complexity || 'standard', suggested_value: 'complex', justification: `Job complexity: ${job.complexity_level}`, impact_multiplier: m });
  }
  if (job.complexity_level === 'very_complex' && currentModifiers.complexity !== 'very_complex') {
    const m = profile?.modifier_complexity_very_complex || 1.4;
    modifierChanges.push({ type: 'missing_modifiers', modifier: 'complexity', current_value: currentModifiers.complexity || 'standard', suggested_value: 'very_complex', justification: `Job complexity: ${job.complexity_level}`, impact_multiplier: m });
  }
  if (job.access_difficulty === 'difficult' && currentModifiers.access !== 'difficult') {
    const m = profile?.modifier_access_difficult || 1.25;
    modifierChanges.push({ type: 'missing_modifiers', modifier: 'access', current_value: currentModifiers.access || 'easy', suggested_value: 'difficult', justification: `Job access: ${job.access_difficulty}`, impact_multiplier: m });
  }

  for (let i = 0; i < afterLineItems.length; i++) {
    const item = afterLineItems[i];
    const decimal = item.quantity % 1;
    if (decimal > 0 && decimal < 0.3 && item.quantity > 10) {
      const roundedQty = Math.ceil(item.quantity);
      const increase = (roundedQty - item.quantity) * item.unit_cost;
      optimizations.push({ type: 'quantity_rounding', line_item_id: item.scope_item_id, description: item.description, current_value: `${item.quantity} ${item.unit}`, suggested_value: `${roundedQty} ${item.unit}`, margin_impact: increase, justification: `Round up from ${item.quantity.toFixed(2)} to ${roundedQty}`, risk: 'low' });
      item.quantity = roundedQty;
      item.line_total = item.unit_cost * roundedQty;
    }
  }

  const existingCategories = [...new Set(afterLineItems.map(item => item.category))];
  const highMarginCategories = ['documentation', 'deodorization', 'hepa', 'contents'];
  for (const cat of highMarginCategories) {
    if (!existingCategories.includes(cat)) {
      const suggestedQty = cat === 'documentation' ? 1 : cat === 'hepa' ? 2 : 3;
      const suggestedCost = CATEGORY_MIN_COSTS[cat]?.each || 50;
      optimizations.push({ type: 'category_gaps', category: cat, current_value: 'Not included', suggested_value: `${suggestedQty} units @ $${suggestedCost.toFixed(2)}`, margin_impact: suggestedQty * suggestedCost, justification: 'High-margin category not present in scope', risk: 'medium' });
    }
  }

  const afterSubtotal = afterLineItems.reduce((sum, item) => sum + item.line_total, 0);
  let afterModifierTotal = 1.0;
  for (const change of modifierChanges) afterModifierTotal *= change.impact_multiplier;
  if (currentModifiers.emergency) afterModifierTotal *= (profile?.modifier_emergency || 1.25);
  if (currentModifiers.after_hours) afterModifierTotal *= (profile?.modifier_after_hours || 1.15);
  if (currentModifiers.complexity === 'complex') afterModifierTotal *= (profile?.modifier_complexity_complex || 1.2);
  if (currentModifiers.complexity === 'very_complex') afterModifierTotal *= (profile?.modifier_complexity_very_complex || 1.4);
  if (currentModifiers.access === 'difficult') afterModifierTotal *= (profile?.modifier_access_difficult || 1.25);

  const afterTotal = afterSubtotal * afterModifierTotal;
  const marginImprovement = afterTotal - beforeState.total;
  const marginImprovementPct = beforeState.total > 0 ? ((marginImprovement / beforeState.total) * 100) : 0;

  optimizations.sort((a, b) => b.margin_impact - a.margin_impact);

  return Response.json({
    estimate_id: estimate_version_id,
    summary: { current_total: beforeState.total, optimized_total: afterTotal, margin_improvement: marginImprovement, margin_improvement_pct: marginImprovementPct, total_optimizations: optimizations.length + modifierChanges.length },
    before: { subtotal: beforeState.subtotal, modifier_total: beforeState.modifier_total, total: beforeState.total, line_item_count: beforeState.line_items.length },
    after: { subtotal: afterSubtotal, modifier_total: afterModifierTotal, total: afterTotal, line_item_count: afterLineItems.length },
    pricing_optimizations: optimizations,
    modifier_adjustments: modifierChanges,
    optimized_line_items: afterLineItems,
    message: marginImprovement > 0 ? `Found ${optimizations.length + modifierChanges.length} optimization opportunities. Potential margin increase: $${marginImprovement.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${marginImprovementPct.toFixed(1)}%)` : 'Estimate appears well-optimized. No significant improvements found.',
  });
});