import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * POST /api/enterprise/set-location-pricing
 * Set custom pricing profile for a location
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const { location_id, pricing_profile_id } = body;

  if (!location_id || !pricing_profile_id) {
    return Response.json({ error: 'location_id and pricing_profile_id required' }, { status: 400 });
  }

  // Get user's company
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({
    user_id: user.id,
    is_deleted: false,
  });

  if (!profiles.length) {
    return Response.json({ error: 'User profile not found' }, { status: 404 });
  }

  const company_id = profiles[0].company_id;

  // Verify location exists and belongs to company
  const locations = await base44.asServiceRole.entities.CompanyLocation.filter({
    id: location_id,
    company_id,
    is_deleted: false,
  });

  if (!locations.length) {
    return Response.json({ error: 'Location not found' }, { status: 404 });
  }

  // Verify pricing profile exists
  const pricingProfiles = await base44.asServiceRole.entities.PricingProfile.filter({
    id: pricing_profile_id,
    company_id,
    is_deleted: false,
  });

  if (!pricingProfiles.length) {
    return Response.json({ error: 'Pricing profile not found' }, { status: 404 });
  }

  // Update location with pricing profile
  await base44.asServiceRole.entities.CompanyLocation.update(location_id, {
    pricing_profile_id,
  });

  // Log to audit
  await base44.asServiceRole.entities.AuditLog.create({
    company_id,
    entity_type: 'CompanyLocation',
    entity_id: location_id,
    action: 'pricing_profile_updated',
    actor_email: user.email,
    actor_id: user.id,
    description: `Location pricing updated to profile ${pricing_profile_id}`,
    metadata: {
      location_id,
      pricing_profile_id,
      location_name: locations[0].location_name,
    },
  });

  return Response.json({
    success: true,
    message: 'Location pricing profile updated successfully',
    data: {
      location_id,
      pricing_profile_id,
    },
  });
});