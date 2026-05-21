# RestoreReach AI — Full Audit & Testing Checklist

## Bugs Fixed in This Audit

| # | Issue | Fix Applied |
|---|-------|-------------|
| 1 | Dashboard Lead Pipeline used `RRLeadCapture` entity but Lead Capture page uses `EmergencyLead` — leads never appeared on dashboard | Switched dashboard query to `EmergencyLead` |
| 2 | Dashboard `gbpPosts` count came from campaigns filtered by type, not the real `GBPPost` entity | Now queries `GBPPost` entity directly |
| 3 | Dashboard `reviewRequests` count came from campaigns, not `ReviewRequest` entity | Now queries `ReviewRequest` entity directly |
| 4 | Dashboard visibility score used old 10-check formula, out of sync with Visibility Score page | Dashboard now uses same weighted formula (100pt scale) as RRVisibilityScore |
| 5 | DashVisibilityBreakdown sub-bars used campaign-based counts (stale/wrong) | Rewritten to use `gbpPostsCount`, `reviewsData`, `seo_pages` from areas |
| 6 | DashLeadPipeline LeadRow used `RRLeadCapture` status values (`new/contacted/qualified/converted/lost`) vs `EmergencyLead` values (`new/contacted/inspection_scheduled/estimate_sent/won/lost`) — status updates failed silently | Rewrote LeadRow to use correct `EmergencyLead` statuses and entity |
| 7 | Visibility score metric card displayed `XX%` — incorrect since score is 0-100 points, not a percentage | Changed to `XX/100` format |
| 8 | Visibility score rating "Good" not in rating scale — scale is Poor/Needs Work/Strong/Excellent | Fixed metric card and breakdown to use correct 4-tier rating |
| 9 | Mobile nav only showed first 5 items — Settings, Service Areas, Visibility Score not reachable on mobile | Now shows all nav items with no-scrollbar horizontal scroll |
| 10 | ReviewRequestForm hardcoded `DEFAULT_REVIEW_LINK = 'https://g.page/r/review'` — never used real profile link | Now queries profile and pre-fills review link from `google_review_link` |

---

## Testing Checklist

### ✅ Settings
- [ ] Open Settings → fill in company name, phone, address, website
- [ ] Add Google Business Profile URL and Google Review link
- [ ] Add Facebook/Instagram URLs
- [ ] Click Save → toast appears → reload page → all fields retained
- [ ] Toggle services on/off → save → reload → selections retained

### ✅ Dashboard
- [ ] Dashboard loads without errors
- [ ] "Total Leads" count matches actual leads on Lead Capture page
- [ ] "New Leads This Month" only counts leads from current calendar month
- [ ] "GBP Posts Created" matches count on GBP Command page
- [ ] "Review Requests Sent" matches count on Review Engine page
- [ ] "Active Service Areas" matches count on Service Areas page
- [ ] "Visibility Score" shows same number as Visibility Score page (±1 due to rounding)
- [ ] Lead Pipeline table shows `EmergencyLead` data with correct statuses
- [ ] Changing a lead status in the pipeline dropdown saves correctly and refreshes
- [ ] Visibility breakdown bars reflect real data (not zeroed out)
- [ ] Storm banner appears when there's an active storm campaign created < 48hrs ago

### ✅ GBP Command Center
- [ ] Generate Post button produces a title, body, hashtags
- [ ] Save Post button saves to `GBPPost` entity and appears in Post Calendar
- [ ] Post Calendar shows all posts with correct status badges
- [ ] Edit post modal saves changes and refreshes list
- [ ] Delete post removes it and refreshes list
- [ ] Suspension scanner runs and shows risk items

### ✅ AI Content Generator
- [ ] Fill in service + city + tone + CTA → Generate → content appears
- [ ] Save as Campaign → creates `RRMarketingCampaign` record
- [ ] Content history panel shows previously saved campaigns

### ✅ Review Automation
- [ ] Form pre-fills Review Link from Settings profile (not hardcoded placeholder)
- [ ] Enter customer name → Generate SMS → message appears in textarea
- [ ] SMS character count displays correctly (≤160 chars)
- [ ] Save Request → creates `ReviewRequest` record → appears in tracking table immediately
- [ ] Mark Sent button updates status to "sent"
- [ ] Mark Reviewed button updates status to "reviewed" and increments "Reviews Received" stat
- [ ] Conversion rate % updates live as statuses change
- [ ] Follow-up automation settings display correctly

### ✅ Storm Mode
- [ ] Fill event type + city + severity → Save & Generate Content → generates and saves
- [ ] Storm event card appears immediately after save
- [ ] Status toggle (Monitoring / Active / Paused) saves correctly
- [ ] "Activate Storm Campaign" button creates `RRMarketingCampaign` + `GBPPost`
- [ ] After activation, card shows "🚨 Campaign Active" badge and button disappears
- [ ] Storm stats (Active / Monitoring / Campaigns Triggered) update live
- [ ] Expanding a card shows GBP post, Facebook post, ad headlines, keywords

### ✅ Emergency Lead Capture
- [ ] Toggle hazard flags (water/mold/sewage) — urgency score updates in real time in header
- [ ] Upload photos — thumbnails appear, remove button works
- [ ] Submit form → `EmergencyLead` created → form resets → lead appears in list
- [ ] Critical leads (score ≥75) show red banner at top
- [ ] Status dropdown on lead card saves and refreshes
- [ ] Expanding lead card shows full address, damage description, hazard flags, photos
- [ ] Status filter and urgency filter work correctly

### ✅ Service Area SEO Manager
- [ ] Add City form: fill city + state + services + keywords → Add → area appears in list
- [ ] Priority selector (High/Medium/Low) saves correctly
- [ ] Keyword tag adds on Enter or Add button click
- [ ] Remove keyword (×) works
- [ ] Click area in list → SEO Generator appears on right
- [ ] Select services → Generate SEO Pages → H1 uses exact template
  - Expected: `Fast & Reliable [Service] in [City], [State]`
- [ ] CTA in generated pages shows: `Get a Free Inspection – Call 636-219-9302`
- [ ] All copy buttons copy correct text
- [ ] Generated pages save to area record → seo_status changes to "active"
- [ ] Delete area button removes record and refreshes list
- [ ] Stats (Service Areas / SEO Active / Pages Generated) update after actions

### ✅ Visibility Score
- [ ] Score ring renders and displays correct 0-100 number
- [ ] Rating label matches: Poor (0-39) / Needs Work (40-59) / Strong (60-79) / Excellent (80-100)
- [ ] All 6 category bars show real percentages
- [ ] Expanding a category row shows individual pass/fail items with point values
- [ ] Weaknesses panel shows unfulfilled checks
- [ ] Recommendations link to the correct module pages
- [ ] After completing Settings → revisit page → score increases

### ✅ Mobile Layout
- [ ] All nav items accessible in mobile top bar (scrollable)
- [ ] No nav item cuts off on small screens
- [ ] Forms are usable on mobile (inputs not too small, no horizontal overflow)
- [ ] Cards stack vertically on mobile
- [ ] Tables scroll horizontally on mobile without breaking layout
- [ ] Buttons are touch-friendly (≥44px tap target)

### ✅ Data Isolation
- [ ] All entity queries use correct query keys that match between pages and dashboard
- [ ] `EmergencyLead` entity used everywhere for leads (not `RRLeadCapture`)
- [ ] `GBPPost` entity used for post counts (not `RRMarketingCampaign`)
- [ ] `ReviewRequest` entity used for review counts (not `RRMarketingCampaign`)
- [ ] Profile queries filter by `created_by: user.email` (not global)