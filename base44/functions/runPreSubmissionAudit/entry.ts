import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { estimate_version_id } = body;

    if (!estimate_version_id) {
      return Response.json({ error: 'estimate_version_id required' }, { status: 400 });
    }

    const estimates = await base44.asServiceRole.entities.EstimateDraft.filter({
      id: estimate_version_id,
      is_deleted: false,
    });

    if (!estimates.length) {
      return Response.json({ error: 'Estimate not found' }, { status: 404 });
    }

    const estimate = estimates[0];

    // Strict company isolation
    const userProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
    const userCompanyId = userProfiles[0]?.company_id;
    if (!userCompanyId || userCompanyId !== estimate.company_id) {
      return Response.json({ error: 'Forbidden', message: 'Access denied: resource belongs to a different company.' }, { status: 403 });
    }

    const issues = [];
    let passStatus = true;

    const jobDocs = await base44.asServiceRole.entities.Photo.filter({ job_id: estimate.job_id, is_deleted: false });

    if (jobDocs.length === 0) {
      issues.push({
        type: 'documentation',
        severity: 'critical',
        message: 'No photos attached. Submit photos before submitting estimate.',
        requiredFix: 'Upload photos of the property and affected areas',
      });
      passStatus = false;
    }

    const hasJustification = estimate.notes && estimate.notes.length > 20;
    if (!hasJustification) {
      issues.push({
        type: 'justification',
        severity: 'high',
        message: 'Estimate lacks detailed justification or notes.',
        requiredFix: 'Add detailed notes explaining scope and pricing decisions',
      });
    }

    if (estimate.line_items && estimate.line_items.length > 0) {
      let hasZeroCost = false;
      let hasUnreasonablePrice = false;

      for (const item of estimate.line_items) {
        if (item.line_total === 0 || item.unit_cost === 0) hasZeroCost = true;
        if (item.unit_cost && item.unit_cost > 1000 && item.quantity > 0) hasUnreasonablePrice = true;
      }

      if (hasZeroCost) {
        issues.push({ type: 'pricing', severity: 'critical', message: 'One or more line items have zero cost.', requiredFix: 'Review and correct all zero-cost line items' });
        passStatus = false;
      }
      if (hasUnreasonablePrice) {
        issues.push({ type: 'pricing', severity: 'high', message: 'Some unit costs appear unusually high (> $1000).', requiredFix: 'Review and justify high-cost items or adjust pricing' });
      }
    }

    const defenseRecords = await base44.asServiceRole.entities.ClaimDefense.filter({ estimate_version_id, is_deleted: false }, '-created_at', 1);

    if (defenseRecords.length > 0) {
      const defense = defenseRecords[0];
      if (defense.defense_score && defense.defense_score < 50) {
        issues.push({ type: 'risk', severity: 'high', message: `Low defense score (${defense.defense_score}/100). High dispute risk.`, requiredFix: 'Address missing documentation and risk flags before submission' });
      }
      if (defense.carrier_pushback_risk === 'high') {
        issues.push({ type: 'risk', severity: 'high', message: 'Carrier pushback risk assessed as HIGH.', requiredFix: 'Review recommended actions and strengthen documentation' });
      }
      if (defense.risk_flags && defense.risk_flags.length > 0) {
        const criticalFlags = defense.risk_flags.filter(f => f.severity === 'high');
        if (criticalFlags.length > 0) {
          issues.push({ type: 'risk', severity: 'high', message: `${criticalFlags.length} high-severity risk flags identified.`, requiredFix: 'Mitigate identified risk factors before submission' });
        }
      }
    }

    if (!estimate.line_items || estimate.line_items.length === 0) {
      issues.push({ type: 'scope', severity: 'critical', message: 'Estimate has no line items.', requiredFix: 'Add line items to the estimate' });
      passStatus = false;
    }

    const blockSubmission = issues.some(i => i.severity === 'critical');

    return Response.json({
      success: true,
      estimate_id: estimate.id,
      pass: passStatus && !blockSubmission,
      canSubmit: !blockSubmission,
      issueCount: issues.length,
      criticalCount: issues.filter(i => i.severity === 'critical').length,
      issues,
      summary: {
        documentationComplete: jobDocs.length > 0,
        hasJustification,
        pricingValid: !issues.some(i => i.type === 'pricing'),
        riskAssessed: defenseRecords.length > 0,
      },
    });

  } catch (error) {
    console.error('[runPreSubmissionAudit] Error:', error.message);
    return Response.json({ success: false, error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
});