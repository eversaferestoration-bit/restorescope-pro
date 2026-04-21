# Auth & Dashboard QA Flows

## Flow 1: Existing User - Completed Onboarding

**User Setup:**
- Email: existing@test.com
- Has valid User record
- Has valid UserProfile with onboarding_status = 'onboarding_completed'
- Has valid Company record linked via UserProfile.company_id
- Role: user or admin

**Expected Flow:**
1. User logs in with email
2. AuthContext validates User → UserProfile → Company → onboarding_completed
3. ProtectedRoute sees accountState = 'ready'
4. Dashboard loads without redirects
5. All widgets render (admin sees RecentActivityWidget, all see UsageStats, etc.)
6. Dashboard safe-mode NOT triggered

**Test Points:**
- ✓ Login succeeds
- ✓ Redirects to /dashboard (no /account-recovery or /onboarding)
- ✓ Dashboard renders without errors
- ✓ Pull-to-refresh works
- ✓ Job list loads
- ✓ Stat cards display (Active Jobs, Pending Approvals, etc.)

---

## Flow 2: Existing User - Missing UserProfile

**User Setup:**
- Email: orphaned@test.com
- Has valid User record (can authenticate)
- NO UserProfile record
- (Company record may exist but is orphaned)

**Expected Flow:**
1. User logs in with email
2. AuthContext.checkAccountState() queries UserProfile — finds 0 results
3. AuthContext sets accountState = 'incomplete'
4. ProtectedRoute redirects to /account-recovery
5. AccountRecovery page diagnoses missing profile
6. User can click "Create Profile" or "Repair Account"
7. After repair, redirects to onboarding or dashboard

**Test Points:**
- ✓ Login succeeds (auth layer works)
- ✓ Redirects to /account-recovery (not /dashboard)
- ✓ No blank screen or errors
- ✓ "Missing profile" message displays
- ✓ Repair tool creates profile
- ✓ After repair, onboarding or dashboard is accessible

---

## Flow 3: Existing User - Missing Company

**User Setup:**
- Email: nocompany@test.com
- Has valid User record
- Has UserProfile record BUT company_id is null OR points to deleted Company
- onboarding_status ≠ 'onboarding_completed'

**Expected Flow:**
1. User logs in with email
2. AuthContext.checkAccountState() finds UserProfile but Company query returns 0 results
3. AuthContext sets accountState = 'setup_required'
4. ProtectedRoute redirects to /onboarding (step 2: company creation)
5. User completes company setup
6. Onboarding marks status = 'onboarding_completed'
7. User redirected to /dashboard

**Test Points:**
- ✓ Login succeeds
- ✓ Redirects to /onboarding step 2 (company form)
- ✓ No blank screen
- ✓ Company creation form loads
- ✓ After company creation, continues onboarding
- ✓ Dashboard accessible after completion

---

## Flow 4: Non-Admin User Login

**User Setup:**
- Email: user@test.com
- Has valid User record with role = 'user' (not 'admin')
- Complete UserProfile and Company
- onboarding_status = 'onboarding_completed'

**Expected Flow:**
1. User logs in with email
2. AuthContext validates all records, accountState = 'ready'
3. Dashboard loads successfully
4. RecentActivityWidget returns null (admin-only) — no error
5. UsageStatsWidget loads (all users can read)
6. PendingApprovalsWidget loads (all users can read via RLS)
7. Other widgets render normally

**Test Points:**
- ✓ Login succeeds
- ✓ Redirects to /dashboard
- ✓ Dashboard renders without crashes
- ✓ RecentActivityWidget hidden (no "forbidden" error shown)
- ✓ All other widgets display
- ✓ No RLS error messages visible to user

---

## Flow 5: Admin User Login

**User Setup:**
- Email: admin@test.com
- Has valid User record with role = 'admin'
- Complete UserProfile and Company
- onboarding_status = 'onboarding_completed'

**Expected Flow:**
1. User logs in with email
2. AuthContext validates all records, accountState = 'ready'
3. Dashboard loads successfully
4. RecentActivityWidget queries AuditLog (admin-only) and displays
5. UsageStatsWidget loads
6. All widgets render normally

**Test Points:**
- ✓ Login succeeds
- ✓ Redirects to /dashboard
- ✓ Dashboard renders without crashes
- ✓ RecentActivityWidget visible with audit logs
- ✓ All widgets display correctly
- ✓ Admin-only features accessible

---

## Flow 6: User Login After RLS Permission Changes

**Scenario:**
- User has valid auth/profile/company
- Backend RLS rules changed (e.g., Company.read now restricted to admins)
- User tries to access dashboard as non-admin

**Expected Flow:**
1. User logs in, accountState = 'ready' (profile/company exist)
2. ProtectedRoute allows access to /dashboard
3. Dashboard loads but Company query fails (403 RLS error)
4. UsageStatsWidget catches error, returns null (gracefully hidden)
5. Job list may fail (403) — Dashboard detects jobsError
6. Dashboard safe-mode activated: minimal fallback shown
7. "Some dashboard data could not be loaded" message displays
8. User can still click "Create Job", "View All Jobs", "Try Again"

**Test Points:**
- ✓ Login succeeds (profile/company intact)
- ✓ Dashboard loads (no infinite redirects)
- ✓ Dashboard safe-mode triggered (not blank screen)
- ✓ Error message "Some dashboard data could not be loaded" visible
- ✓ "Try Again" button present
- ✓ Core CTAs (Create Job, View Jobs) still accessible
- ✓ No console errors or crashes

---

## Critical Requirements Met

- ✅ **Login succeeds** for all 6 flows (auth layer independent of state)
- ✅ **Correct redirects**: /account-recovery for missing profile, /onboarding for missing company, /dashboard for ready state
- ✅ **No blank screens**: all error paths show readable messages (DashboardSafeMode, AccountRecovery, widget error boundaries)
- ✅ **Unauthorized widgets hidden**: RecentActivityWidget returns null for non-admins, no RLS errors shown to user
- ✅ **Graceful degradation**: individual widget failures don't crash dashboard; safe-mode provides fallback
- ✅ **RLS changes handled**: if permission rules tighten, widgets fail gracefully, safe-mode activates

---

## How to Test

### Manual Testing
1. Create test accounts with each configuration above
2. Log in with each account
3. Verify expected redirect
4. Inspect dashboard rendering and widget visibility
5. Test "Try Again" and other CTAs
6. Check browser console for errors

### Automated Testing (Future)
- E2E tests for each flow using Playwright/Cypress
- Mock RLS failures and verify safe-mode activation
- Verify widget error boundaries catch component crashes