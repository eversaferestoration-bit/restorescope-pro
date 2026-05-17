import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MAX_BATCH_SIZE = 10;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized', type: 'auth_required' }, { status: 401 });
  }

  // Resolve caller company once
  const callerProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
  const callerCompanyId = callerProfiles[0]?.company_id;
  if (!callerCompanyId) {
    return Response.json({ error: 'Forbidden: no company profile found.' }, { status: 403 });
  }

  const body = await req.json();
  const { photo_ids } = body;

  if (!photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
    return Response.json({ error: 'photo_ids array required' }, { status: 400 });
  }

  if (photo_ids.length > MAX_BATCH_SIZE) {
    return Response.json({ error: `Maximum ${MAX_BATCH_SIZE} photos per batch` }, { status: 400 });
  }

  const results = [];
  const errors = [];

  const processingPromises = photo_ids.map(async (photo_id) => {
    try {
      const photos = await base44.asServiceRole.entities.Photo.filter({ id: photo_id, is_deleted: false });

      if (!photos.length) {
        errors.push({ photo_id, error: 'Photo not found' });
        return;
      }

      const photo = photos[0];

      // Strict company isolation — no admin bypass
      if (photo.company_id !== callerCompanyId) {
        errors.push({ photo_id, error: 'Access denied' });
        return;
      }

      if (photo.analysis_status === 'analysis_complete') {
        results.push({ photo_id, status: 'already_analyzed', damage_tags: photo.damage_tags, material_tags: photo.material_tags });
        return;
      }

      const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Analyze this water damage restoration photo. Identify:
1. Damage types (water, fire, mold, structural, contents)
2. Affected materials (drywall, carpet, hardwood, concrete, etc.)
3. Severity level (minor, moderate, severe)
4. Recommended restoration actions
5. Estimated affected square footage

Return as JSON with: damage_tags (array), material_tags (array), severity_score (0-100), recommended_actions (array), estimated_sqft (number)`,
        file_urls: [photo.file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            damage_tags: { type: 'array', items: { type: 'string' } },
            material_tags: { type: 'array', items: { type: 'string' } },
            severity_score: { type: 'number', minimum: 0, maximum: 100 },
            recommended_actions: { type: 'array', items: { type: 'string' } },
            estimated_sqft: { type: 'number' },
          },
          required: ['damage_tags', 'material_tags', 'severity_score'],
        },
      });

      await base44.asServiceRole.entities.Photo.update(photo_id, {
        damage_tags: response.damage_tags || [],
        material_tags: response.material_tags || [],
        severity_score: response.severity_score || 0,
        confidence_score: response.confidence || 0.8,
        analysis_status: 'analysis_complete',
        manual_review_required: response.severity_score > 80 || (response.damage_tags?.length === 0),
      });

      results.push({
        photo_id,
        status: 'analyzed',
        damage_tags: response.damage_tags,
        material_tags: response.material_tags,
        severity_score: response.severity_score,
      });

      await base44.asServiceRole.entities.AuditLog.create({
        company_id: photo.company_id,
        entity_type: 'Photo',
        entity_id: photo_id,
        action: 'batch_ai_analysis',
        actor_email: user.email,
        actor_id: user.id,
        description: 'Photo analyzed via batch processing',
        metadata: { damage_tags_count: response.damage_tags?.length || 0, severity_score: response.severity_score },
      });

    } catch (error) {
      console.error(`[batchAnalyzePhotos] Photo ${photo_id} failed:`, error.message);
      errors.push({ photo_id, error: 'Analysis failed. Please try again.' });
    }
  });

  await Promise.all(processingPromises);

  return Response.json({
    processed: results.length,
    error_count: errors.length,
    results,
    error_details: errors,
    batch_id: crypto.randomUUID(),
    processed_at: new Date().toISOString(),
  });
});