import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Detects gaps in scope by comparing photos, observations, and existing scope items.
 * Returns missing categories and inconsistencies - does NOT auto-add items.
 */

const CATEGORY_KEYWORDS = {
  containment: ['containment', 'barrier', 'poly', 'plastic', 'isolation', 'seal'],
  demolition: ['remove', 'demolish', 'tear out', 'strip', 'cut out', 'dispose'],
  drying: ['dry', 'dehumid', 'air mover', 'fan', 'equipment', 'monitor'],
  cleaning: ['clean', 'sanitize', 'disinfect', 'wash', 'wipe'],
  deodorization: ['deodor', 'odor', 'fog', 'seal', 'prime'],
  hepa: ['hepa', 'air scrub', 'scrubber', 'filter', 'negative air'],
  contents: ['content', 'personal', 'furniture', 'move', 'reset', 'manipulation'],
  documentation: ['photo', 'document', 'moisture map', 'log', 'report'],
};

const DAMAGE_TO_SCOPE = {
  mold: ['containment', 'hepa', 'deodorization', 'demolition'],
  water: ['drying', 'demolition', 'cleaning', 'deodorization'],
  smoke: ['deodorization', 'cleaning', 'demolition', 'hepa'],
  fire: ['demolition', 'deodorization', 'cleaning', 'contents'],
};

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

  // Verify access
  if (user.role !== 'admin') {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, company_id: job.company_id, is_deleted: false });
    if (!profiles.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Load all evidence
  const [photos, observations, scopeItems, rooms] = await Promise.all([
    base44.asServiceRole.entities.Photo.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.Observation.filter({ job_id, is_deleted: false }),
    base44.asServiceRole.entities.ScopeItem.filter({ job_id, is_deleted: false, status: 'confirmed' }),
    base44.asServiceRole.entities.Room.filter({ job_id, is_deleted: false }),
  ]);

  const gaps = [];
  const inconsistencies = [];
  const recommendations = [];

  // 1. Check for missing scope categories based on damage type
  const existingCategories = [...new Set(scopeItems.map(s => s.category))];
  const damageType = job.loss_type?.toLowerCase();
  
  if (damageType && DAMAGE_TO_SCOPE[damageType]) {
    const recommendedCategories = DAMAGE_TO_SCOPE[damageType];
    for (const cat of recommendedCategories) {
      if (!existingCategories.includes(cat)) {
        gaps.push({
          type: 'missing_category',
          category: cat,
          severity: 'high',
          reason: `${damageType.charAt(0).toUpperCase() + damageType.slice(1)} damage typically requires ${cat} scope`,
        });
      }
    }
  }

  // 2. Analyze photo captions/tags for missing scope
  const photoText = photos.map(p => [p.caption, ...(p.damage_tags || []), ...(p.material_tags || [])].join(' ').toLowerCase()).join(' ');
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const hasKeywords = keywords.some(kw => photoText.includes(kw));
    const hasScope = existingCategories.includes(category);
    
    if (hasKeywords && !hasScope) {
      gaps.push({
        type: 'photo_evidence',
        category,
        severity: 'medium',
        reason: 'Photos indicate work not captured in scope',
        photo_count: photos.filter(p => {
          const text = [p.caption, ...(p.damage_tags || []), ...(p.material_tags || [])].join(' ').toLowerCase();
          return keywords.some(kw => text.includes(kw));
        }).length,
      });
    }
  }

  // 3. Check observations for unaddressed issues
  for (const obs of observations) {
    const obsText = obs.description.toLowerCase();
    const obsType = obs.observation_type?.toLowerCase() || '';
    
    // Map observations to required scope
    if (obsType.includes('mold') || obsText.includes('mold')) {
      if (!existingCategories.includes('containment') || !existingCategories.includes('hepa')) {
        inconsistencies.push({
          type: 'observation_unaddressed',
          observation: obs.description,
          missing_scope: ['containment', 'hepa'].filter(c => !existingCategories.includes(c)),
          severity: 'high',
        });
      }
    }
    
    if (obsText.includes('odor') || obsType.includes('odor')) {
      if (!existingCategories.includes('deodorization')) {
        inconsistencies.push({
          type: 'observation_unaddressed',
          observation: obs.description,
          missing_scope: ['deodorization'],
          severity: 'medium',
        });
      }
    }
    
    if (obsText.includes('structural') || obsText.includes('damage')) {
      if (!existingCategories.includes('demolition')) {
        inconsistencies.push({
          type: 'observation_unaddressed',
          observation: obs.description,
          missing_scope: ['demolition'],
          severity: 'high',
        });
      }
    }
  }

  // 4. Check room coverage
  const roomsWithScope = [...new Set(scopeItems.map(s => s.room_id).filter(Boolean))];
  const roomsWithoutScope = rooms.filter(r => !roomsWithScope.includes(r.id) && r.status !== 'dry');
  
  if (roomsWithoutScope.length > 0) {
    gaps.push({
      type: 'room_coverage',
      rooms: roomsWithoutScope.map(r => r.name),
      severity: 'medium',
      reason: `${roomsWithoutScope.length} room(s) have no confirmed scope items`,
    });
  }

  // 5. Generate recommendations
  for (const gap of gaps) {
    if (gap.type === 'missing_category') {
      recommendations.push({
        priority: 'high',
        action: `Add ${gap.category} line items`,
        rationale: gap.reason,
      });
    } else if (gap.type === 'photo_evidence') {
      recommendations.push({
        priority: 'medium',
        action: `Review photos and add ${gap.category} scope`,
        rationale: `${gap.photo_count} photo(s) show ${gap.category} work`,
      });
    } else if (gap.type === 'room_coverage') {
      recommendations.push({
        priority: 'medium',
        action: 'Add scope items for uncovered rooms',
        rationale: gap.reason,
      });
    }
  }

  for (const inc of inconsistencies) {
    recommendations.push({
      priority: inc.severity === 'high' ? 'critical' : 'high',
      action: `Address observation: ${inc.observation}`,
      rationale: `Missing scope: ${inc.missing_scope.join(', ')}`,
    });
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => severityOrder[a.priority] - severityOrder[b.priority]);

  return Response.json({
    job_id,
    analysis_summary: {
      total_gaps: gaps.length,
      total_inconsistencies: inconsistencies.length,
      total_recommendations: recommendations.length,
      high_priority_count: recommendations.filter(r => ['critical', 'high'].includes(r.priority)).length,
    },
    gaps,
    inconsistencies,
    recommendations,
    message: gaps.length === 0 && inconsistencies.length === 0 
      ? 'No scope gaps detected. Scope appears comprehensive.'
      : `Detected ${gaps.length} gaps and ${inconsistencies.length} inconsistencies.`,
  });
});