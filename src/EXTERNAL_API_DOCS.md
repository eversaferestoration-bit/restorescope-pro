# External API Layer

## Overview
Secure REST API layer for third-party integrations with API key authentication, rate limiting, and comprehensive audit logging.

---

## 🔐 Security Features

### 1. API Key Authentication
- **Per-company API keys** with unique identifiers
- **Bearer token** authentication via `Authorization` header
- **Role-based permissions** configurable per key
- **IP whitelisting** for enhanced security
- **Expiration dates** for temporary access

### 2. Rate Limiting
- **Default**: 100 requests/hour per API key
- **Configurable**: Override per key via `rate_limit_override`
- **Headers**: Returns `X-RateLimit-Remaining` and `X-RateLimit-Reset`
- **Enforcement**: Automatic 429 responses when exceeded

### 3. Audit Logging
- **All requests logged**: Success, failures, rate limits
- **Metadata captured**: IP, user agent, endpoint, status code
- **Company isolation**: Logs scoped to company_id
- **Immutable**: Audit logs cannot be deleted

### 4. Role Permissions
- **Granular access**: Configure which roles each API key can access
- **Default**: ['admin', 'manager']
- **Customizable**: Per-key basis

---

## 📚 API Endpoints

### Authentication & Key Management

#### POST `/api/auth/generate-key`
Generate a new API key for the company.

**Access**: Admin/Manager only

**Request**:
```json
{
  "name": "Integration - ABC Restoration",
  "description": "API key for ABC Restoration integration",
  "expires_at": "2026-12-31T23:59:59Z",
  "allowed_ips": ["192.168.1.1", "10.0.0.1"],
  "role_permissions": ["admin", "manager"],
  "rate_limit_override": 200
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "key_123",
    "name": "Integration - ABC Restoration",
    "key": "sk_a1b2c3d4e5f6...",
    "created_at": "2026-04-19T10:00:00Z",
    "expires_at": "2026-12-31T23:59:59Z",
    "allowed_ips": ["192.168.1.1"],
    "role_permissions": ["admin", "manager"]
  },
  "warning": "Save this API key securely. It will not be shown again."
}
```

---

#### GET `/api/keys`
List all API keys for the company (keys are masked for security).

**Access**: Admin only

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "key_123",
      "name": "Integration - ABC Restoration",
      "description": "API key for ABC Restoration integration",
      "is_active": true,
      "created_at": "2026-04-19T10:00:00Z",
      "last_used_at": "2026-04-19T15:30:00Z",
      "key_preview": "sk_a1b2...",
      "allowed_ips": ["192.168.1.1"],
      "role_permissions": ["admin", "manager"]
    }
  ],
  "total": 1
}
```

---

#### DELETE `/api/keys/:keyId`
Revoke an API key.

**Access**: Admin only

**Response**:
```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

---

### Job Endpoints

#### POST `/api/jobs`
Create a new job.

**Authentication**: API Key required

**Request**:
```json
{
  "job_number": "JOB-2026-001",
  "insured_id": "ins_123",
  "property_id": "prop_456",
  "claim_id": "claim_789",
  "loss_type": "water",
  "service_type": "restoration",
  "cause_of_loss": "burst pipe",
  "inspection_date": "2026-04-20",
  "date_of_loss": "2026-04-18",
  "emergency_flag": true,
  "after_hours_flag": false,
  "complexity_level": "standard",
  "access_difficulty": "easy",
  "assigned_manager_id": "user_123",
  "assigned_estimator_id": "user_456",
  "summary_notes": "Customer called for emergency water extraction"
}
```

**Required Fields**: `loss_type`, `service_type`

**Valid Enums**:
- `complexity_level`: `standard`, `complex`, `very_complex`
- `access_difficulty`: `easy`, `moderate`, `difficult`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "job_abc123",
    "job_number": "JOB-2026-001",
    "status": "new",
    "loss_type": "water",
    "service_type": "restoration",
    "created_at": "2026-04-19T10:00:00Z"
  },
  "rateLimit": {
    "remaining": 99,
    "resetAt": "2026-04-19T11:00:00Z"
  }
}
```

---

#### GET `/api/jobs/:jobId`
Get job details.

**Authentication**: API Key required

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "job_abc123",
    "job_number": "JOB-2026-001",
    "status": "in_progress",
    "loss_type": "water",
    "service_type": "restoration",
    "cause_of_loss": "burst pipe",
    "inspection_date": "2026-04-20",
    "date_of_loss": "2026-04-18",
    "emergency_flag": true,
    "after_hours_flag": false,
    "complexity_level": "standard",
    "access_difficulty": "easy",
    "assigned_manager_id": "user_123",
    "assigned_estimator_id": "user_456",
    "summary_notes": "Customer called for emergency water extraction",
    "created_date": "2026-04-19T10:00:00Z",
    "updated_date": "2026-04-19T12:00:00Z",
    "insured": {
      "id": "ins_123",
      "full_name": "John Smith",
      "phone": "555-1234",
      "email": "john@example.com"
    },
    "property": {
      "id": "prop_456",
      "address": "123 Main St",
      "city": "Austin",
      "state": "TX",
      "zip": "78701"
    },
    "claim": {
      "id": "claim_789",
      "claim_number": "CLM-2026-001",
      "policy_number": "POL-123456",
      "carrier_id": "carrier_123",
      "adjuster_id": "adjuster_456"
    }
  },
  "rateLimit": {
    "remaining": 98,
    "resetAt": "2026-04-19T11:00:00Z"
  }
}
```

---

### Estimate Endpoints

#### GET `/api/estimates/:estimateId`
Get estimate details.

**Authentication**: API Key required

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "est_123",
    "job_id": "job_abc123",
    "version_number": 1,
    "label": "Draft v1",
    "status": "approved",
    "pricing_profile_id": "profile_123",
    "subtotal": 5000.00,
    "modifier_total": 1.25,
    "total": 6250.00,
    "applied_modifiers": {
      "emergency": 1.25
    },
    "line_items": [
      {
        "scope_item_id": "scope_123",
        "room_id": "room_456",
        "room_name": "Living Room",
        "category": "demolition",
        "description": "Remove wet drywall",
        "unit": "SF",
        "quantity": 100,
        "unit_cost": 2.25,
        "line_total": 225.00,
        "override_reason": null,
        "source": "rules_engine"
      }
    ],
    "notes": null,
    "created_date": "2026-04-19T10:00:00Z",
    "updated_date": "2026-04-19T12:00:00Z",
    "approved_by": "manager@example.com",
    "approved_at": "2026-04-19T12:00:00Z"
  },
  "rateLimit": {
    "remaining": 97,
    "resetAt": "2026-04-19T11:00:00Z"
  }
}
```

---

#### GET `/api/estimates/:estimateId/export`
Export estimate as PDF.

**Authentication**: API Key required

**Response**: PDF file download

**Headers**:
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="estimate_est_123.pdf"`
- `X-RateLimit-Remaining: 96`
- `X-RateLimit-Reset: 2026-04-19T11:00:00Z`

---

## 🔧 Usage Examples

### cURL Examples

#### Generate API Key
```bash
curl -X POST https://your-app.base44.app/api/auth/generate-key \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -d '{
    "name": "My Integration",
    "description": "API access for third-party system"
  }'
```

#### Create Job
```bash
curl -X POST https://your-app.base44.app/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_a1b2c3d4e5f6..." \
  -d '{
    "loss_type": "water",
    "service_type": "restoration",
    "emergency_flag": true
  }'
```

#### Get Job
```bash
curl -X GET https://your-app.base44.app/api/jobs/job_abc123 \
  -H "Authorization: Bearer sk_a1b2c3d4e5f6..."
```

#### Get Estimate
```bash
curl -X GET https://your-app.base44.app/api/estimates/est_123 \
  -H "Authorization: Bearer sk_a1b2c3d4e5f6..."
```

#### Export Estimate PDF
```bash
curl -X GET https://your-app.base44.app/api/estimates/est_123/export \
  -H "Authorization: Bearer sk_a1b2c3d4e5f6..." \
  -o estimate.pdf
```

---

## 🛡️ Security Best Practices

### 1. API Key Storage
- **Never expose** API keys in client-side code
- **Use environment variables** for storage
- **Rotate keys** periodically (every 90 days recommended)
- **Revoke immediately** if compromised

### 2. IP Whitelisting
- Configure `allowed_ips` for production integrations
- Use static IPs when possible
- Update whitelist when IP addresses change

### 3. Rate Limiting
- Monitor usage via audit logs
- Request rate limit increases if needed
- Implement exponential backoff in client code

### 4. Expiration
- Set `expires_at` for temporary integrations
- Review active keys quarterly
- Remove unused keys

---

## 📊 Monitoring

### Audit Log Queries
```javascript
// View all API requests
const apiLogs = await base44.entities.AuditLog.filter({
  entity_type: 'ApiKey',
  action: 'api_success'
});

// View failed requests
const failedLogs = await base44.entities.AuditLog.filter({
  entity_type: 'ApiKey',
  action: 'api_error'
});

// View rate-limited requests
const rateLimitedLogs = await base44.entities.AuditLog.filter({
  entity_type: 'ApiKey',
  action: 'api_rate_limited'
});
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "error": "validation_failed",
  "message": "loss_type and service_type are required"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid API key"
}
```

### 403 Forbidden
```json
{
  "error": "IP not allowed"
}
```

### 429 Rate Limit Exceeded
```json
{
  "error": "Rate limit exceeded"
}
```

### 500 Internal Error
```json
{
  "error": "internal_error",
  "message": "Error details"
}
```

---

## 🚀 Implementation Notes

### Rate Limiting
- **In-memory storage** (Map) - suitable for single-instance deployments
- **For production**: Consider Redis for distributed rate limiting
- **Window**: 1 hour sliding window
- **Default**: 100 requests/hour

### Company Isolation
- All API keys are scoped to a single `company_id`
- API keys can only access data within their company
- Cross-company access is blocked (403)

### Role Permissions
- API keys inherit role-based permissions
- Configurable per key via `role_permissions` array
- Defaults to `['admin', 'manager']`

---

## ✅ Status

**Production Ready**: Yes

**Date**: 2026-04-19