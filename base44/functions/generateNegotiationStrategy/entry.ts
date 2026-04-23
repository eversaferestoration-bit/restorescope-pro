import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Generates a negotiation strategy for an estimate based on:
 * - Estimate line items and pricing
 * - Adjuster historical behavior
 * - Carrier feedback (if provided)
 * - Market benchmarks
 * - Claim defense analysis
 * 
 * Returns actionable negotiation approach with specific items to defend/concede.
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Authentication - manager/admin only
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized', type: 'auth_required' }, { status: 401 });
  }

  if (user.role !== 'admin' && user.role !== 'manager') {
    return Response.json({ error: 'Forbidden', message: 'Manager or admin access required.' }, { status: 403 });
  }

  const body = await req.json();
  const { estimate_version_id, adjuster_id, carrier_feedback } = body;

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

  // Company isolation — enforce regardless of role (admin is NOT cross-tenant)
  const userProfiles = await base44.asServiceRole.entities.UserProfile.filter({
    user_id: user.id, is_deleted: false,
  });
  const userCompanyId = userProfiles[0]?.company_id;
  if (!userCompanyId || userCompanyId !== estimate.company_id) {
    return Response.json({ error: 'Forbidden', message: 'Access denied: resource belongs to a different company.' }, { status: 403 });
  }

  // Load job and related data
  const jobs = await base44.asServiceRole.entities.Job.filter({ 
    id: estimate.job_id, 
    is_deleted: false 
  });
  if (!jobs.length) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }
  const job = jobs[0];

  // Load adjuster behavior if adjuster_id provided
  let adjusterBehavior = null;
  if (adjuster_id) {
    const behaviors = await base44.asServiceRole.entities.AdjusterBehavior.filter({ 
      adjuster_id, 
      is_deleted: false 
    });
    adjusterBehavior = behaviors[0] || null;
  }

  // Load claim defense analysis if available
  const defenses = await base44.asServiceRole.entities.ClaimDefense.filter({ 
    estimate_version_id, 
    is_deleted: false 
  });
  const defense = defenses[0] || null;

  // Load photos for documentation strength assessment
  const photos = await base44.asServiceRole.entities.Photo.filter({ 
    job_id: estimate.job_id, 
    is_deleted: false 
  });

  // Analyze line items for negotiation strategy
  const lineItems = estimate.line_items || [];
  
  // Categorize items by defensibility
  const itemAnalysis = lineItems.map((item, idx) => {
    const hasPhotos = photos.length > 0;
    const isHighCost = item.line_total > 500;
    const isCommonlyRejected = ['deodorization', 'contents', 'hepa', 'documentation'].includes(item.category);
    const hasDocumentation = hasPhotos && item.quantity > 0;
    
    let defensibility = 'strong';
    let priority = 'defend';
    let reasoning = [];

    // Low defensibility indicators
    if (!hasDocumentation && isHighCost) {
      defensibility = 'weak';
      priority = 'concede';
      reasoning.push('High-cost item with limited documentation');
    } else if (isCommonlyRejected && !hasDocumentation) {
      defensibility = 'moderate';
      priority = 'negotiate';
      reasoning.push('Commonly contested category, additional documentation recommended');
    } else if (isHighCost && hasDocumentation) {
      defensibility = 'strong';
      priority = 'defend';
      reasoning.push('Well-documented high-cost item');
    } else if (item.line_total < 200) {
      defensibility = 'strong';
      priority = 'defend';
      reasoning.push('Low-cost item, minimal negotiation impact');
    } else {
      defensibility = 'moderate';
      priority = 'negotiate';
      reasoning.push('Standard item with moderate documentation');
    }

    return {
      line_item_id: item.scope_item_id || idx,
      category: item.category,
      description: item.description,
      line_total: item.line_total,
      defensibility,
      priority,
      reasoning,
      suggested_action: getSuggestedAction(priority, item, carrier_feedback),
    };
  });

  // Calculate overall strategy
  const totalValue = lineItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
  const defendItems = itemAnalysis.filter(i => i.priority === 'defend');
  const concedeItems = itemAnalysis.filter(i => i.priority === 'concede');
  const negotiateItems = itemAnalysis.filter(i => i.priority === 'negotiate');

  const defendValue = defendItems.reduce((sum, i) => sum + i.line_total, 0);
  const concedeValue = concedeItems.reduce((sum, i) => sum + i.line_total, 0);
  const negotiateValue = negotiateItems.reduce((sum, i) => sum + i.line_total, 0);

  // Determine negotiation approach based on adjuster behavior
  let approach = 'balanced';
  let approachReasoning = [];

  if (adjusterBehavior) {
    if (adjusterBehavior.approval_rate < 40 || adjusterBehavior.avg_reduction_percent > 20) {
      approach = 'defensive';
      approachReasoning.push('Adjuster has strict approval history');
      approachReasoning.push('Over-documentation recommended');
    } else if (adjusterBehavior.approval_rate > 70 && adjusterBehavior.avg_reduction_percent < 10) {
      approach = 'collaborative';
      approachReasoning.push('Adjuster has lenient approval history');
      approachReasoning.push('Straightforward submission likely to succeed');
    } else {
      approach = 'balanced';
      approachReasoning.push('Adjuster has moderate approval patterns');
      approachReasoning.push('Standard documentation with selective defense');
    }
  } else {
    approach = 'standard';
    approachReasoning.push('No historical data available for this adjuster');
    approachReasoning.push('Use standard documentation practices');
  }

  // Incorporate carrier feedback if provided
  if (carrier_feedback) {
    const feedbackLower = carrier_feedback.toLowerCase();
    
    if (feedbackLower.includes('overpriced') || feedbackLower.includes('excessive')) {
      approachReasoning.push('Carrier indicates pricing concerns - prepare detailed cost breakdowns');
      // Mark high-cost items for stronger defense
      itemAnalysis.forEach(item => {
        if (item.line_total > 500 && item.defensibility !== 'weak') {
          item.defensibility = 'moderate';
          item.reasoning.push('Flagged by carrier for pricing review');
        }
      });
    }
    
    if (feedbackLower.includes('documentation') || feedbackLower.includes('support')) {
      approachReasoning.push('Carrier requests additional documentation - prioritize photo evidence');
    }
    
    if (feedbackLower.includes('approved') || feedbackLower.includes('reasonable')) {
      approachReasoning.push('Carrier feedback is positive - maintain current position');
      approach = 'collaborative';
    }
  }

  // Incorporate defense analysis if available
  if (defense) {
    if (defense.carrier_pushback_risk === 'high') {
      approachReasoning.push('High carrier pushback risk identified - strengthen documentation');
      if (approach !== 'defensive') {
        approach = 'defensive';
      }
    }
    
    defense.risk_flags?.forEach(flag => {
      if (flag.severity === 'high') {
        approachReasoning.push(`Address ${flag.category} concerns before submission`);
      }
    });
  }

  // Generate suggested response wording
  const responseWording = generateResponseWording({
    approach,
    defendItems,
    negotiateItems,
    concedeItems,
    carrier_feedback,
    totalValue,
    defendValue,
  });

  // Calculate negotiation metrics
  const maxConcessionValue = concedeValue * 0.7; // Willing to concede 70% of weak items
  const targetSettlementValue = totalValue - (concedeValue * 0.5) - (negotiateValue * 0.15);
  const walkAwayValue = totalValue * 0.7; // Don't accept less than 70% of total

  // Log to audit
  await base44.asServiceRole.entities.AuditLog.create({
    company_id: estimate.company_id,
    entity_type: 'EstimateDraft',
    entity_id: estimate.id,
    action: 'negotiation_strategy_generated',
    actor_email: user.email,
    actor_id: user.id,
    description: `Negotiation strategy generated for estimate ${estimate.label || estimate.id}`,
    metadata: {
      approach,
      total_value: totalValue,
      defend_value: defendValue,
      concede_value: concedeValue,
      negotiate_value: negotiateValue,
      adjuster_id,
    },
  });

  return Response.json({
    estimate_version_id,
    strategy: {
      approach,
      approach_reasoning: approachReasoning,
      summary: `${approach.charAt(0).toUpperCase() + approach.slice(1)} negotiation strategy for $${totalValue.toLocaleString()} estimate`,
    },
    item_analysis: itemAnalysis,
    priorities: {
      defend: {
        items: defendItems,
        count: defendItems.length,
        total_value: defendValue,
        percentage: (defendValue / totalValue * 100).toFixed(1),
      },
      negotiate: {
        items: negotiateItems,
        count: negotiateItems.length,
        total_value: negotiateValue,
        percentage: (negotiateValue / totalValue * 100).toFixed(1),
      },
      concede: {
        items: concedeItems,
        count: concedeItems.length,
        total_value: concedeValue,
        percentage: (concedeValue / totalValue * 100).toFixed(1),
      },
    },
    negotiation_metrics: {
      total_estimate_value: totalValue,
      max_concession_value: maxConcessionValue,
      target_settlement_value: targetSettlementValue,
      walk_away_value: walkAwayValue,
      negotiation_range: {
        min: walkAwayValue,
        max: totalValue,
        target: targetSettlementValue,
      },
    },
    suggested_response_wording: responseWording,
    adjuster_insights: adjusterBehavior ? {
      approval_rate: adjusterBehavior.approval_rate,
      avg_reduction: adjusterBehavior.avg_reduction_percent,
      common_rejections: adjusterBehavior.common_rejected_categories,
    } : null,
    generated_at: new Date().toISOString(),
    generated_by: user.email,
  });
});

function getSuggestedAction(priority, item, carrier_feedback) {
  const actions = {
    defend: [
      'Maintain current pricing with full documentation',
      'Provide detailed cost breakdown if challenged',
      'Reference industry standards and pricing guides',
    ],
    negotiate: [
      'Be prepared to justify pricing with photos and measurements',
      'Consider minor adjustments (5-10%) if requested',
      'Offer alternative solutions if item is contested',
    ],
    concede: [
      'Consider removing or reducing this item proactively',
      'Accept reduction if carrier challenges',
      'Focus negotiation capital on higher-priority items',
    ],
  };

  return actions[priority] || actions.defend;
}

function generateResponseWording({ approach, defendItems, negotiateItems, concedeItems, carrier_feedback, totalValue, defendValue }) {
  const templates = {
    defensive: {
      opening: `Thank you for reviewing our estimate of $${totalValue.toLocaleString()}. This scope has been thoroughly documented and reflects industry-standard pricing for the required restoration work.`,
      defense: `We stand behind the following critical items which are fully supported by photographic evidence and measurements: ${defendItems.slice(0, 3).map(i => `${i.description} ($${i.line_total.toLocaleString()})`).join(', ')}. These items are essential for proper restoration and cannot be reduced without compromising work quality.`,
      flexibility: `We are open to discussing the items marked for negotiation and can provide additional documentation as needed.`,
      closing: 'Our goal is to ensure complete restoration while maintaining fair pricing. We welcome the opportunity to address any specific concerns with detailed supporting documentation.',
    },
    balanced: {
      opening: `We appreciate your review of our $${totalValue.toLocaleString()} estimate. This scope reflects the necessary work to restore the property to pre-loss condition.`,
      defense: `The following items represent critical restoration work: ${defendItems.slice(0, 3).map(i => i.description).join(', ')}. These are based on industry standards and fully documented.`,
      flexibility: `We are willing to discuss alternative approaches for items totaling $${negotiateItems.reduce((s, i) => s + i.line_total, 0).toLocaleString()} and can provide additional justification where needed.`,
      closing: 'We believe this estimate is fair and reasonable. Please let us know if you have specific concerns we can address with additional documentation.',
    },
    collaborative: {
      opening: `Thank you for your prompt review of our $${totalValue.toLocaleString()} estimate. We've worked to ensure all items are necessary and appropriately priced.`,
      defense: `Key items include: ${defendItems.slice(0, 3).map(i => i.description).join(', ')}. All work follows IICRC standards and current pricing guidelines.`,
      flexibility: `We're open to your feedback and can discuss any items you have questions about.`,
      closing: 'We look forward to your approval and beginning the restoration process promptly.',
    },
    standard: {
      opening: `Our estimate of $${totalValue.toLocaleString()} covers all necessary restoration work as documented in the attached scope.`,
      defense: `All line items are based on industry standards and supported by field documentation.`,
      flexibility: `We welcome any questions and can provide additional details as needed.`,
      closing: 'Please review and let us know if you require any clarification.',
    },
  };

  const template = templates[approach] || templates.standard;
  
  // Incorporate carrier feedback if provided
  if (carrier_feedback) {
    template.opening += ` We note your feedback regarding "${carrier_feedback}" and have addressed these concerns in our documentation.`;
  }

  return template;
}