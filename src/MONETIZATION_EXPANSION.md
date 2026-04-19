# Monetization Expansion - Implementation Summary

## Overview
Expanded the platform's monetization capabilities with usage-based pricing, AI analysis overage charges, premium analytics tiers, and enterprise custom pricing.

## New Entities

### Plan (Updated)
- **tier**: starter | professional | business | enterprise
- **overage_job_price**: Price per additional job beyond limit
- **overage_ai_price**: Price per additional AI analysis beyond limit
- **premium_analytics**: Boolean flag for premium analytics access
- **enterprise_features**: Boolean flag for enterprise features
- **custom_pricing**: Boolean flag for custom pricing availability

### UsageRecord (New)
Tracks monthly usage for billing:
- **jobs_used / jobs_limit**: Job count tracking
- **ai_analyses_used / ai_analyses_limit**: AI analysis tracking
- **storage_used_mb / storage_limit_mb**: Storage tracking
- **overage_jobs / overage_ai**: Overage units
- **overage_charges**: Total overage fees
- **total_charges**: Base + overage charges
- **status**: active | finalized | billed

## Pricing Tiers Implemented

### Starter ($49/mo)
- 3 seats, 10 jobs/month, 50 AI analyses/month
- 5 GB storage
- Overage: $5/job, $2/AI analysis
- Core features only

### Professional ($149/mo)
- 10 seats, 50 jobs/month, 200 AI analyses/month
- 20 GB storage
- Overage: $4/job, $1.50/AI analysis
- **Premium analytics included**
- Priority support

### Business ($399/mo)
- 25 seats, 200 jobs/month, 1000 AI analyses/month
- 100 GB storage
- Overage: $3/job, $1/AI analysis
- **Adjuster insights, Claim defense**
- Negotiation strategies
- Dedicated support

### Enterprise ($999/mo)
- 100 seats, 1000 jobs/month, 5000 AI analyses/month
- 500 GB storage
- Overage: $2/job, $0.50/AI analysis
- **Multi-location, Custom pricing**
- API access, SLA, White-label options

## Backend Functions

### trackUsage
- Tracks usage by type (job, ai_analysis, storage)
- Automatically calculates overage charges
- Updates UsageRecord entities
- Returns limit warnings when thresholds exceeded

## Frontend Components

### Billing Page (Upgraded)
- **Plan comparison cards** with tier-specific features
- **Usage summary dashboard** with progress bars
- **Overage charge display** showing upcoming fees
- **One-click plan selection**
- **Enterprise contact flow**

### UpgradePrompt Component
Reusable upgrade modal that:
- Shows feature-specific messaging
- Displays plan comparison
- Routes to billing page
- Supports features:
  - `premium_analytics`
  - `adjuster_insights`
  - `claim_defense`
  - `enterprise_features`
  - `ai_overage`

### useFeatureAccess Hook
- Checks subscription tier against feature requirements
- Returns access status and current tier
- Triggers upgrade prompts when needed

### useUsageLimits Hook
- Fetches current usage vs limits
- Tracks overage charges
- Shows limit warnings

## Upgrade Prompts Integrated

### Adjuster Insights Panel
- Shows upgrade prompt for non-Business/Enterprise users
- Displays "Unlock adjuster insights" CTA
- Triggers on access denied or error states

### Photo Analysis
- Detects AI limit exhaustion
- Shows "AI Analysis Limit Reached" prompt
- Allows users to upgrade before retrying

### Analytics Dashboard
- Premium analytics features gated by tier
- Upgrade prompt for Professional+ features

## Key Features

### Usage-Based Billing
- Automatic tracking of jobs, AI analyses, storage
- Real-time overage calculation
- Period-based billing cycles
- Overage charges displayed before billing

### Tier-Gated Features
- **Professional**: Premium analytics, priority support
- **Business**: Adjuster insights, claim defense, negotiation strategies
- **Enterprise**: Multi-location, custom pricing, API access

### Overage Protection
- Warnings when approaching limits (70%, 90%)
- Upgrade prompts when limits exceeded
- Transparent pricing for overage charges

## Security & Validation

### Company Isolation
- All usage tracked per company
- Subscription validation on feature access
- Role-based access maintained

### Audit Logging
- Usage tracking logged to AuditLog
- Plan changes recorded
- Overage charges documented

## User Experience

### Visual Indicators
- **Progress bars** for jobs, AI, storage usage
- **Color-coded warnings** (green < 70%, amber 70-90%, red > 90%)
- **Overage charge alerts** in billing dashboard

### Upgrade Flow
1. User attempts premium feature
2. Upgrade prompt appears with feature benefits
3. Plan comparison modal
4. One-click selection or enterprise contact
5. Immediate feature unlock

## Next Steps (Recommended)

1. **Payment Integration**: Connect Stripe/Wix Payments for automated billing
2. **Webhook Handlers**: Process payment events, subscription changes
3. **Automated Invoicing**: Generate and send invoices with overage charges
4. **Usage Alerts**: Email notifications at 70%, 90%, 100% of limits
5. **Annual Billing**: Support for annual payment cycles with discounts
6. **Coupon Codes**: Promotional discount support
7. **Proration**: Handle mid-cycle plan changes

## Files Modified/Created

### Entities
- `entities/Plan.json` (updated)
- `entities/UsageRecord.json` (new)

### Pages
- `pages/Billing.jsx` (complete rewrite)

### Components
- `components/UpgradePrompt.jsx` (new)
- `components/job/AdjusterInsightsPanel` (upgrade prompts added)
- `components/job/PhotoAnalysisPanel` (upgrade prompts added)

### Hooks
- `hooks/useFeatureAccess.js` (new)
- `hooks/useUsageLimits.js` (new)

### Functions
- `functions/trackUsage.js` (new)

### Data
- 4 Plan records created (Starter, Professional, Business, Enterprise)

## Testing Checklist

- [ ] Create subscription and verify usage tracking
- [ ] Exceed job limit and verify overage calculation
- [ ] Exceed AI limit and verify upgrade prompt
- [ ] Test plan upgrade flow
- [ ] Verify feature gating by tier
- [ ] Test enterprise contact flow
- [ ] Verify usage dashboard accuracy
- [ ] Test role-based access with upgrade prompts