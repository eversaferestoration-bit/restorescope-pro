import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Provides intelligent pricing recommendations based on:
 * - Market benchmarks (regional averages)
 * - Historical approval data (what carriers have approved)
 * - Job complexity factors
 * - Pricing profile constraints
 * 
 * Returns actionable suggestions without auto-changing prices.
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Authentication - manager/admin/estimator
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized', type: 'auth_required' }, { status: 401 });
  }

  if (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'estimator') {
    return Response.json({ error: 'Forbidden', message: 'Estimator, manager, or admin access required.' }, { status: 403 });
  }

  const body = await req.json();
  const { estimate_version_id } = body;

  if (!estimate_version_id) {
    return Response.json({ error: 'estimate_version_id required' }, { status: 400 });
  }

  // Load estimate
  const estimates = await base44.asServiceRole.entities.EstimateDraft.filter({ 
    id: estimate_version_id, 
    is_deleted: false 
  });
  
  if (!estimates.length) {
    return Response.json({ error: 'Estimate not found' }, { status: 404 });
  }
  
  const estimate = estimates[0];

  // Company isolation
  if (user.role !== 'admin') {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
      user_id: user.id, 
      company_id: estimate.company_id, 
      is_deleted: false 
    });
    if (!profiles.length) {
      return Response.json({ error: 'Forbidden: not a member of this company.' }, { status: 403 });
    }
  }

  // Load job for complexity factors
  const jobs = await base44.asServiceRole.entities.Job.filter({ 
    id: estimate.job_id, 
    is_deleted: false 
  });
  if (!jobs.length) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }
  const job = jobs[0];

  // Load pricing profile
  let pricingProfile = null;
  if (estimate.pricing_profile_id) {
    try {
      const pricingProfiles = await base44.asServiceRole.entities.PricingProfile.filter({ 
        id: estimate.pricing_profile_id, 
        is_deleted: false 
      });
      pricingProfile = pricingProfiles[0] || null;
    } catch (e) {
      // Pricing profile not found
      pricingProfile = null;
    }
  }

  // Load line items
  const lineItems = estimate.line_items || [];

  // Load benchmarks for this region
  let benchmarks = [];
  try {
    benchmarks = await base44.asServiceRole.entities.BenchmarkAggregate.filter({ 
      metric_type: 'line_item_price',
      region_code: 'US',
      is_deleted: false 
    });
  } catch (e) {
    // Benchmarks may not exist yet
    benchmarks = [];
  }

  // Load historical approved estimates for this company
  let approvedEstimates = [];
  try {
    approvedEstimates = await base44.asServiceRole.entities.EstimateDraft.filter({ 
      company_id: estimate.company_id,
      status: 'approved',
      is_deleted: false 
    });
  } catch (e) {
    // No approved estimates yet
    approvedEstimates = [];
  }

  // Load claim defense if available
  let defense = null;
  try {
    const defenses = await base44.asServiceRole.entities.ClaimDefense.filter({ 
      estimate_version_id, 
      is_deleted: false 
    });
    defense = defenses[0] || null;
  } catch (e) {
    // No defense analysis yet
    defense = null;
  }

  // Analyze each line item
  const suggestions = lineItems.map((item, idx) => {
    const suggestions_for_item = [];
    let recommended_adjustment = 0;
    let confidence = 'medium';
    const reasoning = [];

    // 1. Benchmark Comparison
    const benchmark = benchmarks.find(b => 
      b.avg_line_item_price && 
      item.category === b.metric_type?.split('_')[0]
    );

    if (benchmark) {
      const benchmarkPrice = benchmark.avg_line_item_price;
      const variance = ((item.unit_cost - benchmarkPrice) / benchmarkPrice) * 100;

      if (variance > 15) {
        suggestions_for_item.push({
          type: 'price_reduction',
          priority: 'high',
          description: `Price is ${variance.toFixed(1)}% above market benchmark`,
          recommended_action: `Consider reducing unit cost from $${item.unit_cost} to $${benchmarkPrice.toFixed(2)}`,
          impact: 'May reduce carrier pushback',
        });
        recommended_adjustment -= (item.unit_cost - benchmarkPrice) * 0.5; // Suggest 50% of gap
        reasoning.push(`Market benchmark: $${benchmarkPrice.toFixed(2)} (${variance.toFixed(1)}% variance)`);
      } else if (variance < -15) {
        suggestions_for_item.push({
          type: 'price_increase',
          priority: 'medium',
          description: `Price is ${Math.abs(variance).toFixed(1)}% below market benchmark`,
          recommended_action: `Consider increasing unit cost from $${item.unit_cost} to $${benchmarkPrice.toFixed(2)}`,
          impact: 'Could improve margin without significantly affecting approval',
        });
        recommended_adjustment += (benchmarkPrice - item.unit_cost) * 0.5;
        reasoning.push(`Market benchmark: $${benchmarkPrice.toFixed(2)} (${Math.abs(variance).toFixed(1)}% below market)`);
      } else {
        reasoning.push(`Pricing aligned with market benchmark ($${benchmarkPrice.toFixed(2)})`);
      }
    } else {
      reasoning.push('No market benchmark available for this category');
    }

    // 2. Historical Approval Analysis
    const historicalItems = approvedEstimates.flatMap(e => e.line_items || [])
      .filter(li => li.category === item.category && li.description === item.description);

    if (historicalItems.length > 0) {
      const avgApprovedPrice = historicalItems.reduce((sum, li) => sum + (li.unit_cost || 0), 0) / historicalItems.length;
      const historicalVariance = ((item.unit_cost - avgApprovedPrice) / avgApprovedPrice) * 100;

      if (historicalVariance > 10) {
        suggestions_for_item.push({
          type: 'alignment_adjustment',
          priority: 'medium',
          description: `Price is ${historicalVariance.toFixed(1)}% higher than historically approved`,
          recommended_action: `Historical average: $${avgApprovedPrice.toFixed(2)} (${historicalItems.length} approved estimates)`,
          impact: 'Aligning may improve approval probability',
        });
        reasoning.push(`Historical approval avg: $${avgApprovedPrice.toFixed(2)}`);
        confidence = 'high';
      } else if (historicalVariance < -10) {
        suggestions_for_item.push({
          type: 'margin_opportunity',
          priority: 'low',
          description: `Price is ${Math.abs(historicalVariance).toFixed(1)}% lower than historically approved`,
          recommended_action: `Room to increase to $${avgApprovedPrice.toFixed(2)} based on approval history`,
          impact: 'Could improve margin while maintaining approval likelihood',
        });
        reasoning.push(`Historical approval avg: $${avgApprovedPrice.toFixed(2)}`);
      } else {
        reasoning.push(`Pricing consistent with ${historicalItems.length} historically approved estimates`);
      }
    }

    // 3. Job Complexity Factors
    const complexityMultiplier = (job.complexity_level === 'very_complex') ? 1.4 :
                                  (job.complexity_level === 'complex') ? 1.2 : 1.0;
    const accessMultiplier = (job.access_difficulty === 'difficult') ? 1.25 :
                              (job.access_difficulty === 'moderate') ? 1.1 : 1.0;

    if (complexityMultiplier > 1.0 || accessMultiplier > 1.0) {
      const basePrice = item.unit_cost / (complexityMultiplier * accessMultiplier);
      const complexityAdjusted = basePrice * complexityMultiplier * accessMultiplier;
      
      if (item.unit_cost < complexityAdjusted * 0.95) {
        suggestions_for_item.push({
          type: 'complexity_adjustment',
          priority: 'medium',
          description: 'Price may not fully reflect job complexity',
          recommended_action: `Consider adjusting for complexity (${job.complexity_level}) and access (${job.access_difficulty})`,
          impact: 'Ensures adequate compensation for challenging conditions',
        });
        reasoning.push(`Complexity factors: ${job.complexity_level} (${(complexityMultiplier * 100).toFixed(0)}%), Access: ${job.access_difficulty} (${(accessMultiplier * 100).toFixed(0)}%)`);
      }
    }

    // 4. Defense Analysis (if available)
    if (defense) {
      const riskFlag = defense.risk_flags?.find(f => 
        f.line_item_ids?.includes(item.scope_item_id)
      );

      if (riskFlag) {
        suggestions_for_item.push({
          type: 'risk_mitigation',
          priority: 'high',
          description: `Item flagged in defense analysis: ${riskFlag.description}`,
          recommended_action: 'Strengthen documentation or consider price adjustment',
          impact: `Reduces ${riskFlag.severity}-risk carrier pushback`,
        });
        reasoning.push(`Defense risk flag: ${riskFlag.severity} severity`);
        confidence = 'high';
      }
    }

    // 5. Pricing Profile Constraints
    if (pricingProfile?.line_items) {
      const profileItem = pricingProfile.line_items.find(
        li => li.category === item.category && li.description === item.description
      );

      if (profileItem) {
        const profileVariance = ((item.unit_cost - profileItem.unit_cost) / profileItem.unit_cost) * 100;
        
        if (Math.abs(profileVariance) > 10) {
          suggestions_for_item.push({
            type: 'profile_alignment',
            priority: 'low',
            description: `Price deviates ${profileVariance.toFixed(1)}% from pricing profile`,
            recommended_action: `Profile standard: $${profileItem.unit_cost.toFixed(2)}`,
            impact: 'Maintains consistency with company pricing standards',
          });
          reasoning.push(`Pricing profile: $${profileItem.unit_cost.toFixed(2)}`);
        }
      }
    }

    // Calculate final recommendation
    const currentTotal = item.unit_cost * item.quantity;
    const recommendedTotal = (item.unit_cost + (recommended_adjustment / item.quantity)) * item.quantity;
    
    return {
      scope_item_id: item.scope_item_id,
      category: item.category,
      description: item.description,
      current_unit_cost: item.unit_cost,
      current_line_total: item.line_total,
      recommended_unit_cost: Math.max(0, item.unit_cost + (recommended_adjustment / item.quantity)),
      recommended_line_total: Math.max(0, recommendedTotal),
      adjustment_amount: recommended_adjustment,
      adjustment_percentage: recommended_adjustment !== 0 ? ((recommendedTotal - currentTotal) / currentTotal * 100) : 0,
      confidence,
      reasoning,
      suggestions: suggestions_for_item,
    };
  });

  // Calculate aggregate metrics
  const currentTotal = estimate.total || 0;
  const recommendedTotal = suggestions.reduce((sum, s) => sum + s.recommended_line_total, 0);
  const totalAdjustment = recommendedTotal - currentTotal;
  const adjustmentPercentage = currentTotal > 0 ? (totalAdjustment / currentTotal * 100) : 0;

  // Categorize suggestions by type
  const byType = {
    price_reduction: suggestions.filter(s => s.suggestions.some(sg => sg.type === 'price_reduction')),
    price_increase: suggestions.filter(s => s.suggestions.some(sg => sg.type === 'price_increase')),
    margin_opportunity: suggestions.filter(s => s.suggestions.some(sg => sg.type === 'margin_opportunity')),
    alignment_adjustment: suggestions.filter(s => s.suggestions.some(sg => sg.type === 'alignment_adjustment')),
    complexity_adjustment: suggestions.filter(s => s.suggestions.some(sg => sg.type === 'complexity_adjustment')),
    risk_mitigation: suggestions.filter(s => s.suggestions.some(sg => sg.type === 'risk_mitigation')),
  };

  // Summary statistics
  const summary = {
    total_items_analyzed: suggestions.length,
    items_with_suggestions: suggestions.filter(s => s.suggestions.length > 0).length,
    high_confidence_suggestions: suggestions.filter(s => s.confidence === 'high').length,
    total_adjustment: totalAdjustment,
    adjustment_percentage: adjustmentPercentage,
    by_type: {
      reductions: byType.price_reduction.length,
      increases: byType.price_increase.length + byType.margin_opportunity.length,
      alignments: byType.alignment_adjustment.length + byType.complexity_adjustment.length,
      risk_mitigation: byType.risk_mitigation.length,
    },
  };

  // Log to audit
  await base44.asServiceRole.entities.AuditLog.create({
    company_id: estimate.company_id,
    entity_type: 'EstimateDraft',
    entity_id: estimate.id,
    action: 'smart_pricing_analyzed',
    actor_email: user.email,
    actor_id: user.id,
    description: `Smart pricing analysis performed on estimate ${estimate.label || estimate.id}`,
    metadata: {
      current_total: currentTotal,
      recommended_total: recommendedTotal,
      adjustment_percentage: adjustmentPercentage,
      suggestions_count: summary.items_with_suggestions,
    },
  });

  return Response.json({
    estimate_version_id,
    current_estimate: {
      total: currentTotal,
      line_items_count: lineItems.length,
      pricing_profile: pricingProfile?.name || 'Default',
    },
    recommendations: {
      total: recommendedTotal,
      adjustment: totalAdjustment,
      adjustment_percentage: adjustmentPercentage,
    },
    summary,
    suggestions_by_item: suggestions,
    suggestions_by_type: {
      price_reductions: byType.price_reduction,
      price_increases: byType.price_increase,
      margin_opportunities: byType.margin_opportunity,
      alignment_adjustments: byType.alignment_adjustment,
      complexity_adjustments: byType.complexity_adjustment,
      risk_mitigations: byType.risk_mitigation,
    },
    pricing_profile_constraints: pricingProfile ? {
      name: pricingProfile.name,
      is_default: pricingProfile.is_default,
    } : null,
    analyzed_at: new Date().toISOString(),
    analyzed_by: user.email,
  });
});