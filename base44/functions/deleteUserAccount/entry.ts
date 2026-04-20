import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_id } = await req.json();

    // Only allow users to delete their own account
    if (user.id !== user_id) {
      return Response.json({ error: 'Cannot delete another user account' }, { status: 403 });
    }

    // Soft-delete user profile
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id, is_deleted: false });
    for (const profile of profiles) {
      await base44.asServiceRole.entities.UserProfile.update(profile.id, { is_deleted: true });
    }

    // Soft-delete all user's created records (jobs, photos, estimates, etc.)
    const entities = ['Job', 'Photo', 'EstimateDraft', 'Room', 'ScopeItem', 'Observation', 'AuditLog'];
    for (const entity of entities) {
      try {
        const records = await base44.asServiceRole.entities[entity].filter({ created_by: user.email, is_deleted: false }, '', 1000);
        for (const record of records) {
          await base44.asServiceRole.entities[entity].update(record.id, { is_deleted: true });
        }
      } catch {
        // Entity may not exist or have created_by field — continue
      }
    }

    return Response.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});