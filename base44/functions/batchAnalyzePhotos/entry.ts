import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Batch processes multiple photos for AI analysis.
 * More efficient than individual calls - processes up to 10 photos in one request.
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // Authentication
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized', type: 'auth_required' }, { status: 401 });
  }

  const body = await req.json();
  const { photo_ids } = body;

  if (!photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
    return Response.json({ error: 'photo_ids array required' }, { status: 400 });
  }

  if (photo_ids.length > 10) {
    return Response.json({ error: 'Maximum 10 photos per batch' }, { status: 400 });
  }

  const results = [];
  const errors = [];

  // Process photos in parallel
  const processingPromises = photo_ids.map(async (photo_id) => {
    try {
      // Load photo
      const photos = await base44.asServiceRole.entities.Photo.filter({ 
        id: photo_id, 
        is_deleted: false 
      });
      
      if (!photos.length) {
        errors.push({ photo_id, error: 'Photo not found' });
        return;
      }
      
      const photo = photos[0];

      // Company isolation
      if (user.role !== 'admin') {
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
          user_id: user.id, 
          company_id: photo.company_id, 
          is_deleted: false 
        });
        if (!profiles.length) {
          errors.push({ photo_id, error: 'Access denied' });
          return;
        }
      }

      // Skip if already analyzed
      if (photo.analysis_status === 'analysis_complete') {
        results.push({ 
          photo_id, 
          status: 'already_analyzed',
          damage_tags: photo.damage_tags,
          material_tags: photo.material_tags,
        });
        return;
      }

      // Analyze photo using InvokeLLM with vision
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this water damage restoration photo. Identify:
1. Damage types (water, fire, mold, structural, contents)
2. Affected materials (drywall, carpet, hardwood, concrete, etc.)
3. Severity level (minor, moderate, severe)
4. Recommended restoration actions
5. Estimated affected square footage

Return as JSON with: damage_tags (array), material_tags (array), severity_score (0-100), recommended_actions (array), estimated_sqft (number)`,
        file_urls: [photo.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            damage_tags: { type: "array", items: { type: "string" } },
            material_tags: { type: "array", items: { type: "string" } },
            severity_score: { type: "number", minimum: 0, maximum: 100 },
            recommended_actions: { type: "array", items: { type: "string" } },
            estimated_sqft: { type: "number" },
          },
          required: ["damage_tags", "material_tags", "severity_score"],
        },
      });

      // Update photo with analysis results
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

      // Log to audit
      await base44.asServiceRole.entities.AuditLog.create({
        company_id: photo.company_id,
        entity_type: 'Photo',
        entity_id: photo_id,
        action: 'batch_ai_analysis',
        actor_email: user.email,
        actor_id: user.id,
        description: `Photo analyzed via batch processing`,
        metadata: {
          damage_tags_count: response.damage_tags?.length || 0,
          severity_score: response.severity_score,
        },
      });

    } catch (error) {
      errors.push({ photo_id, error: error.message });
    }
  });

  await Promise.all(processingPromises);

  return Response.json({
    processed: results.length,
    errors: errors.length,
    results,
    errors: errors,
    batch_id: crypto.randomUUID(),
    processed_at: new Date().toISOString(),
  });
});