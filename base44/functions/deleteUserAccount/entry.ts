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

    // 1. Soft-delete only the UserProfile record for this user.
    //    Company, Job, Photo, EstimateDraft, and all other company-owned records
    //    are intentionally preserved — they belong to the company, not the user.
    const profiles = await base44.asServiceRole.entities.UserProfile.filter(
      { user_id, is_deleted: false }
    );

    for (const profile of profiles) {
      await base44.asServiceRole.entities.UserProfile.update(profile.id, {
        is_deleted: true,
        status: 'deactivated',
      });
    }

    // 2. If this user was the sole creator of a Company, mark the company as
    //    having no active owner — but do NOT delete it or any of its records.
    //    An admin can reassign ownership manually if needed.
    const ownedCompanies = await base44.asServiceRole.entities.Company.filter(
      { created_by: user.email, is_deleted: false }
    );

    for (const company of ownedCompanies) {
      // Only flag, never delete. Records remain fully intact.
      await base44.asServiceRole.entities.Company.update(company.id, {
        status: 'owner_deactivated',
      });
    }

    return Response.json({ success: true, message: 'Account deactivated successfully. Company data preserved.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});