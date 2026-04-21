import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Get Carrier Strategy Recommendations
 * Input: carrier_name
 * Output: documentation emphasis, risk areas, strategy suggestions
 * Access: Owner_Admin and Manager only
 */

const FORBIDDEN = Response.json(
  { success: false, message: 'Forbidden', code: 'FORBIDDEN' },
  { status: 403 }
);

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Role check — read from auth context, never trust client-supplied values
  const allowedRoles = ['admin', 'manager'];
  if (!allowedRoles.includes(user.role)) {
    // Log denied attempt via service role
    base44.asServiceRole.entities.AuditLog.create({
      company_id: user.company_id || '',
      entity_type: 'function',
      entity_id: 'getCarrierStrategy',
      action: 'forbidden',
      actor_email: user.email,
      actor_id: user.id,
      description: `Forbidden access attempt to getCarrierStrategy by role: ${user.role}`,
    }).catch(() => {});
    return FORBIDDEN;
  }

  try {
    const body = await req.json();
    const { carrier_name } = body;

    if (!carrier_name) {
      return Response.json({ error: 'carrier_name required' }, { status: 400 });
    }

    // Get carrier profile
    const profiles = await base44.asServiceRole.entities.CarrierProfile.filter({
      carrier_name,
      is_deleted: false,
    });

    if (!profiles.length) {
      return Response.json({
        success: true,
        carrier_name,
        has_profile: false,
        message: 'No carrier profile available. Run updateCarrierProfile first.',
        recommendations: {
          documentation_emphasis: [
            'Comprehensive moisture logs',
            'High-resolution photos with timestamps',
            'Detailed scope narratives',
            'Pre and post-loss documentation',
          ],
          risk_areas: [
            'Incomplete documentation',
            'Missing line item justification',
            'Insufficient photographic evidence',
          ],
          strategy_suggestions: [
            'Submit complete documentation upfront',
            'Use industry-standard pricing databases',
            'Include detailed narratives for all categories',
            'Respond promptly to any requests for information',
          ],
        },
      });
    }

    const profile = profiles[0];

    const recommendations = {
      documentation_emphasis: [],
      risk_areas: [],
      strategy_suggestions: [],
    };

    if (profile.preferred_documentation?.length > 0) {
      const docMapping = {
        'moisture_logs': 'Daily moisture logs with clear readings',
        'photos': 'Comprehensive photo documentation with timestamps',
        'invoices': 'Itemized invoices with line-item details',
        'reports': 'Detailed technical reports with findings',
        'diagrams': 'Floor plans and moisture mapping diagrams',
      };
      profile.preferred_documentation.forEach(doc => {
        if (docMapping[doc]) recommendations.documentation_emphasis.push(docMapping[doc]);
      });
    } else {
      recommendations.documentation_emphasis = [
        'Complete moisture logs',
        'Timestamped photos',
        'Detailed scope documentation',
      ];
    }

    if (profile.common_disputes?.length > 0) {
      const disputeMapping = {
        'documentation': 'Incomplete or missing documentation',
        'pricing': 'Pricing above carrier-accepted standards',
        'scope': 'Scope items deemed unnecessary',
        'photography': 'Insufficient photographic evidence',
        'necessity': 'Questioned necessity of procedures',
      };
      profile.common_disputes.forEach(dispute => {
        if (disputeMapping[dispute]) recommendations.risk_areas.push(disputeMapping[dispute]);
      });
    } else {
      recommendations.risk_areas = [
        'Standard documentation gaps',
        'Pricing justification',
      ];
    }

    const { avg_approval_rate, avg_reduction_percent, response_behavior, dispute_rate } = profile;

    if (avg_approval_rate < 50) {
      recommendations.strategy_suggestions.push(
        'Low approval rate - consider pre-submission review',
        'Request clarification on rejection patterns',
        'Build relationship with assigned adjusters',
      );
    } else if (avg_approval_rate >= 50 && avg_approval_rate < 75) {
      recommendations.strategy_suggestions.push(
        'Moderate approval rate - focus on documentation quality',
        'Address common dispute categories proactively',
      );
    } else {
      recommendations.strategy_suggestions.push(
        'High approval rate - maintain current practices',
        'Continue thorough documentation standards',
      );
    }

    if (avg_reduction_percent > 15) {
      recommendations.strategy_suggestions.push(
        `High reduction rate (${avg_reduction_percent.toFixed(1)}%) - strengthen pricing justification`,
        'Use carrier-accepted pricing databases',
        'Provide detailed line-item breakdowns',
      );
    } else if (avg_reduction_percent > 5) {
      recommendations.strategy_suggestions.push('Moderate reductions - review pricing on disputed categories');
    } else {
      recommendations.strategy_suggestions.push('Low reduction rate - pricing well-accepted');
    }

    if (response_behavior === 'slow') {
      recommendations.strategy_suggestions.push(
        'Slow responder - submit early and follow up proactively',
        'Build in buffer time for approval timelines',
      );
    } else if (response_behavior === 'fast') {
      recommendations.strategy_suggestions.push('Fast responder - leverage quick turnaround for supplements');
    }

    if (dispute_rate > 30) {
      recommendations.strategy_suggestions.push(
        'High dispute rate - request carrier feedback on submissions',
        'Review and address common rejection patterns',
      );
    }

    let difficulty_level = 'moderate';
    let difficulty_score = 50;
    if (avg_approval_rate < 50 || dispute_rate > 40 || avg_reduction_percent > 20) {
      difficulty_level = 'challenging';
      difficulty_score = 75;
    } else if (avg_approval_rate >= 75 && dispute_rate < 20 && avg_reduction_percent < 10) {
      difficulty_level = 'favorable';
      difficulty_score = 25;
    }

    return Response.json({
      success: true,
      has_profile: true,
      carrier_name,
      profile_summary: {
        avg_approval_rate: profile.avg_approval_rate,
        avg_reduction_percent: profile.avg_reduction_percent,
        response_behavior: profile.response_behavior,
        dispute_rate: profile.dispute_rate,
        total_interactions: profile.total_interactions,
        last_updated: profile.last_updated,
      },
      difficulty_level,
      difficulty_score,
      recommendations,
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});