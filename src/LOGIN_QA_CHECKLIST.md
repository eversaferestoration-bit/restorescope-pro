# Login Isolation QA Checklist
**Target Date:** 2026-04-21  
**Tester:** _________  
**Live App URL:** _________  
**Test Results:** ☐ PASS ☐ FAIL  

---

## Flow 1: Existing User with Complete Account
**Precondition:** UserProfile exists + Company exists + onboarding_status = "onboarding_completed"

### Test Steps
- [ ] Open `/login` in incognito/fresh session
- [ ] Enter email + password for **admin-complete** user
- [ ] Confirm login succeeds (no error banner)
- [ ] Confirm redirected to `/dashboard` (NOT `/auth-check`)
- [ ] Confirm Dashboard loads with:
  - [ ] Job list visible
  - [ ] Stats cards present
  - [ ] No loading spinner > 3 seconds
- [ ] Confirm sidebar renders without errors
- [ ] Confirm no console errors

### Expected Outcomes
| Step | Expected | Result |
|------|----------|--------|
| Login submits | No error | ☐ |
| Redirect | `/dashboard` | ☐ |
| Auth-check skipped | N/A | ☐ |
| Dashboard loads | < 3s, all widgets visible | ☐ |
| No loops | Single page load | ☐ |
| No blank screens | Content rendered | ☐ |

### Notes
_________________________________________

---

## Flow 2: Existing User with Missing UserProfile
**Precondition:** Auth token exists + UserProfile NOT found + Company exists  
**Test User:** `missing-profile@test.com` (if available)

### Test Steps
- [ ] Open `/login`
- [ ] Enter email + password for **missing-profile** user
- [ ] Confirm login succeeds
- [ ] Monitor redirect chain: should land on `/account-recovery`
  - [ ] Check ProtectedRoute logic: should detect missing profile
  - [ ] Check AccountRecovery state detection
- [ ] Confirm AccountRecovery shows **"account needs repair"** state
- [ ] Confirm message mentions "profile record is missing"
- [ ] Click **"Retry Repair"** button
- [ ] Confirm UserProfile is created automatically
- [ ] Confirm redirected to `/dashboard`
- [ ] Confirm Dashboard loads successfully

### Expected Outcomes
| Step | Expected | Result |
|------|----------|--------|
| Login | Succeeds | ☐ |
| Redirect chain | `/account-recovery` (NOT `/dashboard`) | ☐ |
| Repair state detected | "No profile found" message shows | ☐ |
| Repair button works | UserProfile created | ☐ |
| Post-repair | Redirected to `/dashboard` | ☐ |
| No loops | Single repair → success | ☐ |

### Notes
_________________________________________

---

## Flow 3: Existing User with Missing Company
**Precondition:** Auth exists + UserProfile exists (company_id = null) + Company NOT found

### Test Steps
- [ ] Open `/login`
- [ ] Enter credentials for **missing-company** user
- [ ] Confirm login succeeds
- [ ] Confirm redirected to `/account-recovery`
- [ ] Confirm AccountRecovery shows **"setup incomplete"** state
- [ ] Confirm message mentions "company setup was never completed"
- [ ] Click **"Complete setup"** button
- [ ] Confirm redirected to `/onboarding` step 2 (company form)
- [ ] Complete company creation form
- [ ] Confirm onboarding progression (step 3 → 4 → 5)
- [ ] Confirm final redirect to `/dashboard`

### Expected Outcomes
| Step | Expected | Result |
|------|----------|--------|
| Login | Succeeds | ☐ |
| Redirect | `/account-recovery` → step 2 message | ☐ |
| Onboarding resumes | Step 2 (company) | ☐ |
| Company created | No errors | ☐ |
| Completion | Redirects to `/dashboard` | ☐ |
| No loops | Linear progression | ☐ |

### Notes
_________________________________________

---

## Flow 4: Existing User with Incomplete Onboarding
**Precondition:** Auth exists + UserProfile exists + onboarding_status ≠ "onboarding_completed"  
**Example Status:** "role_selected" (stuck at step 4)

### Test Steps
- [ ] Open `/login`
- [ ] Enter credentials for **incomplete-onboarding** user
- [ ] Confirm login succeeds
- [ ] Confirm redirected to `/account-recovery`
- [ ] Confirm AccountRecovery shows **"setup incomplete"** or repair state
- [ ] Confirm message matches current onboarding status
- [ ] Click **"Resume setup"** or **"Continue to Setup"** button
- [ ] Confirm redirected to `/onboarding` at correct resumption step
- [ ] Complete remaining steps
- [ ] Confirm final redirect to `/dashboard`
- [ ] Confirm onboarding_status updated to "onboarding_completed"

### Expected Outcomes
| Step | Expected | Result |
|------|----------|--------|
| Login | Succeeds | ☐ |
| Redirect | `/account-recovery` with correct state | ☐ |
| Resume button | Redirects to `/onboarding` at correct step | ☐ |
| Step progression | Can advance through remaining steps | ☐ |
| Completion | Dashboard accessible, status updated | ☐ |
| No loops | Linear to completion | ☐ |

### Notes
_________________________________________

---

## Flow 5: Non-Admin User
**Precondition:** UserProfile.role = "user" (non-admin)

### Test Steps
- [ ] Open `/login`
- [ ] Enter credentials for **non-admin** user
- [ ] Confirm login succeeds
- [ ] Confirm redirected to `/dashboard`
- [ ] Confirm Dashboard loads (Jobs, estimates visible)
- [ ] Navigate to `/settings`
- [ ] Confirm **Admin Tools** section NOT visible
  - [ ] No "Account Repair Tool" button
  - [ ] No "Beta Management" links
- [ ] Navigate to `/billing`
- [ ] Confirm page accessible (no permission error)
- [ ] Confirm no admin-only UI elements visible

### Expected Outcomes
| Step | Expected | Result |
|------|----------|--------|
| Login | Succeeds | ☐ |
| Dashboard | Loads for non-admin | ☐ |
| Settings | Admin tools hidden | ☐ |
| Role barrier | No permission errors on standard pages | ☐ |
| UI consistency | Page renders, RLS prevents data leak | ☐ |

### Notes
_________________________________________

---

## Flow 6: Admin User
**Precondition:** UserProfile.role = "admin"

### Test Steps
- [ ] Open `/login`
- [ ] Enter credentials for **admin** user
- [ ] Confirm login succeeds
- [ ] Confirm redirected to `/dashboard`
- [ ] Navigate to `/settings`
- [ ] Confirm **Admin Tools** section IS visible
  - [ ] "Account Repair Tool" button present
  - [ ] "Reset Onboarding Checklist" visible
- [ ] Navigate to `/audit-log`
- [ ] Confirm AuditLog page loads
- [ ] Navigate to `/enterprise`
- [ ] Confirm Enterprise Settings page loads
- [ ] Navigate to `/beta-admin`
- [ ] Confirm Beta Admin page loads (invite generation)

### Expected Outcomes
| Step | Expected | Result |
|------|----------|--------|
| Login | Succeeds | ☐ |
| Dashboard | Loads | ☐ |
| Admin section visible | All admin tools present | ☐ |
| Admin pages accessible | `/audit-log`, `/enterprise`, `/beta-admin` | ☐ |
| No permission errors | Clean render | ☐ |

### Notes
_________________________________________

---

## Critical Checks (All Flows)

### ✅ No Redirect Loops
- [ ] Monitor URL bar during login → onboarding/dashboard progression
- [ ] No infinite redirects (use DevTools Network tab, check for repeat 301/302 requests)
- [ ] Each page loads once, not repeatedly

### ✅ No Blank Screens
- [ ] Every page shows content or clear error message
- [ ] No completely empty `<div>` with spinning loader forever
- [ ] If loader visible > 5 seconds, note as failure

### ✅ Readable Error Messages
- [ ] All error messages use plain English, not error codes
- [ ] Message explains **what happened** (e.g., "profile missing")
- [ ] Message suggests **next action** (e.g., "Continue to Setup")
- [ ] Email shown in footer for context

### ✅ Auth-Check Functionality
- [ ] `/auth-check` page loads when triggered manually
- [ ] Shows session, user, profile, company, onboarding statuses
- [ ] Displays correct checkmarks/errors for current state
- [ ] Debug info shows user email + company ID
- [ ] Retry button re-checks and updates status

### ✅ Console Errors
- [ ] Open DevTools Console (F12)
- [ ] Confirm no red errors during login → dashboard progression
- [ ] Warnings OK, but errors must be investigated

---

## Summary

| Flow | Status | Issues | Notes |
|------|--------|--------|-------|
| 1. Complete Account | ☐ | | |
| 2. Missing Profile | ☐ | | |
| 3. Missing Company | ☐ | | |
| 4. Incomplete Onboarding | ☐ | | |
| 5. Non-Admin User | ☐ | | |
| 6. Admin User | ☐ | | |
| **Loops/Blanks/Errors** | ☐ | | |

**Overall Result:** ☐ PASS ☐ FAIL

**Blocker Issues Found:**
- _________________________________________
- _________________________________________
- _________________________________________

**Next Steps:**
- _________________________________________