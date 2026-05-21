# Known Issues & Limitations

**Status:** Production Ready  
**Last Updated:** 2026-05-21  
**Severity Scale:** CRITICAL | HIGH | MEDIUM | LOW | INFO

---

## 🔴 CRITICAL ISSUES (0)

No critical issues known.

---

## 🟠 HIGH-SEVERITY ISSUES (0)

No high-severity issues known.

---

## 🟡 MEDIUM-SEVERITY ISSUES (3)

### 1. Real-Time Sync Unavailable
**Severity:** MEDIUM  
**Component:** All modules  
**Description:** Changes made in another tab/browser don't automatically appear  

**Impact:**
- User A edits Job #123 in Tab 1
- User B views Job #123 in Tab 2
- Tab 2 doesn't update automatically

**Workaround:**
- Manual pull-to-refresh (mobile) or refresh button (desktop)
- Data refreshes automatically every 2 minutes if page is active
- Session storage helps on single-device usage

**Root Cause:** WebSocket/webhook support not implemented  
**Priority:** Will add in v1.1  
**Estimated Fix:** Q3 2026

---

### 2. Bulk Operations Not Supported
**Severity:** MEDIUM  
**Component:** Jobs, Estimates  
**Description:** Cannot perform operations on multiple records at once  

**Impact:**
- Changing status of 10 jobs requires 10 individual clicks
- No bulk export of estimates
- No batch updates

**Workaround:**
- Use API directly for bulk operations (admin only)
- Leverage automation engine for scheduled bulk actions
- Single-item operations are fast with optimistic UI

**Root Cause:** API and UI not designed for bulk  
**Priority:** Medium  
**Estimated Fix:** Q4 2026

---

### 3. File Upload Resume Not Supported
**Severity:** MEDIUM  
**Component:** Photo upload, Document upload  
**Description:** Large file upload fails on network interruption; must restart  

**Impact:**
- 50MB+ photo uploads may fail on poor networks
- No pause/resume capability
- User must re-upload entire file

**Workaround:**
- Keep files < 50MB
- Use stable WiFi for large uploads
- Upload during low-traffic hours
- Mobile users should upload directly from camera (smaller files)

**Root Cause:** Browser File API and backend don't support chunked uploads  
**Priority:** Low (most uploads < 10MB)  
**Estimated Fix:** Q1 2027

---

## 🟢 LOW-SEVERITY ISSUES (5)

### 4. Timezone Selection Not Available
**Severity:** LOW  
**Component:** Settings, Job creation  
**Description:** Timezone defaults to user's device timezone; cannot override  

**Impact:**
- International teams may see dates in wrong timezone
- Schedule jobs in user's timezone, not company timezone

**Workaround:**
- Manually adjust for timezone differences
- Store times in UTC, convert in comments
- Update in v1.1 to include timezone selector in company settings

**Root Cause:** TimeZone picker not yet built  
**Priority:** Low  
**Estimated Fix:** Q2 2026

---

### 5. Keyboard Shortcuts Not Implemented
**Severity:** LOW  
**Component:** All modules  
**Description:** No keyboard shortcuts for common actions (Cmd+S, Cmd+K search, etc.)  

**Impact:**
- Power users must use mouse/touch for all actions
- Slower workflow for frequent users
- No quick search capability

**Workaround:**
- Use search bar for filtering
- Click buttons normally

**Root Cause:** Keyboard handler not implemented  
**Priority:** Nice-to-have  
**Estimated Fix:** Q3 2026

---

### 6. Notification Center Not Implemented
**Severity:** LOW  
**Component:** Dashboard  
**Description:** No in-app notifications for job assignments, approvals, etc.  

**Impact:**
- Users don't get real-time alerts
- Must check status manually
- Email notifications not configurable

**Workaround:**
- Email notifications sent (check email)
- Manual checks of dashboard/job lists
- Subscribe to audit log RSS (future)

**Root Cause:** Notification system not yet built  
**Priority:** Medium  
**Estimated Fix:** Q2 2026

---

### 7. Dark Mode Not Fully Supported
**Severity:** LOW  
**Component:** RestoreReach module  
**Description:** Some RestoreReach pages use hardcoded dark colors; light mode not supported  

**Impact:**
- RestoreReach module always dark (by design)
- Main app supports light/dark toggle
- Inconsistent theming between modules

**Workaround:**
- Use dark mode in OS settings for consistency
- Main app respects system preference

**Root Cause:** RestoreReach is designed as dark-only for now  
**Priority:** Low  
**Estimated Fix:** Q4 2026 (design refresh)

---

## 📋 LIMITATIONS & DESIGN DECISIONS

### API Rate Limiting
- **Limit:** 100 requests/minute per user
- **Impact:** Bulk operations may hit limit
- **Workaround:** Stagger requests or use batch API (future)

### Data Retention
- **Retention:** 90 days for soft-deleted records
- **After 90 days:** Records permanently deleted
- **Impact:** Cannot restore jobs after 90 days
- **Workaround:** Export important data monthly

### Search Functionality
- **Scope:** Searches only job number, loss type, status
- **Not Searchable:** Customer name, address, notes
- **Workaround:** Filter by status, sort by date, manual scan

### Export Formats
- **Supported:** PDF, CSV, JSON (estimates only)
- **Not Supported:** Excel templates, custom formats
- **Workaround:** Download CSV and open in Excel

### Mobile App
- **Status:** Web-only; no native iOS/Android app
- **Supported:** Responsive web design (works on all devices)
- **Future:** Consider native app in 2027

---

## ⚠️ PRODUCTION WARNINGS

### Backup Your Data
- Production database is real and permanent
- Soft deletes protect against accidents
- Regular backups recommended (handled by Base44)

### Monitor Usage
- Track team performance metrics
- Watch for unusual activity in audit logs
- Report security concerns immediately

### Upgrade Path
- Stay current with security patches
- New features released monthly
- Backwards compatible (usually)

---

## 🔄 WORKAROUNDS & TIPS

### If Data Seems Stale
1. Pull-to-refresh (mobile) or click refresh button (desktop)
2. Check browser console for API errors
3. Try a hard reload (Cmd+Shift+R or Ctrl+Shift+R)
4. Check internet connection
5. Try again in 30 seconds (server might be updating)

### If Form Won't Submit
1. Check all required fields are filled
2. Verify no validation errors (red borders)
3. Check internet connection
4. Try removing and re-adding values
5. If still stuck, refresh page and try again

### If You See "Access Denied"
1. Verify you belong to the company
2. Check your role (Admin/Manager/Estimator/Technician)
3. Confirm you're logged in to correct account
4. Contact admin if you should have access

### If Estimate Seems Wrong
1. Check all line items are correct
2. Verify modifiers applied correctly
3. Confirm carrier strategy loaded
4. Review carrier behavior patterns (may be conservative)
5. Adjust manually if needed

---

## 📞 SUPPORT & ESCALATION

**For Production Issues:**
1. Check this Known Issues doc first
2. Check recent deployments in CHANGELOG.md
3. Collect error message and steps to reproduce
4. Contact support with timestamp and job ID
5. Check status page for server issues

**Severity Guide:**
- **CRITICAL:** Cannot work at all → escalate immediately
- **HIGH:** Feature broken, workaround exists → escalate same day
- **MEDIUM:** Workaround exists, non-critical → report in standup
- **LOW:** Minor UI issue, doesn't block work → document and defer

---

## 🚀 FUTURE IMPROVEMENTS

| Feature | Severity | Est. Release | Notes |
|---------|----------|--------------|-------|
| Real-time sync | HIGH | Q3 2026 | WebSocket support |
| Bulk operations | MEDIUM | Q4 2026 | Batch API |
| File upload resume | MEDIUM | Q1 2027 | Chunked uploads |
| Keyboard shortcuts | LOW | Q3 2026 | Cmd+K search, etc. |
| Notifications | MEDIUM | Q2 2026 | In-app + push |
| Dark mode (RR) | LOW | Q4 2026 | Full theme support |
| Native mobile app | INFO | 2027 | iOS + Android |
| Advanced search | LOW | Q1 2027 | Full-text search |
| Offline mode | LOW | Q2 2027 | IndexedDB sync |
| API v2 | INFO | Q3 2027 | GraphQL support |

---

**Last Updated:** 2026-05-21  
**Document Owner:** QA / Product  
**Review Frequency:** Monthly