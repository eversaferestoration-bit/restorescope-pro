# Carrier Intelligence System

**Status:** ✅ Complete  
**Date:** 2026-04-19

---

## Overview

The Carrier Intelligence System provides data-driven insights and strategic recommendations for dealing with insurance carriers. It aggregates historical outcomes across all jobs to build carrier profiles and generate actionable strategies.

---

## Components

### 1. Entity: `CarrierProfile`

Stores aggregated carrier intelligence data:

**Fields:**
- `carrier_name` (string, required) - Name of the insurance carrier
- `avg_approval_rate` (number, 0-100) - Average approval rate across all jobs
- `avg_reduction_percent` (number, 0-100) - Average reduction negotiated
- `common_disputes` (array) - Common dispute categories
- `preferred_documentation` (array) - Documentation types carrier prefers
- `response_behavior` (enum: fast/moderate/slow/variable) - Response time pattern
- `total_interactions` (integer) - Total jobs/interactions count
- `avg_response_time_days` (number) - Average response time in days
- `dispute_rate` (number, 0-100) - Percentage of jobs with disputes
- `last_updated` (datetime) - Last profile update

### 2. Function: `updateCarrierProfile`

**Purpose:** Aggregates outcomes across all jobs to update carrier profile (carrier-wide trends, not per company).

**Input:**
```json
{
  "carrier_id": "string"
}
```

**Logic:**
1. Fetches all jobs for the carrier across all companies
2. Aggregates estimate approval/rejection data
3. Calculates average approval rate
4. Computes average reduction percentages from multi-version estimates
5. Identifies common dispute categories from rejection notes
6. Determines preferred documentation from approved estimates
7. Analyzes response time patterns
8. Calculates dispute rate
9. Upserts carrier profile with aggregated data

**Output:**
```json
{
  "success": true,
  "profile_id": "string",
  "profile": {
    "carrier_name": "State Farm",
    "avg_approval_rate": 75.5,
    "avg_reduction_percent": 12.3,
    "common_disputes": ["documentation", "pricing"],
    "preferred_documentation": ["moisture_logs", "photos"],
    "response_behavior": "moderate",
    "total_interactions": 45,
    "avg_response_time_days": 3.2,
    "dispute_rate": 18.5,
    "last_updated": "2026-04-19T19:04:29.727Z"
  }
}
```

### 3. Function: `getCarrierStrategy`

**Purpose:** Generates strategic recommendations based on carrier profile.

**Input:**
```json
{
  "carrier_name": "State Farm"
}
```

**Output:**
```json
{
  "success": true,
  "has_profile": true,
  "carrier_name": "State Farm",
  "difficulty_level": "moderate",
  "difficulty_score": 50,
  "profile_summary": {
    "avg_approval_rate": 75.5,
    "avg_reduction_percent": 12.3,
    "response_behavior": "moderate",
    "dispute_rate": 18.5,
    "total_interactions": 45
  },
  "recommendations": {
    "documentation_emphasis": [
      "Daily moisture logs with clear readings",
      "Comprehensive photo documentation with timestamps",
      "Itemized invoices with line-item details"
    ],
    "risk_areas": [
      "Pricing above carrier-accepted standards",
      "Scope items deemed unnecessary"
    ],
    "strategy_suggestions": [
      "Moderate approval rate - focus on documentation quality",
      "Address common dispute categories proactively",
      "Moderate reductions - review pricing on disputed categories"
    ]
  }
}
```

**Strategy Generation Logic:**
- **Documentation Emphasis:** Based on carrier's preferred_documentation field
- **Risk Areas:** Derived from common_disputes patterns
- **Strategy Suggestions:** Generated from approval rates, reduction rates, response behavior, and dispute rates

**Difficulty Levels:**
- `favorable` (score 25): Approval rate ≥75%, dispute rate <20%, reduction <10%
- `moderate` (score 50): Default
- `challenging` (score 75): Approval rate <50% OR dispute rate >40% OR reduction >20%

### 4. UI Component: `CarrierProfilePanel`

**Location:** `components/job/CarrierProfilePanel.jsx`

**Features:**
- Displays carrier difficulty badge (favorable/moderate/challenging)
- Shows quick stats: approval rate, reduction %, response behavior
- Lists documentation emphasis recommendations
- Highlights risk areas to watch
- Provides strategy suggestions
- Refresh button for managers/admins to update profile data
- Graceful handling for carriers with no historical data

**Integration:** Embedded in JobInsuredClaim tab under Carrier section

---

## Usage Flow

### For New Carriers (No Historical Data)

1. User views job with carrier assigned
2. CarrierProfilePanel shows generic recommendations
3. System suggests: "Submit claims to build carrier intelligence profile"

### For Established Carriers (With Data)

1. Manager refreshes carrier profile (optional)
   - Calls `updateCarrierProfile` with carrier_id
   - Aggregates latest data across all jobs
2. System displays:
   - Difficulty level badge
   - Approval rate, reduction %, response behavior
   - Tailored documentation recommendations
   - Specific risk areas based on dispute history
   - Strategic suggestions for better outcomes

---

## Benefits

1. **Data-Driven Decisions:** Leverages historical data across all company jobs
2. **Carrier-Wide Insights:** Tracks trends per carrier (not per company) for comprehensive intelligence
3. **Proactive Risk Management:** Identifies common dispute areas before submission
4. **Optimized Documentation:** Tailors documentation to carrier preferences
5. **Improved Approval Rates:** Strategic recommendations increase first-pass approvals
6. **Reduced Negotiations:** Better initial submissions lead to fewer reductions

---

## API Endpoints

### Update Carrier Profile
```
POST /api/updateCarrierProfile
Authorization: Bearer <token>
Role: admin or manager

Request:
{
  "carrier_id": "string"
}

Response: 200/400/403/500
```

### Get Carrier Strategy
```
POST /api/getCarrierStrategy
Authorization: Bearer <token>

Request:
{
  "carrier_name": "string"
}

Response: 200/400/500
```

---

## Testing

**Test Data Created:**
- 3 sample carriers: State Farm, Allstate, Farmers Insurance
- CarrierProfile entity created for State Farm
- Functions tested and validated

**Test Results:**
- ✅ `updateCarrierProfile` - Successfully aggregates data
- ✅ `getCarrierStrategy` - Returns recommendations
- ✅ UI component - Renders in job view
- ✅ Manager refresh - Updates profile on demand

---

## Future Enhancements

1. **Automated Updates:** Run `updateCarrierProfile` on schedule (e.g., weekly)
2. **Carrier Benchmarking:** Compare carrier performance against industry averages
3. **Adjuster-Carrier Matrix:** Combine adjuster and carrier intelligence
4. **Predictive Scoring:** Predict approval likelihood for specific job types
5. **Regional Variations:** Track carrier behavior by region/state
6. **Policy Type Analysis:** Differentiate strategies by policy type (HO-3, HO-8, etc.)

---

## Files Created/Modified

**New Files:**
- `entities/CarrierProfile.json` - Carrier intelligence schema
- `functions/updateCarrierProfile` - Profile aggregation function
- `functions/getCarrierStrategy` - Strategy generation function
- `components/job/CarrierProfilePanel.jsx` - UI component
- `CARRIER_INTELLIGENCE.md` - Documentation

**Modified Files:**
- `components/job/tabs/JobInsuredClaim.jsx` - Added CarrierProfilePanel integration

---

**System Status:** ✅ Production Ready