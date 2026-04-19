import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Analyzes a job for risk factors including excessive overrides,
 * missing documentation, inconsistent data, and abnormal pricing patterns.
 * Returns risk level and flags without blocking workflows.
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { job_id } = body;

  if (!job_id) return Response.json({ error: 'job_id required' }, { status: 400 });

  // Load job
  const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id, is_deleted: false });
  if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });
  const job = jobs[0];

  // Verify user belongs to company
  if (user.role !== 'admin') {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: job.company_id, is_deleted: false });
    if (!profiles.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const riskFlags = [];
  let riskScore = 0;

  // Load related data
  const [estimates, photos, scopeItems, readings, observations] = await Promise.all([
    base44.asServiceRole.entities.EstimateDraft.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.Photo.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.ScopeItem.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.MoistureReading.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.Observation.filter({ job_id, is_deleted: false }),
  ]);

  // 1. Check for excessive overrides in estimates
  for (const estimate of estimates) {
    if (estimate.line_items) {
      const overrideCount = estimate.line_items.filter(item => item.override_reason).length;
      const overridePct = (overrideCount / estimate.line_items.length) * 100;
      
      if (overridePct > 30) {
        riskFlags.push({
          category: 'excessive_overrides',
          severity: 'high',
          description: `${overridePct.toFixed(0)}% of line items have manual overrides (${overrideCount}/${estimate.line_items.length})`,
          estimate_id: estimate.id,
        });
        riskScore += 30;
      } else if (overridePct > 15) {
        riskFlags.push({
          category: 'excessive_overrides',
          severity: 'medium',
          description: `${overridePct.toFixed(0)}% of line items have manual overrides`,
          estimate_id: estimate.id,
        });
        riskScore += 15;
      }
    }
  }

  // 2. Check for missing documentation
  const photoCount = photos.length;
  const roomCount = await base44.asServiceRole.entities.Room.filter({ job_id, is_deleted: false }).then(r => r.length);
  const scopeCount = scopeItems.length;
  
  if (roomCount > 0 && photoCount === 0) {
    riskFlags.push({
      category: 'missing_documentation',
      severity: 'high',
      description: `No photos documented for ${roomCount} room(s)`,
    });
    riskScore += 25;
  } else if (roomCount > 0 && photoCount < roomCount * 2) {
    riskFlags.push({
      category: 'missing_documentation',
      severity: 'medium',
      description: `Insufficient photos (${photoCount}) for ${roomCount} room(s)`,
    });
    riskScore += 10;
  }

  if (scopeCount > 0 && estimates.length === 0) {
    riskFlags.push({
      category: 'missing_documentation',
      severity: 'medium',
      description: `${scopeCount} scope items without generated estimate`,
    });
    riskScore += 15;
  }

  // 3. Check for inconsistent data
  const moistureReadings = readings.length;
  const envReadings = await base44.asServiceRole.entities.EnvironmentalReading.filter({ job_id, is_deleted: false }).then(r => r.length);
  
  // Check if rooms have no readings
  const rooms = await base44.asServiceRole.entities.Room.filter({ job_id, is_deleted: false });
  const roomsWithoutReadings = rooms.filter(room => 
    !readings.some(r => r.room_id === room.id) &&
    !observations.some(o => o.room_id === room.id)
  ).length;

  if (roomsWithoutReadings > 0 && rooms.length > 0) {
    const pct = (roomsWithoutReadings / rooms.length) * 100;
    if (pct > 50) {
      riskFlags.push({
        category: 'inconsistent_data',
        severity: 'medium',
        description: `${pct.toFixed(0)}% of rooms have no moisture readings or observations`,
      });
      riskScore += 20;
    }
  }

  // Check for scope items without rooms
  const scopeWithoutRoom = scopeItems.filter(s => !s.room_id).length;
  if (scopeWithoutRoom > 0 && scopeCount > 0) {
    const pct = (scopeWithoutRoom / scopeCount) * 100;
    if (pct > 20) {
      riskFlags.push({
        category: 'inconsistent_data',
        severity: 'low',
        description: `${pct.toFixed(0)}% of scope items not assigned to specific rooms`,
      });
      riskScore += 10;
    }
  }

  // 4. Check for abnormal pricing patterns
  for (const estimate of estimates) {
    if (estimate.line_items) {
      // Check for very high or very low unit costs compared to typical ranges
      const typicalRanges = {
        containment: { min: 0.5, max: 10 },
        demolition: { min: 1, max: 15 },
        drying: { min: 0.5, max: 5 },
        cleaning: { min: 1, max: 10 },
        deodorization: { min: 1, max: 10 },
        hepa: { min: 0.5, max: 5 },
        contents: { min: 10, max: 150 },
        documentation: { min: 50, max: 500 },
      };

      const abnormalItems = estimate.line_items.filter(item => {
        const range = typicalRanges[item.category];
        if (!range) return false;
        return item.unit_cost < range.min || item.unit_cost > range.max * 2;
      });

      if (abnormalItems.length > 0) {
        riskFlags.push({
          category: 'abnormal_pricing',
          severity: 'medium',
          description: `${abnormalItems.length} line items with unit costs outside typical ranges`,
          estimate_id: estimate.id,
          line_item_ids: abnormalItems.map(i => i.scope_item_id),
        });
        riskScore += 15;
      }

      // Check for modifier stacking (very high total modifier)
      if (estimate.modifier_total && estimate.modifier_total > 2.0) {
        riskFlags.push({
          category: 'abnormal_pricing',
          severity: 'high',
          description: `Exceptionally high modifier stacking (×${estimate.modifier_total.toFixed(2)})`,
          estimate_id: estimate.id,
        });
        riskScore += 20;
      }
    }
  }

  // Determine risk level
  let riskLevel = 'low';
  if (riskScore >= 60) riskLevel = 'critical';
  else if (riskScore >= 40) riskLevel = 'high';
  else if (riskScore >= 20) riskLevel = 'medium';

  // Log to AuditLog
  await base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: 'Job',
    entity_id: job.id,
    action: 'risk_analysis',
    actor_email: user.email,
    actor_id: user.id,
    description: `Risk analysis performed on job ${job.job_number || job_id}`,
    metadata: {
      risk_level: riskLevel,
      risk_score: riskScore,
      risk_flags_count: riskFlags.length,
      flags_by_category: {
        excessive_overrides: riskFlags.filter(f => f.category === 'excessive_overrides').length,
        missing_documentation: riskFlags.filter(f => f.category === 'missing_documentation').length,
        inconsistent_data: riskFlags.filter(f => f.category === 'inconsistent_data').length,
        abnormal_pricing: riskFlags.filter(f => f.category === 'abnormal_pricing').length,
      },
    },
  });

  return Response.json({
    job_id,
    risk_level: riskLevel,
    risk_score: riskScore,
    risk_flags: riskFlags,
    analyzed_at: new Date().toISOString(),
    analyzed_by: user.email,
  });
});