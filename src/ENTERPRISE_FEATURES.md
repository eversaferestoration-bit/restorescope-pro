# Enterprise Features

## Overview
Comprehensive enterprise-grade features for multi-location restoration companies with advanced hierarchy, branch-specific pricing, and usage reporting.

---

## ✅ Features Implemented

### 1. Multi-Location Support
**Entity**: `CompanyLocation`

Track multiple branch locations with:
- Unique location codes
- Address and contact information
- Location managers
- Headquarters designation
- Timezone support
- Active/inactive status

**Example Locations**:
- Headquarters (Austin, TX)
- Dallas Branch
- Houston Branch

---

### 2. Admin Hierarchy
**Entity**: `EnterpriseSettings`

Configure organizational structure:
- **Corporate Admins**: Company-wide access
- **Regional Admins**: Location-restricted access
- **Location Managers**: Branch-level management

**Settings**:
- `enable_multi_location`: Activate multi-location mode
- `enable_admin_hierarchy`: Enable corporate/regional admin roles
- `enable_branch_pricing`: Allow location-specific pricing
- `enable_usage_reporting`: Enable usage tracking and reports

---

### 3. Branch-Specific Pricing
**Feature**: Custom pricing profiles per location

Each branch can have:
- Dedicated pricing profiles
- Regional cost adjustments
- Market-specific rates
- Manager-controlled pricing

**API**: `setLocationPricing`
```javascript
await base44.functions.invoke('setLocationPricing', {
  location_id: 'loc_123',
  pricing_profile_id: 'profile_456'
});
```

---

### 4. Usage Reporting
**Entity**: `UsageReport`

Comprehensive metrics tracking:
- **Jobs**: Total count by period
- **Estimates**: Count and total value
- **Users**: Active user count
- **Photos**: Upload count and storage
- **AI Analyses**: Computer vision usage
- **API Calls**: Integration usage
- **Top Users**: Leaderboard by activity

**Report Periods**: Daily, Weekly, Monthly

**API**: `getUsageReport`
```javascript
const report = await base44.functions.invoke('getUsageReport', {
  period: 'monthly',
  days: 30,
  location_id: 'loc_123' // Optional filter
});
```

---

## 📊 Data Models

### CompanyLocation
```json
{
  "company_id": "string",
  "name": "Headquarters",
  "code": "HQ-01",
  "address": "123 Main St",
  "city": "Austin",
  "state": "TX",
  "zip": "78701",
  "phone": "512-555-0100",
  "manager_id": "user_123",
  "is_headquarters": true,
  "is_active": true,
  "pricing_profile_id": "profile_456",
  "timezone": "America/Chicago"
}
```

### EnterpriseSettings
```json
{
  "company_id": "string",
  "enable_multi_location": true,
  "enable_branch_pricing": true,
  "enable_usage_reporting": true,
  "enable_admin_hierarchy": true,
  "corporate_admin_ids": ["user_123"],
  "regional_admin_ids": ["user_456"],
  "default_pricing_profile_id": "profile_default",
  "usage_report_email": "admin@company.com",
  "usage_report_frequency": "weekly"
}
```

### UsageReport
```json
{
  "company_id": "string",
  "location_id": "loc_123",
  "report_period": "monthly",
  "period_start": "2026-03-20",
  "period_end": "2026-04-19",
  "total_jobs": 45,
  "total_estimates": 38,
  "total_users": 12,
  "total_photos": 523,
  "ai_analyses_count": 145,
  "storage_used_mb": 2456.78,
  "api_calls_count": 1234,
  "total_estimate_value": 285000.00,
  "avg_estimate_value": 7500.00,
  "top_users": [
    {
      "user_id": "user_123",
      "user_name": "John Smith",
      "jobs_count": 15,
      "estimates_count": 12
    }
  ]
}
```

---

## 🖥️ UI: Enterprise Settings

**Page**: `/enterprise-settings`

**Tabs**:

### 1. Locations
- List all company locations
- Add new locations
- View location details
- Assign managers
- Delete/deactivate locations

### 2. Admin Hierarchy
- Enable/disable enterprise features
- Configure multi-location mode
- Enable admin hierarchy
- Set branch pricing permissions
- Configure usage reporting

### 3. Branch Pricing
- View all locations
- Assign pricing profiles per branch
- Quick pricing updates
- Visual status indicators

### 4. Usage Reports
- **Metrics Dashboard**: Jobs, Estimates, Users, Photos
- **Top Users Leaderboard**: Activity ranking
- **Financial Summary**: Total/Avg estimate values
- **Storage Tracking**: MB used
- **AI Usage**: Analysis count

---

## 🔐 Security & Permissions

### Role-Based Access
- **Admin**: Full access to enterprise settings
- **Manager**: Location-restricted access (if hierarchy enabled)
- **User**: No access to enterprise settings

### Company Isolation
- All data scoped to `company_id`
- Cross-company access blocked
- Audit logging enabled

### Audit Trail
- Location changes logged
- Pricing updates tracked
- Report generation recorded
- Admin hierarchy changes documented

---

## 📈 Usage Metrics

### Tracked Metrics
1. **Jobs**: Created, in-progress, completed
2. **Estimates**: Drafts, submissions, approvals
3. **Users**: Active accounts
4. **Photos**: Uploads, analyses, storage
5. **API Calls**: External integration usage
6. **Financial**: Estimate totals and averages

### Report Generation
- **Daily**: Previous 24 hours
- **Weekly**: Last 7 days
- **Monthly**: Last 30 days

### Data Retention
- Reports stored indefinitely
- Can be filtered by location
- Exportable for external analysis

---

## 🚀 API Endpoints

### GET `/api/enterprise/usage-report`
Generate usage report.

**Parameters**:
- `period`: "daily" | "weekly" | "monthly"
- `days`: Number (default: 7)
- `location_id`: Optional filter

**Response**:
```json
{
  "success": true,
  "data": {
    "report_id": "report_123",
    "period": { "type": "monthly", "start": "...", "end": "...", "days": 30 },
    "metrics": { ... },
    "top_users": [ ... ],
    "generated_at": "2026-04-19T10:00:00Z"
  }
}
```

---

### POST `/api/enterprise/set-location-pricing`
Set custom pricing for location.

**Parameters**:
- `location_id`: Location ID
- `pricing_profile_id`: Pricing profile ID

**Response**:
```json
{
  "success": true,
  "message": "Location pricing profile updated successfully",
  "data": {
    "location_id": "loc_123",
    "pricing_profile_id": "profile_456"
  }
}
```

---

## 💡 Use Cases

### 1. Multi-Region Restoration Company
**Scenario**: Company with 5 branches across Texas

**Solution**:
- Create location for each branch
- Assign branch managers
- Configure region-specific pricing
- Generate monthly usage reports per location
- Compare branch performance

### 2. Franchise Operations
**Scenario**: Franchise with corporate oversight

**Solution**:
- Enable admin hierarchy
- Corporate admins oversee all locations
- Regional admins manage clusters
- Location managers handle daily ops
- Usage reports sent to corporate weekly

### 3. Pricing Optimization
**Scenario**: Different markets require different pricing

**Solution**:
- Create custom pricing profiles per region
- Assign profiles to locations
- Track estimate values by branch
- Adjust pricing based on market data
- Monitor approval rates by location

---

## 📊 Sample Reports

### Monthly Usage Summary
```
Period: March 20 - April 19, 2026
Location: All Branches

Metrics:
- Total Jobs: 45
- Total Estimates: 38
- Active Users: 12
- Photos Uploaded: 523
- AI Analyses: 145
- Storage Used: 2.4 GB
- Total Estimate Value: $285,000
- Avg Estimate Value: $7,500

Top Performers:
1. John Smith - 15 jobs, 12 estimates
2. Sarah Johnson - 12 jobs, 10 estimates
3. Mike Davis - 10 jobs, 9 estimates
```

---

## ⚙️ Configuration

### Enable Enterprise Features
1. Navigate to **Enterprise Settings**
2. Go to **Admin Hierarchy** tab
3. Toggle desired features:
   - Multi-Location
   - Admin Hierarchy
   - Branch Pricing
   - Usage Reporting

### Add Location
1. Go to **Locations** tab
2. Click **Add Location**
3. Fill in details:
   - Name, Code
   - Address, City, State, ZIP
   - Phone
   - Manager (optional)
4. Click **Add Location**

### Configure Branch Pricing
1. Enable **Branch Pricing** in Admin Hierarchy
2. Go to **Branch Pricing** tab
3. Select location
4. Choose pricing profile
5. Changes apply immediately

### View Usage Reports
1. Go to **Usage Reports** tab
2. Metrics load automatically (last 30 days)
3. View:
   - Summary metrics
   - Top users leaderboard
   - Financial summary
   - Storage and AI usage

---

## 🔒 Best Practices

### Security
- Limit enterprise settings access to corporate admins
- Use IP restrictions for sensitive operations
- Review audit logs regularly
- Rotate location managers periodically

### Data Management
- Archive inactive locations
- Review usage reports monthly
- Set up automated report emails
- Monitor storage usage trends

### Pricing Strategy
- Review branch pricing quarterly
- Compare approval rates by location
- Adjust for regional market conditions
- Track competitor pricing

---

## ✅ Status

**Production Ready**: Yes

**Date**: 2026-04-19

**Features**:
- ✅ Multi-location support
- ✅ Admin hierarchy
- ✅ Branch-specific pricing
- ✅ Usage reporting
- ✅ Enterprise Settings UI
- ✅ API endpoints
- ✅ Audit logging
- ✅ Security controls