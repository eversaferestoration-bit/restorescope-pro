import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

  const body = await req.json();
  const { name, legal_name, email, phone, address_line_1, city, state, zip, country, timezone } = body;

  if (!name) return Response.json({ error: 'Company name is required' }, { status: 400 });

  const company = await base44.asServiceRole.entities.Company.create({
    name, legal_name, email, phone,
    address_line_1, city, state, zip, country, timezone,
    status: 'active',
    created_by: user.email,
    is_deleted: false,
  });

  await base44.asServiceRole.entities.AuditLog.create({
    company_id: company.id,
    entity_type: 'Company',
    entity_id: company.id,
    action: 'created',
    actor_email: user.email,
    actor_id: user.id,
    description: `Company "${company.name}" created`,
    metadata: { name },
  });

  return Response.json({ company });
});