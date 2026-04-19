# Security Hardening Implementation

## Overview
This document outlines the comprehensive security measures implemented across the application to ensure data protection, role-based access control, and audit trail compliance.

## Core Security Features

### 1. Backend-Only Sensitive Operations
All sensitive operations are executed exclusively in backend functions:
- **Estimate generation** - `generateEstimateDraft`
- **Estimate approval workflow** - `approveEstimate`
- **Scope generation** - `generateScope`
- **Supplement analysis** - `generateSupplement`
- **Risk analysis** - `analyzeRisk`
- **Claim defense** - `analyzeClaimDefense`

**Frontend cannot directly access:**
- Pricing profiles and unit costs
- Company subscription data
- Other companies' data
- Audit logs

### 2. Strict Role Validation

#### Role Hierarchy
```
admin (level 4) > manager (level 3) > estimator (level 2) > technician (level 1)
```

#### Role-Based Permissions

**Admin (Full Access)**
- All operations permitted
- Universal company access
- Can approve/lock estimates
- Can view audit logs
- Can manage users and subscriptions

**Manager**
- Can approve/lock estimates
- Can update job status and assignments
- Can generate estimates
- Cannot access admin-only features (user management, audit logs)

**Estimator**
- Can create/update jobs
- Can generate estimates
- Can create scope items
- Cannot approve estimates
- Cannot change job status or assignments

**Technician**
- Read-only access to estimates
- Can add observations, photos, readings
- Cannot generate or modify scope
- Cannot update job details
- Cannot see unit costs (pricing hidden)

### 3. Company Data Isolation

Every backend function enforces company isolation:
```javascript
// Verify user belongs to company
if (user.role !== 'admin') {
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ 
    user_id: user.id, 
    company_id: targetCompanyId, 
    is_deleted: false 
  });
  if (!profiles.length) {
    return Response.json({ error: 'Forbidden', message: 'Access denied' }, { status: 403 });
  }
}
```

**Protection against:**
- Cross-company data access
- IDOR (Insecure Direct Object Reference) attacks
- Unauthorized data manipulation

### 4. Comprehensive Audit Logging

All critical actions are logged with:
- Actor identification (email, user ID, role)
- Timestamp (ISO 8601)
- Entity type and ID
- Action performed
- Metadata (changed fields, previous values, context)

**Logged actions include:**
- Job creation/updates
- Estimate generation/approval/rejection
- Scope item modifications
- Supplement creation
- Risk analysis
- User role changes

### 5. Session Management

#### Session Timeout
- **Duration**: 8 hours
- **Warning**: 15 minutes before expiry
- **Auto-logout**: Immediate on expiry
- **Check interval**: Every 5 minutes

#### Role Integrity
- Detects role changes during active session
- Forces re-authentication if role modified
- Prevents privilege escalation attacks

#### Implementation
```javascript
// In AppLayout.jsx
useSecurity(); // Enables session timeout + role integrity checks

// Frontend hook: hooks/useSecurity.js
- useSessionTimeout() - warns and logs out on expiry
- useRoleIntegrity() - detects role changes
```

### 6. Failed Login Protection

**Rate Limiting**
- Maximum 5 failed attempts
- 15-minute lockout after threshold
- Tracked per user account

**Implementation**
- Monitored via authentication backend
- Automatic lockout enforcement
- Admin notifications on suspicious activity

### 7. Pricing Data Protection

**Sensitive fields hidden from technicians:**
- `unit_cost` - removed from line items
- Pricing profile details - inaccessible
- Modifier values - hidden

**Sanitization**
```javascript
if (user.role !== 'admin' && user.role !== 'manager') {
  line_items = line_items.map(item => ({
    ...item,
    unit_cost: undefined, // Hidden
    line_total: item.line_total // Visible
  }));
}
```

## Security Checklist

### Backend Functions
- [x] All functions require authentication (`base44.auth.me()`)
- [x] Role validation on sensitive operations
- [x] Company isolation checks
- [x] Input validation
- [x] Audit logging for critical actions
- [x] Error messages don't leak sensitive info

### Frontend
- [x] Session timeout monitoring
- [x] Auto-logout on session expiry
- [x] Role change detection
- [x] No direct API calls to sensitive endpoints
- [x] Pricing data sanitized based on role

### Data Protection
- [x] Company isolation enforced
- [x] Cross-company access blocked
- [x] Audit trail complete
- [x] Sensitive fields hidden by role

## Monitoring & Alerts

### Security Events to Monitor
1. **Failed login attempts** - >5 triggers alert
2. **Cross-company access attempts** - logged and flagged
3. **Role changes** - audit logged
4. **Session anomalies** - expired sessions, concurrent sessions
5. **Bulk data access** - unusual query patterns

### Audit Log Queries
```javascript
// View all admin actions
base44.entities.AuditLog.filter({ action: 'approve', actor_role: 'admin' })

// Track estimate rejections
base44.entities.AuditLog.filter({ 
  entity_type: 'EstimateDraft', 
  action: 'reject' 
})

// User activity summary
base44.entities.AuditLog.filter({ 
  actor_email: 'user@company.com' 
}, '-created_date', 50)
```

## Compliance

### Data Protection
- All PII encrypted at rest (platform-managed)
- Audit trails immutable
- Session tokens secure (HTTP-only cookies)

### Access Control
- Principle of least privilege enforced
- Role-based access control (RBAC)
- Separation of duties (technicians vs estimators vs managers)

### Incident Response
- All security events logged
- Admin alerts on suspicious activity
- Forced logout on detected anomalies

## Testing Security

### Manual Testing Scenarios

1. **Role Validation**
   - Login as technician → try to approve estimate → should fail with 403
   - Login as estimator → try to change job status → should fail with 403

2. **Company Isolation**
   - User from Company A → try to access Company B job → should fail with 403

3. **Session Timeout**
   - Wait 8 hours → try to perform action → should get 401 and redirect to login

4. **Role Change**
   - Admin changes user role → user performs action → should get 403 and forced logout

## Future Enhancements

1. **Two-Factor Authentication** - integrate with platform 2FA
2. **IP Whitelisting** - restrict access by IP range
3. **Data Export Controls** - limit bulk data exports
4. **Advanced Threat Detection** - ML-based anomaly detection
5. **Compliance Reporting** - automated SOC 2 reports

## Support

For security issues or questions:
- Review audit logs: Admin Dashboard → Audit Log
- Report vulnerabilities: Contact platform security team
- Update permissions: Admin Dashboard → Users