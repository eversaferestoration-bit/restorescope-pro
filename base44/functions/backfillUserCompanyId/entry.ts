/**
 * Backfill company_id onto base44 User records for existing users who went through
 * signup before the User.company_id field existed.
 *
 * This is needed because {{user_company_id}} in RLS resolves from the User record,
 * not from UserProfile. Without company_id on User, all tenant-scoped reads return empty.
 *
 * Call this once per user on login if their User record is missing company_id.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // If company_id is already set on the User record, nothing to do
  if (user.company_id) {
    return Response.json({ status: 'already_set', company_id: user.company_id });
  }

  // Look up UserProfile for this user
  const profiles = await base44.asServiceRole.entities.UserProfile.filter(
    { user_id: user.id, is_deleted: false }, '-created_date', 1
  );
  const profile = profiles?.[0];

  if (!profile?.company_id) {
    // Try fallback: find company by creator email
    if (user.email) {
      const companies = await base44.asServiceRole.entities.Company.filter(
        { created_by: user.email, is_deleted: false }, '-created_date', 1
      );
      const company = companies?.[0];
      if (company?.id) {
        await base44.auth.updateMe({ company_id: company.id });
        return Response.json({ status: 'backfilled_from_company', company_id: company.id });
      }
    }
    return Response.json({ status: 'no_company_found', user_id: user.id });
  }

  // Stamp company_id onto User record
  await base44.auth.updateMe({ company_id: profile.company_id });

  return Response.json({ status: 'backfilled', company_id: profile.company_id });
});