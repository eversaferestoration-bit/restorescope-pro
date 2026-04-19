import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Provides insights on adjuster behavior and negotiation strategies.
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { adjuster_id } = body;

  if (!adjuster_id) {
    return Response.json({ error: 'adjuster_id required' }, { status: 400 });
  }

  try {
    // Fetch adjuster behavior data
    const behaviors = await base44.asServiceRole.entities.AdjusterBehavior.filter({
      adjuster_id,
      is_deleted: false
    });

    if (!behaviors.length) {
      // No historical data - return neutral assessment
      const adjusters = await base44.asServiceRole.entities.Adjuster.filter({
        id: adjuster_id,
        is_deleted: false
      });

      const adjuster = adjusters[0];

      return Response.json({
        adjuster_id,
        adjuster_name: adjuster?.full_name || 'Unknown',
        has_historical_data: false,
        message: 'No historical data available for this adjuster',
        approval_tendencies: {
          approval_rate: null,
          total_interactions: 0,
          assessment: 'unknown',
        },
        negotiation_risk: {
          level: 'unknown',
          avg_reduction_percent: 0,
          factors: [],
        },
        suggested_strategy: {
          approach: 'standard',
          tips: [
            'No historical data available',
            'Use standard documentation practices',
            'Ensure all scope items are well-documented',
          ],
        },
      });
    }

    const behavior = behaviors[0];

    // Analyze approval tendencies
    let approval_assessment = 'neutral';
    if (behavior.approval_rate !== undefined && behavior.approval_rate !== null) {
      if (behavior.approval_rate >= 70) {
        approval_assessment = 'lenient';
      } else if (behavior.approval_rate >= 40) {
        approval_assessment = 'moderate';
      } else {
        approval_assessment = 'strict';
      }
    }

    // Assess negotiation risk
    let risk_level = 'medium';
    const risk_factors = [];

    if (behavior.avg_reduction_percent !== undefined && behavior.avg_reduction_percent !== null) {
      if (behavior.avg_reduction_percent >= 20) {
        risk_level = 'high';
        risk_factors.push(`Typically reduces estimates by ${behavior.avg_reduction_percent.toFixed(1)}%`);
      } else if (behavior.avg_reduction_percent >= 10) {
        risk_level = 'medium';
        risk_factors.push(`Averages ${behavior.avg_reduction_percent.toFixed(1)}% reduction`);
      } else if (behavior.avg_reduction_percent > 0) {
        risk_level = 'low';
        risk_factors.push('Minimal reductions on average');
      }
    }

    if (behavior.approval_rate !== undefined && behavior.approval_rate !== null) {
      if (behavior.approval_rate < 40) {
        risk_level = 'high';
        risk_factors.push(`Low approval rate (${behavior.approval_rate.toFixed(1)}%)`);
      }
    }

    if (behavior.common_rejected_categories?.length > 0) {
      risk_factors.push(`Frequently rejects: ${behavior.common_rejected_categories.slice(0, 3).join(', ')}`);
    }

    if (behavior.avg_response_time_days !== undefined && behavior.avg_response_time_days !== null) {
      if (behavior.avg_response_time_days > 14) {
        risk_factors.push(`Slow responder (${behavior.avg_response_time_days.toFixed(1)} days avg)`);
      }
    }

    // Generate suggested strategy
    let strategy_approach = 'standard';
    const strategy_tips = [];

    if (risk_level === 'high') {
      strategy_approach = 'defensive';
      strategy_tips.push('Over-document all scope items with photos and measurements');
      strategy_tips.push('Include detailed justification for high-cost items');
      strategy_tips.push('Pre-emptively address common rejection categories');
      strategy_tips.push('Consider breaking large items into smaller, justifiable line items');
      
      if (behavior.common_rejected_categories?.includes('deodorization')) {
        strategy_tips.push('Add detailed deodorization logs and justification');
      }
      if (behavior.common_rejected_categories?.includes('contents')) {
        strategy_tips.push('Document all contents with photos and replacement estimates');
      }
    } else if (risk_level === 'medium') {
      strategy_approach = 'balanced';
      strategy_tips.push('Ensure standard documentation levels');
      strategy_tips.push('Be prepared to justify pricing on major categories');
      strategy_tips.push('Respond quickly to information requests');
    } else if (approval_assessment === 'lenient') {
      strategy_approach = 'collaborative';
      strategy_tips.push('Straightforward submission recommended');
      strategy_tips.push('Standard documentation should suffice');
      strategy_tips.push('Quick approval likely with proper documentation');
    }

    if (behavior.avg_response_time_days !== undefined && behavior.avg_response_time_days > 10) {
      strategy_tips.push('Follow up proactively - adjuster tends to be slow to respond');
    }

    // Build notes from behavior
    const auto_notes = [];
    if (behavior.total_interactions >= 5) {
      auto_notes.push(`Based on ${behavior.total_interactions} interactions`);
    }
    if (behavior.approval_rate !== undefined) {
      auto_notes.push(`${behavior.approval_rate.toFixed(1)}% approval rate`);
    }
    if (behavior.avg_reduction_percent && behavior.avg_reduction_percent > 0) {
      auto_notes.push(`${behavior.avg_reduction_percent.toFixed(1)}% avg reduction`);
    }

    return Response.json({
      adjuster_id,
      adjuster_name: behavior.adjuster_name,
      carrier_id: behavior.carrier_id,
      has_historical_data: true,
      approval_tendencies: {
        approval_rate: behavior.approval_rate,
        total_interactions: behavior.total_interactions,
        assessment: approval_assessment,
      },
      negotiation_risk: {
        level: risk_level,
        avg_reduction_percent: behavior.avg_reduction_percent || 0,
        factors: risk_factors,
      },
      suggested_strategy: {
        approach: strategy_approach,
        tips: strategy_tips,
      },
      common_rejected_categories: behavior.common_rejected_categories || [],
      avg_response_time_days: behavior.avg_response_time_days,
      insights_summary: auto_notes.join(' · '),
      last_updated: behavior.last_updated,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});