# Auth Code Audit Report
**Date:** 2026-04-21  
**Focus:** Login isolation, redirect loops, blank screens, error messages

---

## Code Flow Analysis

### 1. AuthContext.checkUserAuth() → ProtectedRoute → App routing

```
[Login.jsx] → base44.auth.me() → AuthContext.checkUserAuth()
                                    ↓
                            [checkAccountState()]
                                    ↓
                        Sets: accountState, accountStateChecked
                                    ↓
                            [ProtectedRoute checks]
                                    ↓
                    Routes to: /dashboard | /onboarding | /account-recovery | /auth-check
```

**AUDIT FINDINGS:**

#### ✅ GOOD
1. **Repair on startup** (AuthContext line 77-91):
   - `checkUserAuth()` catches missing profiles early
   - `repairMissingUserProfile()` auto-creates UserProfile if not found
   - Prevents immediate `/account-recovery` redirect for recoverable cases

2. **ProtectedRoute gating** (ProtectedRoute.jsx):
   - Checks `accountStateChecked` before allowing route access
   - Detects `accountState === 'incomplete'` → sends to `/account-recovery`
   - Prevents blank dashboard loads

3. **AccountRecovery state machine** (AccountRecovery.jsx):
   - Separate states: NO_PROFILE_HAS_COMPANY, NO_PROFILE_NO_COMPANY, ONBOARDING_INCOMPLETE
   - Each state has distinct recovery path
   - UI messages clearly explain problem + next action

4. **Stale time optimization** (Dashboard.jsx):
   - Pending approvals/sync errors queries have `staleTime: 2 * 60 * 1000`
   - Reduces refetch storms during rapid account state changes

#### ⚠️ POTENTIAL ISSUES

**Issue 1: checkAccountState() may fail silently**
- **Location:** AuthContext.jsx line 50-75
- **Problem:** If Company lookup fails (RLS error, network timeout), function catches but doesn't clear loading state
- **Risk:** User sees spinner indefinitely
- **Fix Needed:** Ensure `setAccountStateChecked(true)` called even on error

**Issue 2: ProtectedRoute doesn't handle null accountState**
- **Location:** ProtectedRoute.jsx line 30-35
- **Problem:** If `accountState === null` (rare edge case), falls through to "redirect to login"
- **Risk:** Complete account gets redirected to login loop
- **Fix Needed:** Add explicit "accountState === 'ready'" check before allowing access

**Issue 3: AccountRecovery.diagnose() may loop on repair failure**
- **Location:** AccountRecovery.jsx line 50-100
- **Problem:** `retryCount` increments, but user can spam "Retry" button
- **Risk:** Multiple failed repairs before seeing "contact support" warning
- **Fix Needed:** Add cooldown timer or disable button after 3 attempts

**Issue 4: useQuery enabled gates may not re-enable**
- **Location:** Dashboard.jsx (Pending approvals, sync errors)
- **Problem:** If `userProfileId` becomes null (logout), queries stay disabled
- **Risk:** If user logs out and logs back in same session, queries never re-fetch
- **Fix Needed:** Add dependency on auth/user state to reset queries

**Issue 5: Missing error boundary for dashboard widgets**
- **Location:** Dashboard.jsx widgets (PendingApprovalsWidget, etc.)
- **Problem:** If individual widget query fails, only that widget shows error toast
- **Risk:** Partial render with missing sections looks incomplete
- **Fix Needed:** Ensure all widget error states match (consistent "Unable to load" message)

---

## Flow-by-Flow Logic Trace

### Flow 1: Existing User with Complete Account ✅
```
[Login] → POST login → checkUserAuth()
  → base44.auth.me() [SUCCESS]
  → checkAccountState()
    → UserProfile exists [SUCCESS]
    → Company exists [SUCCESS]
    → onboarding_status = "onboarding_completed" [SUCCESS]
  → setAccountState('ready')
  → ProtectedRoute: accountState === 'ready' → children rendered
  → Dashboard loads
```
**Expected:** Direct to dashboard ✅

---

### Flow 2: Existing User with Missing UserProfile ⚠️
```
[Login] → POST login → checkUserAuth()
  → base44.auth.me() [SUCCESS]
  → repairMissingUserProfile() [AUTO-CREATES]
  → checkAccountState()
    → UserProfile now exists [SUCCESS]
    → Check onboarding status → likely 'account_created'
  → setAccountState('incomplete')
  → ProtectedRoute: accountState === 'incomplete' → redirect to /account-recovery
  → AccountRecovery.diagnose()
    → Checks for company by email
    → If company found: NO_PROFILE_HAS_COMPANY state
    → Show "Retry Repair" button
    → handleRepairAndResume() updates profile → dashboard
```
**Issue:** If repair() fails, retryCount increments but no cooldown  
**Expected:** Account recovery OR support contact info ⚠️

---

### Flow 3: Existing User with Missing Company 🔴
```
[Login] → POST login → checkUserAuth()
  → base44.auth.me() [SUCCESS]
  → checkAccountState()
    → UserProfile exists [SUCCESS]
    → profile.company_id = null → check Company [NOT FOUND]
  → setAccountState('setup_required')
  → ProtectedRoute: accountState === 'setup_required' → redirect to /onboarding
  → Onboarding loads at step 1 (but should be step 2?)
```
**Issue:** Code redirects to `/onboarding` but doesn't specify which step to resume  
**Expected:** Should resume at step 2 (company creation) 🔴

---

### Flow 4: Incomplete Onboarding 🔴
```
[Login] → POST login → checkUserAuth()
  → checkAccountState()
    → UserProfile exists, onboarding_status = 'role_selected' (step 4)
  → But checkAccountState() marks as 'incomplete' [generic]
  → ProtectedRoute → /account-recovery
  → AccountRecovery.diagnose()
    → Finds onboarding incomplete
    → Shows "Resume setup" button
    → Redirects to /onboarding (step 1, not step 4!)
```
**Issue:** resume logic doesn't preserve `current_onboarding_step`  
**Expected:** Should jump to step 4 directly 🔴

---

### Flow 5: Non-Admin User ✅
```
[Login] → complete account flow
  → Dashboard renders
  → RLS on AuditLog query → query errors → widget hides gracefully
  → Settings page: Admin tools section hidden (role check)
```
**Expected:** Standard user sees standard UI ✅

---

### Flow 6: Admin User ✅
```
[Login] → complete account flow
  → Dashboard renders
  → RLS on AuditLog query → SUCCEEDS (admin role)
  → RecentActivityWidget loads and shows logs
  → Settings page: Admin section visible
```
**Expected:** Admin sees admin UI ✅

---

## Priority Fixes

### 🔴 CRITICAL
1. **Flow 3 & 4:** Onboarding resume doesn't preserve step number
   - **File:** pages/Onboarding.jsx
   - **Fix:** Check `profile.current_onboarding_step` on mount and set initial step
   - **Impact:** Users stuck in incomplete state redirected to step 1 instead of resume point

2. **ProtectedRoute:** Null accountState handling
   - **File:** lib/ProtectedRoute.jsx
   - **Fix:** Add explicit check for `accountState === 'ready'` before allowing access
   - **Impact:** Edge case could trap complete accounts

### ⚠️ HIGH
3. **AccountRecovery repair loop:**
   - **File:** pages/AccountRecovery.jsx
   - **Fix:** Add retry cooldown (disable button for 3 sec after attempt) or max 3 retries
   - **Impact:** Users spam repair button, creates confusion

4. **Widget error consistency:**
   - **Files:** Dashboard.jsx, all widget components
   - **Fix:** Ensure all "Unable to load" messages match exactly
   - **Impact:** Dashboard looks fragmented if multiple queries fail

### ℹ️ MEDIUM
5. **Query re-enable on auth change:**
   - **File:** Dashboard.jsx
   - **Fix:** Add auth state as dependency to re-enable disabled queries
   - **Impact:** Low—only affects logout/re-login in same session

---

## Test Execution Recommendations

### Before Testing
1. **Setup test accounts:**
   - ✅ admin-complete (full setup, admin)
   - ❌ missing-profile (profile deleted, company exists)
   - ❌ missing-company (profile.company_id = null)
   - ❌ incomplete-role (onboarding_status = 'role_selected')
   - ✅ user-complete (full setup, non-admin role)
   - ✅ admin-complete (full setup, admin role)

2. **Clear session:**
   - Open incognito mode for each test
   - Clear localStorage/sessionStorage
   - Check browser DevTools Console before each flow

### During Testing
1. **Monitor redirect chain:**
   - Use DevTools Network tab
   - Check for 301/302 repeats (loop indicator)
   - Note final landing URL

2. **Check error states:**
   - Read error message text (copy-paste into notes)
   - Confirm it explains problem + next action
   - Confirm email shown in footer

3. **Performance:**
   - Note load time for each page
   - Flag if spinner visible > 3 seconds
   - Check console for network errors

### After Testing
1. **Document all failures:**
   - Screenshot page state
   - Copy console error (if any)
   - Note exact redirect chain (URL 1 → URL 2 → ...)
   - Estimate user confusion level (1-5)

2. **Classify:**
   - **Blocker:** Redirect loop, blank screen, crash
   - **High:** Wrong error message, wrong page
   - **Medium:** Slow load, minor UX issue
   - **Low:** Polish, wording

---

## Verification Checklist

After fixes applied, re-test:

- [ ] Flow 1: Complete account reaches dashboard on first login
- [ ] Flow 2: Missing profile auto-repaired → dashboard
- [ ] Flow 3: Missing company redirects to step 2 of onboarding
- [ ] Flow 4: Incomplete onboarding resumes at correct step (not step 1)
- [ ] Flow 5: Non-admin user can view dashboard, no admin tools
- [ ] Flow 6: Admin user can view dashboard + admin pages
- [ ] No redirect loops (monitor Network tab)
- [ ] No blank screens (all pages show content or error)
- [ ] Error messages readable and actionable
- [ ] Console clean (no red errors)