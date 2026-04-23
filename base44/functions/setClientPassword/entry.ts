/**
 * setClientPassword — Admin-only endpoint to set or reset a client portal password.
 * Also used for migrating existing insured records to have portal credentials.
 *
 * POST body: { insured_id: string, password: string }
 * Requires: authenticated admin or manager user belonging to same company as insured.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import bcrypt from 'npm:bcryptjs@2.4.3';

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'manager') {
      return Response.json({ error: 'Forbidden: admin or manager required' }, { status: 403 });
    }

    const { insured_id, password } = await req.json();
    if (!insured_id || !password) {
      return Response.json({ error: 'insured_id and password are required' }, { status: 400 });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return Response.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 422 });
    }

    // Verify insured belongs to caller's company
    const userProfiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });
    const callerCompanyId = userProfiles[0]?.company_id;
    if (!callerCompanyId) {
      return Response.json({ error: 'Forbidden: no company association found' }, { status: 403 });
    }

    const insureds = await base44.asServiceRole.entities.Insured.filter({ id: insured_id, is_deleted: false });
    if (!insureds.length) {
      return Response.json({ error: 'Insured not found' }, { status: 404 });
    }

    const insured = insureds[0];
    if (insured.company_id !== callerCompanyId && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: insured belongs to a different company' }, { status: 403 });
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await base44.asServiceRole.entities.Insured.update(insured_id, {
      password_hash,
      portal_login_attempts: 0,
      portal_locked_until: null,
    });

    await base44.asServiceRole.entities.AuditLog.create({
      company_id: insured.company_id,
      entity_type: 'Insured',
      entity_id: insured_id,
      action: 'portal_password_set',
      actor_email: user.email,
      actor_id: user.id,
      description: `Client portal password set for ${insured.full_name} (${insured.email})`,
      metadata: { timestamp: new Date().toISOString() },
    });

    console.log(`[setClientPassword] Password set for insured ${insured_id} by ${user.email}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[setClientPassword] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});