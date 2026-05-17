import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized', type: 'auth_required' }, { status: 401 });
  }

  if (!['admin', 'manager', 'estimator'].includes(user.role)) {
    return Response.json({ error: 'Forbidden', message: 'Estimator, manager, or admin access required.' }, { status: 403 });
  }

  const body = await req.json();
  const { estimate_version_id } = body;

  if (!estimate_version_id) {
    return Response.json({ error: 'estimate_version_id required' }, { status: 400 });
  }

  const estimates = await base44.asServiceRole.entities.EstimateDraft.filter({ id: estimate_version_id, is_deleted: false });
  if (!estimates.length) return Response.json({ error: 'Estimate not found' }, { status: 404 });
  const estimate = estimates[0];

  // Strict company isolation — no admin bypass
  const callerProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
  const callerCompanyId = callerProfiles[0]?.company_id;
  if (!callerCompanyId || callerCompanyId !== estimate.company_id) {
    return Response.json({ error: 'Forbidden', message: 'Access denied: resource belongs to a different company.' }, { status: 403 });
  }

  const jobs = await base44.asServiceRole.entities.Job.filter({ id: estimate.job_id, is_deleted: false });
  if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });
  const job = jobs[0];

  let pricingProfile = null;
  if (estimate.pricing_profile_id) {
    const pp = await base44.asServiceRole.entities.PricingProfile.filter({ id: estimate.pricing_profile_id, is_deleted: false });
    pricingProfile = pp[0] || null;
  }

  const lineItems = estimate.line_items || [];

  let benchmarks = [];
  try {
    benchmarks = await base44.asServiceRole.entities.BenchmarkAggregate.filter({ metric_type: 'line_item_price', region_code: 'US', is_deleted: false });
  } catch { benchmarks = []; }

  let approvedEstimates = [];
  try {
    approvedEstimates = await base44.asServiceRole.entities.EstimateDraft.filter({ company_id: estimate.company_id, status: 'approved', is_deleted: false });
  } catch { approvedEstimates = []; }

  let defense = null;
  try {
    const defenses = await base44.asServiceRole.entities.ClaimDefense.filter({ estimate_version_id, is_deleted: false });
    defense = defenses[0] || null;
  } catch { defense = null; }

  const suggestions = lineItems.map((item) => {
    const suggestions_for_item = [];
    let recommended_adjustment = 0;
    let confidence = 'medium';
    const reasoning = [];

    const benchmark = benchmarks.find(b => b.avg_line_item_price && item.category === b.metric_type?.split('_')[0]);
    if (benchmark) {
      const benchmarkPrice = benchmark.avg_line_item_price;
      const variance = ((item.unit_cost - benchmarkPrice) / benchmarkPrice) * 100;
      if (variance > 15) {
        suggestions_for_item.push({ type: 'price_reduction', priority: 'high', description: `Price is ${variance.toFixed(1)}% above market benchmark`, recommended_action: `Consider reducing to $${benchmarkPrice.toFixed(2)}`, impact: 'May reduce carrier pushback' });
        recommended_adjustment -= (item.unit_cost - benchmarkPrice) * 0.5;
        reasoning.push(`Market benchmark: $${benchmarkPrice.toFixed(2)} (${variance.toFixed(1)}% variance)`);
      } else if (variance < -15) {
        suggestions_for_item.push({ type: 'price_increase', priority: 'medium', description: `Price is ${Math.abs(variance).toFixed(1)}% below market benchmark`, recommended_action: `Consider increasing to $${benchmarkPrice.toFixed(2)}`, impact: 'Could improve margin' });
        recommended_adjustment += (benchmarkPrice - item.unit_cost) * 0.5;
        reasoning.push(`Market benchmark: $${benchmarkPrice.toFixed(2)}`);
      } else {
        reasoning.push(`Pricing aligned with market benchmark ($${benchmarkPrice.toFixed(2)})`);
      }
    }

    const historicalItems = approvedEstimates.flatMap(e => e.line_items || []).filter(li => li.category === item.category && li.description === item.description);
    if (historicalItems.length > 0) {
      const avgApprovedPrice = historicalItems.reduce((sum, li) => sum + (li.unit_cost || 0), 0) / historicalItems.length;
      const historicalVariance = ((item.unit_cost - avgApprovedPrice) / avgApprovedPrice) * 100;
      if (historicalVariance > 10) {
        suggestions_for_item.push({ type: 'alignment_adjustment', priority: 'medium', description: `Price is ${historicalVariance.toFixed(1)}% higher than historically approved`, recommended_action: `Historical average: $${avgApprovedPrice.toFixed(2)}`, impact: 'May improve approval probability' });
        reasoning.push(`Historical approval avg: $${avgApprovedPrice.toFixed(2)}`);
        confidence = 'high';
      }
    }

    if (defense) {
      const riskFlag = defense.risk_flags?.find(f => f.line_item_ids?.includes(item.scope_item_id));
      if (riskFlag) {
        suggestions_for_item.push({ type: 'risk_mitigation', priority: 'high', description: `Item flagged in defense analysis: ${riskFlag.description}`, recommended_action: 'Strengthen documentation or consider price adjustment', impact: `Reduces ${riskFlag.severity}-risk carrier pushback` });
        reasoning.push(`Defense risk flag: ${riskFlag.severity} severity`);
        confidence = 'high';
      }
    }

    const currentTotal = item.unit_cost * item.quantity;
    const recommendedTotal = (item.unit_cost + (recommended_adjustment / (item.quantity || 1))) * item.quantity;

    return {
      scope_item_id: item.scope_item_id,
      category: item.category,
      description: item.description,
      current_unit_cost: item.unit_cost,
      current_line_total: item.line_total,
      recommended_unit_cost: Math.max(0, item.unit_cost + (recommended_adjustment / (item.quantity || 1))),
      recommended_line_total: Math.max(0, recommendedTotal),
      adjustment_amount: recommended_adjustment,
      adjustment_percentage: recommended_adjustment !== 0 ? ((recommendedTotal - currentTotal) / currentTotal * 100) : 0,
      confidence,
      reasoning,
      suggestions: suggestions_for_item,
    };
  });

  const currentTotal = estimate.total || 0;
  const recommendedTotal = suggestions.reduce((sum, s) => sum + s.recommended_line_total, 0);
  const totalAdjustment = recommendedTotal - currentTotal;
  const adjustmentPercentage = currentTotal > 0 ? (totalAdjustment / currentTotal * 100) : 0;

  await base44.asServiceRole.entities.AuditLog.create({
    company_id: estimate.company_id,
    entity_type: 'EstimateDraft',
    entity_id: estimate.id,
    action: 'smart_pricing_analyzed',
    actor_email: user.email,
    actor_id: user.id,
    description: `Smart pricing analysis performed on estimate ${estimate.label || estimate.id}`,
    metadata: { current_total: currentTotal, recommended_total: recommendedTotal, adjustment_percentage: adjustmentPercentage, suggestions_count: suggestions.filter(s => s.suggestions.length > 0).length },
  });

  return Response.json({
    estimate_version_id,
    current_estimate: { total: currentTotal, line_items_count: lineItems.length, pricing_profile: pricingProfile?.name || 'Default' },
    recommendations: { total: recommendedTotal, adjustment: totalAdjustment, adjustment_percentage: adjustmentPercentage },
    summary: {
      total_items_analyzed: suggestions.length,
      items_with_suggestions: suggestions.filter(s => s.suggestions.length > 0).length,
      high_confidence_suggestions: suggestions.filter(s => s.confidence === 'high').length,
      total_adjustment: totalAdjustment,
      adjustment_percentage: adjustmentPercentage,
    },
    suggestions_by_item: suggestions,
    analyzed_at: new Date().toISOString(),
    analyzed_by: user.email,
  });
});