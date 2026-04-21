# Live QA Testing Guide — 6 Auth Flows

## Prerequisites

- Have access to the live published app
- Browser DevTools console open (F12)
- Test accounts already set up in database matching each flow below
- Incognito/Private window for each test (to avoid cached sessions)

---

## Flow 1: Existing User - Completed Onboarding

**Test Account Setup:**
- Email: `flow1@test.com` (or any existing completed user)
- Has valid User record
- Has UserProfile with onboarding_status = `'onboarding_completed'`
- Has valid Company linked via profile.company_id

**Test Steps:**

1. Open incognito window, navigate to login page
2. Enter email `flow1@test.com` and sign in
3. **Verify:**
   - ✅ Login succeeds (no 401/403 errors)
   - ✅ Redirects to `/dashboard` (not `/account-recovery` or `/onboarding`)
   - ✅ Console shows: `[AuthContext] Account state is READY`
   - ✅ Dashboard renders without blank areas
   - ✅ Job list displays (Active Jobs section shows jobs or empty state)
   - ✅ Stat cards show numbers (Active Jobs, Pending Approvals, Sync Errors, Total Jobs)
   - ✅ No red error banners (safe-mode NOT activated)

**Expected Console Output:**
```
[AuthContext] User loaded. Email (normalized): flow1@test.com | Role: user/admin
[AuthContext] Checking account state for user: <id>
[AuthContext] UserProfile found: <profile_id>
[AuthContext] Company found: <company_id>
[AuthContext] Account state is READY
```

**Result:** ✅ PASS / ❌ FAIL

---

## Flow 2: Existing User - Missing UserProfile

**Test Account Setup:**
- Email: `flow2@test.com`
- Has valid User record (can authenticate)
- **NO UserProfile record**
- (Any company record is orphaned/irrelevant)

**Test Steps:**

1. Open incognito window, navigate to login page
2. Enter email `flow2@test.com` and sign in
3. **Verify:**
   - ✅ Login succeeds (auth layer works)
   - ✅ Redirects to `/account-recovery` (not `/dashboard`)
   - ✅ Console shows: `[AuthContext] No UserProfile found — redirecting to account-recovery`
   - ✅ AccountRecovery page displays with message: "Setup incomplete" or "Account needs repair"
   - ✅ Readable CTA button visible (e.g., "Complete setup" or "Repair & Continue")
   - ✅ No blank screen or console errors

**Expected Console Output:**
```
[AuthContext] User loaded. Email (normalized): flow2@test.com | Role: user
[AuthContext] Checking account state for user: <id>
[AuthContext] No UserProfile found — redirecting to account-recovery
```

**Recovery Actions (Optional - test if fixing accounts):**
- Click "Complete setup" → should redirect to `/onboarding`
- Click "Repair & Continue" → should auto-repair and redirect to dashboard

**Result:** ✅ PASS / ❌ FAIL

---

## Flow 3: Existing User - Missing Company

**Test Account Setup:**
- Email: `flow3@test.com`
- Has valid User record
- Has UserProfile but:
  - `company_id` is `null` OR
  - `company_id` points to deleted Company
  - `onboarding_status` ≠ `'onboarding_completed'`

**Test Steps:**

1. Open incognito window, navigate to login page
2. Enter email `flow3@test.com` and sign in
3. **Verify:**
   - ✅ Login succeeds (auth layer works)
   - ✅ Redirects to `/onboarding` (not `/dashboard`)
   - ✅ Console shows: `[AuthContext] Company not found — setup required`
   - ✅ Onboarding form displays (step 2: company creation)
   - ✅ No blank screen or console errors
   - ✅ Can fill out company form and continue

**Expected Console Output:**
```
[AuthContext] User loaded. Email (normalized): flow3@test.com | Role: user
[AuthContext] Checking account state for user: <id>
[AuthContext] UserProfile found: <profile_id>
[AuthContext] Company not found — setup required
```

**Result:** ✅ PASS / ❌ FAIL

---

## Flow 4: Non-Admin User Login

**Test Account Setup:**
- Email: `user@test.com` (or any existing user)
- User record has **`role = 'user'`** (not 'admin')
- Has complete UserProfile and Company
- `onboarding_status = 'onboarding_completed'`

**Test Steps:**

1. Open incognito window, sign in with `user@test.com`
2. **Verify:**
   - ✅ Login succeeds
   - ✅ Redirects to `/dashboard`
   - ✅ Dashboard renders without errors
   - ✅ **RecentActivityWidget is NOT visible** (admin-only)
   - ✅ UsageStatsWidget is visible (all users can read)
   - ✅ PendingApprovalsWidget is visible
   - ✅ MissingPhotosWidget is visible
   - ✅ SyncErrorsWidget is visible
   - ✅ **No "Forbidden" or "unauthorized" error messages** visible to user
   - ✅ No console errors related to RLS or permissions

**Check Specific Widgets:**
- Scroll down and verify "Recent Activity" widget does NOT appear
- Verify "Usage Stats" section displays on the right side
- Verify no red error banners

**Result:** ✅ PASS / ❌ FAIL

---

## Flow 5: Admin User Login

**Test Account Setup:**
- Email: `admin@test.com` (or any existing admin)
- User record has **`role = 'admin'`**
- Has complete UserProfile and Company
- `onboarding_status = 'onboarding_completed'`

**Test Steps:**

1. Open incognito window, sign in with `admin@test.com`
2. **Verify:**
   - ✅ Login succeeds
   - ✅ Redirects to `/dashboard`
   - ✅ Dashboard renders without errors
   - ✅ **RecentActivityWidget IS visible** (admin-only)
     - Check: "Recent Activity" section displays audit log entries (created, updated, etc.)
   - ✅ UsageStatsWidget is visible
   - ✅ All other widgets visible
   - ✅ No console errors

**Check Admin-Only Features:**
- Scroll down right side of dashboard
- "Recent Activity" widget should show recent actions (created, updated, deleted, etc.)
- Each log entry should show: action type, description, actor email, timestamp

**Result:** ✅ PASS / ❌ FAIL

---

## Flow 6: Limited Permissions After RLS Change

**Simulating RLS Permission Tightening:**

This flow tests the graceful degradation when RLS rules change and restrict access.

**Test Account Setup:**
- Email: `restricted@test.com` (existing user with complete setup)
- Has valid User, UserProfile, Company
- `onboarding_status = 'onboarding_completed'`
- (In real scenario, backend RLS rules change to deny this user access)

**To Simulate (Database Edit Required):**

Temporarily update the `Company` entity's RLS read rule to deny non-admins:
```json
"rls": {
  "read": {
    "user_condition": {
      "role": "admin"
    }
  }
}
```

Then test:

**Test Steps:**

1. Open incognito window, sign in with `restricted@test.com` (non-admin)
2. **Verify:**
   - ✅ Login succeeds (auth/profile checks pass)
   - ✅ Redirects to `/dashboard` (accountState = 'ready')
   - ✅ Dashboard page loads (no infinite redirects)
   - ✅ **Dashboard Safe Mode activates:**
     - Amber warning banner visible: "Some dashboard data could not be loaded"
     - Message: "We're showing a simplified view while we recover"
   - ✅ Minimal fallback UI displays:
     - Welcome message with user name
     - Account status (showing "Active")
     - "Create Your First Job" button
     - "View All Jobs" link
     - "Try Again" button
   - ✅ Core CTAs are clickable (Create Job, View Jobs, etc.)
   - ✅ No blank screen
   - ✅ No unhandled console errors

**Expected Behavior:**
- `jobsError` detected (Company.read returns 403)
- Dashboard detects error and calls `setSafeMode(true)`
- DashboardSafeMode component renders
- User can still perform basic actions (create job, view jobs, retry)

**Revert RLS Changes:**
After testing, restore original RLS rules:
```json
"rls": {
  "read": {
    "data.id": "{{user.company_id}}"
  }
}
```

**Result:** ✅ PASS / ❌ FAIL

---

## Consolidated Test Results

| Flow | Login | Redirect | Dashboard | Widgets | Error Handling | Overall |
|------|-------|----------|-----------|---------|---|---|
| 1. Completed Onboarding | ✓ | ✓ | ✓ | ✓ | ✓ | ✅/❌ |
| 2. Missing UserProfile | ✓ | ✓ | ✓ | N/A | ✓ | ✅/❌ |
| 3. Missing Company | ✓ | ✓ | ✓ | N/A | ✓ | ✅/❌ |
| 4. Non-Admin User | ✓ | ✓ | ✓ | ✓ | ✓ | ✅/❌ |
| 5. Admin User | ✓ | ✓ | ✓ | ✓ | ✓ | ✅/❌ |
| 6. Limited Permissions | ✓ | ✓ | ✓ | ✓ | ✓ | ✅/❌ |

---

## Debugging Failures

### If Login Fails
- Check browser console for auth errors
- Verify user email exists in database
- Verify User record is not deleted (`is_deleted = false`)

### If Dashboard Redirects to Wrong Page
- Check console logs: look for `[AuthContext]` messages
- Verify UserProfile and Company records exist and are linked
- Verify `onboarding_status` value in database

### If Dashboard Crashes / Blank Screen
- Open DevTools console (F12)
- Look for JavaScript errors
- Check Network tab for 403/404 responses
- Verify all entity RLS rules are correct

### If Widget Shows "Unable to Load" Error
- Verify RLS rules for that entity
- Check if user has read permission
- Verify entity query syntax is correct

### If Safe Mode Not Triggered
- Verify Company.read RLS is actually restricted
- Check that `jobsError` is being set
- Verify Dashboard detects `jobsError && jobsError` condition

---

## Success Criteria

✅ **All 6 flows complete successfully when:**
1. Login succeeds for all roles/states
2. Redirects are correct (dashboard/onboarding/account-recovery)
3. No blank screens anywhere
4. All widgets render or gracefully hide
5. Error messages are readable and helpful
6. Safe mode activates when RLS restricts access
7. No unhandled JavaScript errors in console
8. Core CTAs are always accessible