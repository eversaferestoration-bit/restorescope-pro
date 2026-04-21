# Live QA Testing Checklist

## Pre-Test Setup

- [ ] Published app is accessible at live URL
- [ ] Browser DevTools console open (F12 → Console tab)
- [ ] All test accounts exist in database
- [ ] Using incognito/private window for each test (no cached sessions)
- [ ] Screenshot or note-taking tool ready

---

## Flow 1: Existing User - Completed Onboarding ✓ / ✗

**Account:** flow1@test.com
- [ ] UserProfile exists with onboarding_status = 'onboarding_completed'
- [ ] Company record exists and is linked

**Test:**
- [ ] Login succeeds (no errors)
- [ ] Redirects to `/dashboard`
- [ ] Console shows `[AuthContext] Account state is READY`
- [ ] Dashboard renders fully (no blank areas)
- [ ] Active Jobs section displays
- [ ] Stat cards show numbers (Jobs, Approvals, Sync Errors)
- [ ] No error banners visible

**Result:** ✅ PASS / ❌ FAIL — _______

---

## Flow 2: Existing User - Missing UserProfile ✓ / ✗

**Account:** flow2@test.com
- [ ] User record exists and authenticates
- [ ] NO UserProfile record in database

**Test:**
- [ ] Login succeeds
- [ ] Redirects to `/account-recovery` (not `/dashboard`)
- [ ] Console shows `No UserProfile found`
- [ ] AccountRecovery page displays with readable message
- [ ] "Complete setup" or "Repair & Continue" button visible
- [ ] No blank screen
- [ ] No console errors

**Result:** ✅ PASS / ❌ FAIL — _______

---

## Flow 3: Existing User - Missing Company ✓ / ✗

**Account:** flow3@test.com
- [ ] User record exists
- [ ] UserProfile exists but company_id is null OR points to deleted Company
- [ ] onboarding_status ≠ 'onboarding_completed'

**Test:**
- [ ] Login succeeds
- [ ] Redirects to `/onboarding` (not `/dashboard`)
- [ ] Console shows `Company not found — setup required`
- [ ] Onboarding form displays (company creation step)
- [ ] No blank screen
- [ ] Can proceed through form

**Result:** ✅ PASS / ❌ FAIL — _______

---

## Flow 4: Non-Admin User Login ✓ / ✗

**Account:** user@test.com
- [ ] User record has `role = 'user'` (not 'admin')
- [ ] Complete UserProfile and Company exist
- [ ] onboarding_status = 'onboarding_completed'

**Test:**
- [ ] Login succeeds
- [ ] Redirects to `/dashboard`
- [ ] Dashboard renders fully
- [ ] **RecentActivityWidget NOT visible** (should not appear)
- [ ] UsageStatsWidget IS visible
- [ ] PendingApprovalsWidget IS visible
- [ ] MissingPhotosWidget IS visible
- [ ] SyncErrorsWidget IS visible
- [ ] **No "Forbidden" or "unauthorized" messages** visible
- [ ] No console permission errors

**Result:** ✅ PASS / ❌ FAIL — _______

---

## Flow 5: Admin User Login ✓ / ✗

**Account:** admin@test.com
- [ ] User record has `role = 'admin'`
- [ ] Complete UserProfile and Company exist
- [ ] onboarding_status = 'onboarding_completed'

**Test:**
- [ ] Login succeeds
- [ ] Redirects to `/dashboard`
- [ ] Dashboard renders fully
- [ ] **RecentActivityWidget IS visible** (admin-only)
  - Check: shows audit log entries
- [ ] UsageStatsWidget IS visible
- [ ] All other widgets visible
- [ ] No console errors

**Result:** ✅ PASS / ❌ FAIL — _______

---

## Flow 6: Limited Permissions After RLS Change ✓ / ✗

**Setup (one-time):**
1. [ ] Edit Company entity RLS rules to restrict non-admin read access
2. [ ] Restart app or clear cache
3. [ ] Test with non-admin account

**Account:** restricted@test.com
- [ ] User record has `role = 'user'` (non-admin)
- [ ] Complete UserProfile and Company exist
- [ ] onboarding_status = 'onboarding_completed'

**Test:**
- [ ] Login succeeds
- [ ] Redirects to `/dashboard` (accountState = 'ready')
- [ ] **Dashboard Safe Mode activates:**
  - [ ] Amber warning banner visible: "Some dashboard data could not be loaded"
  - [ ] Message: "We're showing a simplified view while we recover"
- [ ] Minimal fallback UI displays:
  - [ ] Welcome message with user name
  - [ ] Account status (showing "Active")
  - [ ] "Create Your First Job" button
  - [ ] "View All Jobs" link
  - [ ] "Try Again" button
- [ ] Core CTAs are clickable
- [ ] No blank screen
- [ ] No unhandled console errors

**Cleanup:**
- [ ] Restore original Company RLS rules
- [ ] Verify Dashboard works again with restricted@test.com

**Result:** ✅ PASS / ❌ FAIL — _______

---

## Summary Table

| Flow | Login | Redirect | Dashboard | Widgets/Errors | Result |
|------|:-----:|:--------:|:---------:|:--------------:|:------:|
| 1. Completed Onboarding | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | ✅/❌ |
| 2. Missing UserProfile | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | ✅/❌ |
| 3. Missing Company | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | ✅/❌ |
| 4. Non-Admin User | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | ✅/❌ |
| 5. Admin User | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | ✅/❌ |
| 6. Limited Permissions | ✓/✗ | ✓/✗ | ✓/✗ | ✓/✗ | ✅/❌ |

**Overall: ✅ ALL PASS / ❌ FAILURES DETECTED**

---

## Failure Response Protocol

### If Any Flow Fails:

1. **Collect Info:**
   - Screenshot of failure
   - Browser console output (copy full error)
   - Expected vs. actual behavior
   - Account email and setup details

2. **Categorize Failure:**
   - **Auth layer (login fails)** → Check user/auth records, secrets
   - **Redirect wrong** → Check AuthContext.checkAccountState() logic
   - **Dashboard crashes** → Check component/widget errors
   - **Widget error** → Check RLS rules and query syntax
   - **Safe-mode not triggered** → Verify error detection logic

3. **Fix in Code:**
   - Update relevant component/function
   - Test fix locally in dev environment
   - Redeploy to published app
   - Re-run QA flow

4. **Document:**
   - What was broken
   - Why it failed
   - How it was fixed

---

## Sign-Off

**Testing Completed By:** _________________  
**Date:** _________________  
**Overall Status:** ✅ ALL FLOWS PASS / ❌ FAILURES TO FIX

**Notes:**  
_____________________________________________________________________________  
_____________________________________________________________________________