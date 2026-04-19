import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Analyzes estimate for profit optimization opportunities.
 * Suggests pricing adjustments, modifier optimizations, and margin improvements.
 */

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

const OPTIMIZATION_RULES = [
  {
    id: 'underpriced_items',
    name: 'Underpriced Line Items',
    description: 'Items priced below market minimums',
    priority: 'high',
  },
  {
    id: 'missing_modifiers',
    name: 'Missing Modifiers',
    description: 'Applicable modifiers not applied',
    priority: 'high',
  },
  {
    id: 'quantity_rounding',
    name: 'Quantity Optimization',
    description: 'Quantities that could be rounded up',
    priority: 'medium',
  },
  {
    id: 'category_gaps',
    name: 'High-Margin Categories',
    description: 'Missing high-margin scope categories',
    priority: 'medium',
  },
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { estimate_version_id } = body;

  if (!estimate_version_id) return Response.json({ error: 'estimate_version_id required' }, { status: 400 });

  // Load estimate draft
  const drafts = await base44.asServiceRole.entities.EstimateDraft.filter({ id: estimate_version_id, is_deleted: false });
  if (!drafts.length) return Response.json({ error: 'Estimate not found' }, { status: 404 });
  const estimate = drafts[0];

  // Verify access
  if (user.role !== 'admin') {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: estimate.company_id, is_deleted: false });
    if (!profiles.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Load job and pricing profile
  const [jobs, pricingProfiles] = await Promise.all([
    base44.asServiceRole.entities.Job.filter({ id: estimate.job_id, is_deleted: false }),
    base44.asServiceRole.entities.PricingProfile.filter({ 
      id: estimate.pricing_profile_id || undefined,
      company_id: estimate.company_id,
      is_deleted: false 
    }),
  ]);

  if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });
  const job = jobs[0];

  const profile = pricingProfiles[0] || null;
  const profileLineItems = profile?.line_items || [];

  const optimizations = [];
  const beforeState = {
    line_items: estimate.line_items || [],
    modifier_total: estimate.modifier_total || 1.0,
    subtotal: estimate.subtotal || 0,
    total: estimate.total || 0,
  };

  const afterLineItems = JSON.parse(JSON.stringify(beforeState.line_items));

  // 1. Check for underpriced items
  for (let i = 0; i < afterLineItems.length; i++) {
    const item = afterLineItems[i];
    const minCost = CATEGORY_MIN_COSTS[item.category]?.[item.unit] || 0;
    
    if (minCost > 0 && item.unit_cost < minCost) {
      const suggestedCost = minCost;
      const increase = (suggestedCost - item.unit_cost) * item.quantity;
      
      optimizations.push({
        type: 'underpriced_items',
        line_item_id: item.scope_item_id,
        description: item.description,
        current_value: `$${item.unit_cost.toFixed(2)}/${item.unit}`,
        suggested_value: `$${suggestedCost.toFixed(2)}/${item.unit}`,
        margin_impact: increase,
        justification: `Below minimum cost for ${item.category} ${item.unit}`,
        risk: 'low',
      });

      // Apply optimization
      item.unit_cost = suggestedCost;
      item.line_total = suggestedCost * item.quantity;
      item.optimization_applied = true;
    }
  }

  // 2. Check for missing modifiers based on job flags
  const currentModifiers = estimate.applied_modifiers || {};
  const modifierChanges = [];

  if (job.emergency_flag && !currentModifiers.emergency) {
    const emergencyMult = profile?.modifier_emergency || 1.25;
    modifierChanges.push({
      type: 'missing_modifiers',
      modifier: 'emergency',
      current_value: 'Not applied',
      suggested_value: `${(emergencyMult * 100).toFixed(0)}%`,
      justification: 'Job flagged as emergency',
      impact_multiplier: emergencyMult,
    });
  }

  if (job.after_hours_flag && !currentModifiers.after_hours) {
    const afterHoursMult = profile?.modifier_after_hours || 1.15;
    modifierChanges.push({
      type: 'missing_modifiers',
      modifier: 'after_hours',
      current_value: 'Not applied',
      suggested_value: `${(afterHoursMult * 100).toFixed(0)}%`,
      justification: 'Job flagged as after hours',
      impact_multiplier: afterHoursMult,
    });
  }

  if (job.complexity_level === 'complex' && currentModifiers.complexity !== 'complex') {
    const complexMult = profile?.modifier_complexity_complex || 1.2;
    modifierChanges.push({
      type: 'missing_modifiers',
      modifier: 'complexity',
      current_value: currentModifiers.complexity || 'standard',
      suggested_value: 'complex',
      justification: `Job complexity: ${job.complexity_level}`,
      impact_multiplier: complexMult,
    });
  }

  if (job.complexity_level === 'very_complex' && currentModifiers.complexity !== 'very_complex') {
    const veryComplexMult = profile?.modifier_complexity_very_complex || 1.4;
    modifierChanges.push({
      type: 'missing_modifiers',
      modifier: 'complexity',
      current_value: currentModifiers.complexity || 'standard',
      suggested_value: 'very_complex',
      justification: `Job complexity: ${job.complexity_level}`,
      impact_multiplier: veryComplexMult,
    });
  }

  if (job.access_difficulty === 'difficult' && currentModifiers.access !== 'difficult') {
    const difficultMult = profile?.modifier_access_difficult || 1.25;
    modifierChanges.push({
      type: 'missing_modifiers',
      modifier: 'access',
      current_value: currentModifiers.access || 'easy',
      suggested_value: 'difficult',
      justification: `Job access: ${job.access_difficulty}`,
      impact_multiplier: difficultMult,
    });
  }

  // 3. Check for quantity rounding opportunities
  for (let i = 0; i < afterLineItems.length; i++) {
    const item = afterLineItems[i];
    const decimal = item.quantity % 1;
    
    if (decimal > 0 && decimal < 0.3 && item.quantity > 10) {
      const roundedQty = Math.ceil(item.quantity);
      const increase = (roundedQty - item.quantity) * item.unit_cost;
      
      optimizations.push({
        type: 'quantity_rounding',
        line_item_id: item.scope_item_id,
        description: item.description,
        current_value: `${item.quantity} ${item.unit}`,
        suggested_value: `${roundedQty} ${item.unit}`,
        margin_impact: increase,
        justification: `Round up from ${item.quantity.toFixed(2)} to ${roundedQty}`,
        risk: 'low',
      });

      item.quantity = roundedQty;
      item.line_total = item.unit_cost * roundedQty;
    }
  }

  // 4. Check for missing high-margin categories
  const existingCategories = [...new Set(afterLineItems.map(item => item.category))];
  const highMarginCategories = ['documentation', 'deodorization', 'hepa', 'contents'];
  
  for (const cat of highMarginCategories) {
    if (!existingCategories.includes(cat)) {
      const suggestedQty = cat === 'documentation' ? 1 : cat === 'hepa' ? 2 : 3;
      const suggestedCost = CATEGORY_MIN_COSTS[cat]?.each || 50;
      const potentialRevenue = suggestedQty * suggestedCost;
      
      optimizations.push({
        type: 'category_gaps',
        category: cat,
        current_value: 'Not included',
        suggested_value: `${suggestedQty} units @ $${suggestedCost.toFixed(2)}`,
        margin_impact: potentialRevenue,
        justification: `High-margin category not present in scope`,
        risk: 'medium',
      });
    }
  }

  // Calculate after state
  const afterSubtotal = afterLineItems.reduce((sum, item) => sum + item.line_total, 0);
  
  // Calculate new modifier total
  let afterModifierTotal = 1.0;
  for (const change of modifierChanges) {
    afterModifierTotal *= change.impact_multiplier;
  }
  // Preserve existing modifiers
  if (currentModifiers.emergency) afterModifierTotal *= (profile?.modifier_emergency || 1.25);
  if (currentModifiers.after_hours) afterModifierTotal *= (profile?.modifier_after_hours || 1.15);
  if (currentModifiers.complexity === 'complex') afterModifierTotal *= (profile?.modifier_complexity_complex || 1.2);
  if (currentModifiers.complexity === 'very_complex') afterModifierTotal *= (profile?.modifier_complexity_very_complex || 1.4);
  if (currentModifiers.access === 'difficult') afterModifierTotal *= (profile?.modifier_access_difficult || 1.25);

  const afterTotal = afterSubtotal * afterModifierTotal;

  // Calculate total margin improvement
  const marginImprovement = (afterTotal - beforeState.total);
  const marginImprovementPct = beforeState.total > 0 ? ((marginImprovement / beforeState.total) * 100) : 0;

  // Sort optimizations by impact
  optimizations.sort((a, b) => b.margin_impact - a.margin_impact);

  return Response.json({
    estimate_id: estimate_version_id,
    summary: {
      current_total: beforeState.total,
      optimized_total: afterTotal,
      margin_improvement: marginImprovement,
      margin_improvement_pct: marginImprovementPct,
      total_optimizations: optimizations.length + modifierChanges.length,
      high_priority_count: [...optimizations, ...modifierChanges].filter(o => o.priority === 'high' || o.risk === 'low').length,
    },
    before: {
      subtotal: beforeState.subtotal,
      modifier_total: beforeState.modifier_total,
      total: beforeState.total,
      line_item_count: beforeState.line_items.length,
    },
    after: {
      subtotal: afterSubtotal,
      modifier_total: afterModifierTotal,
      total: afterTotal,
      line_item_count: afterLineItems.length,
    },
    pricing_optimizations: optimizations,
    modifier_adjustments: modifierChanges,
    optimized_line_items: afterLineItems,
    message: marginImprovement > 0
      ? `Found ${optimizations.length + modifierChanges.length} optimization opportunities. Potential margin increase: $${marginImprovement.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${marginImprovementPct.toFixed(1)}%)`
      : 'Estimate appears well-optimized. No significant improvements found.',
  });
});