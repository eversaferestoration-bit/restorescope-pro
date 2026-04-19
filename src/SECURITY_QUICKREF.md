# Security Quick Reference

## Backend Function Security Template

```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // 1. STRICT AUTHENTICATION
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized', type: 'auth_required' }, { status: 401 });
  }

  // 2. ROLE VALIDATION (if needed)
  const ALLOWED_ROLES = ['admin', 'manager'];
  if (!ALLOWED_ROLES.includes(user.role)) {
    return Response.json({ 
      error: 'Forbidden', 
      message: `Role '${user.role}' insufficient.` 
    }, { status: 403 });
  }

  // 3. INPUT VALIDATION
  const body = await req.json();
  const { job_id } = body;
  if (!job_id) {
    return Response.json({ error: 'job_id required' }, { status: 400 });
  }

  // 4. LOAD ENTITY
  const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id, is_deleted: false });
  if (!jobs.length) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }
  const job = jobs[0];

  // 5. COMPANY ISOLATION
  if (user.role !== 'admin') {
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
      user_id: user.id, 
      company_id: job.company_id, 
      is_deleted: false 
    });
    if (!profiles.length) {
      return Response.json({ 
        error: 'Forbidden', 
        message: 'Access denied: not a member of this company.' 
      }, { status: 403 });
    }
  }

  // 6. BUSINESS LOGIC HERE
  // ...

  // 7. AUDIT LOGGING
  await base44.asServiceRole.entities.AuditLog.create({
    company_id: job.company_id,
    entity_type: 'Job',
    entity_id: job.id,
    action: 'updated',
    actor_email: user.email,
    actor_id: user.id,
    description: 'Job updated',
    metadata: {
      timestamp: new Date().toISOString(),
      user_role: user.role,
      changed_fields: Object.keys(updates),
    },
  });

  return Response.json({ success: true });
});
```

---

## Role Permissions Matrix

| Action | Admin | Manager | Estimator | Technician |
|--------|-------|---------|-----------|------------|
| Create Job | ✅ | ✅ | ✅ | ❌ |
| Update Job | ✅ | ✅ | ✅ (limited) | ✅ (very limited) |
| Generate Estimate | ✅ | ✅ | ✅ | ❌ |
| Approve Estimate | ✅ | ✅ | ❌ | ❌ |
| Lock Estimate | ✅ | ✅ | ❌ | ❌ |
| Generate Scope | ✅ | ✅ | ✅ | ❌ |
| View Risk Analysis | ✅ | ✅ | ❌ | ❌ |
| View Audit Logs | ✅ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| View Unit Costs | ✅ | ✅ | ✅ | ❌ |

---

## Common Security Patterns

### Pattern 1: Manager-Only Action
```javascript
if (user.role !== 'admin' && user.role !== 'manager') {
  return Response.json({ 
    error: 'Forbidden', 
    message: 'Manager approval required.' 
  }, { status: 403 });
}
```

### Pattern 2: Company Isolation
```javascript
if (user.role !== 'admin') {
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
    user_id: user.id, 
    company_id: targetCompanyId, 
    is_deleted: false 
  });
  if (!profiles.length) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
}
```

### Pattern 3: Audit Logging
```javascript
await base44.asServiceRole.entities.AuditLog.create({
  company_id,
  entity_type: 'EstimateDraft',
  entity_id: draftId,
  action: 'approved',
  actor_email: user.email,
  actor_id: user.id,
  description: `Estimate v${version} approved`,
  metadata: {
    timestamp: new Date().toISOString(),
    user_role: user.role,
  },
});
```

### Pattern 4: Pricing Sanitization
```javascript
// In response, hide unit costs from technicians
const canSeePricing = user.role === 'admin' || user.role === 'manager';
const lineItems = data.line_items.map(item => ({
  ...item,
  unit_cost: canSeePricing ? item.unit_cost : undefined,
}));
```

---

## Frontend Security Hooks

### Session Management
```javascript
import { useSecurity } from '@/hooks/useSecurity';

export default function AppLayout() {
  useSecurity(); // Enables session timeout + role integrity
  
  return <div>...</div>;
}
```

### What It Does
- Checks session every 5 minutes
- Warns 15 minutes before expiry
- Auto-logout after 8 hours
- Detects role changes every 2 minutes
- Forces logout if role changed

---

## Error Codes

| Status | Code | Meaning |
|--------|------|---------|
| 400 | `Bad Request` | Invalid input |
| 401 | `Unauthorized` | Not logged in |
| 401 | `Session expired` | Session timeout |
| 403 | `Forbidden` | Insufficient role |
| 403 | `Forbidden` | Cross-company access |
| 404 | `Not Found` | Entity doesn't exist |
| 422 | `Unprocessable` | Invalid state transition |

---

## Security Checklist for New Functions

Before deploying any new backend function:

- [ ] Authentication check (`base44.auth.me()`)
- [ ] Role validation (if needed)
- [ ] Input validation (required fields)
- [ ] Company isolation (verify access)
- [ ] Entity existence check
- [ ] Audit logging (for critical actions)
- [ ] Error messages don't leak info
- [ ] Pricing data sanitized (if applicable)

---

## Testing Security

### Quick Tests

```bash
# 1. Test authentication
curl https://app.base44.com/functions/yourFunction
# Expected: 401 Unauthorized

# 2. Test role validation (as technician)
# Login as technician, call function
# Expected: 403 Forbidden

# 3. Test company isolation
# User from Company A tries to access Company B data
# Expected: 403 Forbidden

# 4. Test audit logging
# Perform action, check AuditLog entity
# Expected: Complete log entry
```

---

## Emergency Procedures

### If Security Breach Detected

1. **Review Audit Logs**
   ```javascript
   // Admin dashboard → Audit Log
   // Filter by suspicious actor or action
   ```

2. **Force Logout All Users**
   - Platform feature (contact support)

3. **Review User Roles**
   - Admin Dashboard → Users
   - Check for unauthorized role changes

4. **Document Incident**
   - Export audit logs
   - Record timeline
   - Identify affected data

---

## Resources

- **Full Documentation**: `SECURITY.md`
- **Implementation Summary**: `SECURITY_SUMMARY.md`
- **Session Hook**: `hooks/useSecurity.js`
- **Audit Logs**: Admin Dashboard → Audit Log