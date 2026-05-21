# Final QA Checklist — Production Release

**Date:** 2026-05-21  
**Version:** 1.0 Production-Ready  
**Status:** Ready for production deployment

---

## 🎯 CORE FUNCTIONALITY

### Job Management
- [ ] **Create Job**
  - [ ] Form validates job_number, loss_type, service_type
  - [ ] Cannot proceed without company_id
  - [ ] Job number auto-generates or custom entered
  - [ ] No duplicate jobs on double-click
  - [ ] Success redirects to job detail page
  - [ ] Error message shown on failure with retry option

- [ ] **List Jobs**
  - [ ] All jobs displayed with pagination
  - [ ] Search by job number, loss type, status filters results
  - [ ] Pull-to-refresh works on mobile
  - [ ] Loading spinner shown while fetching
  - [ ] No jobs message when list empty
  - [ ] Emergency flag shows badge
  - [ ] Links to job detail on click

- [ ] **View Job**
  - [ ] All job fields load and display
  - [ ] Tabs (Overview, Property, Readings, etc.) functional
  - [ ] Company isolation: cannot view another company's job
  - [ ] Created date, creator email shown in audit trail
  - [ ] Back button returns to job list

- [ ] **Update Job**
  - [ ] Edit job fields and save
  - [ ] Changes reflected immediately in UI
  - [ ] Audit log records mutation with changed fields
  - [ ] Validation prevents invalid state changes
  - [ ] Role-based restrictions enforced (Technicians cannot edit status)
  - [ ] Concurrent edits: last write wins

### Dashboard
- [ ] **Home Page Loads**
  - [ ] All metric cards display
  - [ ] Charts render without errors
  - [ ] Links to RestoreReach modules work
  - [ ] Profile completion status shown

- [ ] **RestoreReach Module**
  - [ ] GBP Command loads company profile
  - [ ] Storm Mode shows active events
  - [ ] Lead Capture form submits
  - [ ] Service Areas map displays
  - [ ] Visibility Score calculated correctly
  - [ ] Analytics charts update on pull-to-refresh

---

## 🔐 SECURITY & ACCESS CONTROL

### Authentication
- [ ] **Login Flow**
  - [ ] User can log in with valid credentials
  - [ ] Invalid credentials show error
  - [ ] Session persists across page reloads
  - [ ] Logout clears session and redirects to login

- [ ] **Authorization**
  - [ ] Authenticated user can access protected pages
  - [ ] Unauthenticated user redirected to login
  - [ ] Expired session redirected to login with message
  - [ ] 401/403 errors handled gracefully

### Company Isolation
- [ ] **Data Access**
  - [ ] User can only view their company's jobs
  - [ ] Cannot access another company's job by ID
  - [ ] Entity filters enforce company_id
  - [ ] Audit log shows company_id for all operations

- [ ] **Backend Validation**
  - [ ] Job creation requires company_id
  - [ ] Backend validates user belongs to job's company
  - [ ] Job update rejects if user not in company
  - [ ] Delete operations check company ownership

### Role-Based Access
- [ ] **Technician**
  - [ ] Can view jobs assigned to them
  - [ ] Can update job observations, readings, equipment
  - [ ] Cannot edit job status
  - [ ] Cannot edit emergency_flag, after_hours_flag

- [ ] **Estimator**
  - [ ] Can view assigned jobs
  - [ ] Can create and edit estimates
  - [ ] Cannot edit manager-only fields
  - [ ] Cannot change job status

- [ ] **Manager**
  - [ ] Can view all company jobs
  - [ ] Can create and edit jobs
  - [ ] Can assign technicians
  - [ ] Can approve estimates

- [ ] **Admin**
  - [ ] Can view all jobs
  - [ ] Can edit any field
  - [ ] Can manage users
  - [ ] Can access audit logs

---

## ⚙️ DATA INTEGRITY

### Database Operations
- [ ] **Create**
  - [ ] New records assigned unique ID
  - [ ] created_date set automatically
  - [ ] created_by captures user email
  - [ ] company_id required and populated
  - [ ] is_deleted defaults to false

- [ ] **Update**
  - [ ] updated_date set on modification
  - [ ] Original created_by preserved
  - [ ] Company_id cannot be changed
  - [ ] Soft delete sets is_deleted: true
  - [ ] Restore sets is_deleted: false

- [ ] **Delete**
  - [ ] Records marked as deleted, not removed
  - [ ] Deleted records excluded from queries
  - [ ] Audit log records delete action
  - [ ] Undelete capability available to admins

### Data Validation
- [ ] **Frontend Validation**
  - [ ] Required fields marked with *
  - [ ] Input types validated (date, number, email)
  - [ ] Error messages appear below fields
  - [ ] Form cannot submit until errors resolved
  - [ ] Cleared on successful submission

- [ ] **Backend Validation**
  - [ ] Missing required fields rejected (400)
  - [ ] Invalid company_id rejected (403)
  - [ ] Unauthorized users rejected (403)
  - [ ] Duplicate IDs prevented
  - [ ] Database constraints enforced

---

## 🎨 USER INTERFACE

### Responsive Design
- [ ] **Desktop (1200px+)**
  - [ ] Full layout with sidebars
  - [ ] All columns visible in tables
  - [ ] Touch targets minimum 44x44px
  - [ ] No horizontal scroll

- [ ] **Tablet (768px - 1199px)**
  - [ ] Navigation responsive
  - [ ] Grid layouts collapse to 2 columns
  - [ ] Modals centered and scrollable
  - [ ] Touch targets minimum 44x44px

- [ ] **Mobile (< 768px)**
  - [ ] Navigation as hamburger menu
  - [ ] Grid layouts collapse to 1 column
  - [ ] Modals full-screen with scroll
  - [ ] Buttons padded for touch
  - [ ] No horizontal overflow

### Loading States
- [ ] **Page Loading**
  - [ ] Skeleton loaders shown while fetching
  - [ ] Spinner centered with "Loading..." message
  - [ ] Clear indication data is being loaded
  - [ ] No flickering between states

- [ ] **Form Submission**
  - [ ] Submit button disabled while saving
  - [ ] Button text changes to "Creating...", "Saving...", etc.
  - [ ] User cannot double-submit
  - [ ] Loading state clears on success or error

- [ ] **Query Refresh**
  - [ ] Pull-to-refresh gesture works on mobile
  - [ ] Refresh button available on desktop
  - [ ] Loading indicator shown during refresh
  - [ ] No duplicate requests

### Error Handling
- [ ] **User-Facing Errors**
  - [ ] Clear message describing what went wrong
  - [ ] Actionable suggestions (e.g., "Try again" button)
  - [ ] No technical jargon or stack traces
  - [ ] Errors dismissed on action

- [ ] **Validation Errors**
  - [ ] Inline messages below field
  - [ ] Red border on invalid fields
  - [ ] Focus moves to first error
  - [ ] Errors cleared when field corrected

---

## 🚀 PERFORMANCE

### Load Times
- [ ] **Initial Page Load** (< 3s on 4G)
  - [ ] HTML rendered
  - [ ] CSS styled
  - [ ] JS executed
  - [ ] Data fetched
  - [ ] UI interactive

- [ ] **Query Performance** (< 500ms)
  - [ ] Jobs list query
  - [ ] Job detail load
  - [ ] Search results
  - [ ] Dashboard metrics

- [ ] **Modal Open** (< 200ms)
  - [ ] Modal rendered
  - [ ] Content loaded
  - [ ] Accessible and interactive

### Cache & Optimization
- [ ] **Query Caching**
  - [ ] Jobs list cached for 2 minutes
  - [ ] No duplicate requests on fast navigation
  - [ ] Manual refresh invalidates cache
  - [ ] Mutations clear cache

- [ ] **UI Optimization**
  - [ ] Modals lazy-loaded on demand
  - [ ] Tables paginate (30 items per page)
  - [ ] Search debounced (300ms)
  - [ ] Images lazy-loaded

---

## 🔄 DUPLICATE SUBMISSION PREVENTION

- [ ] **Single Click = Single Action**
  - [ ] Create job: click once → one job created
  - [ ] Update job: click once → one update recorded
  - [ ] Delete: click once → one delete recorded

- [ ] **Network Retries**
  - [ ] Failed request can be retried
  - [ ] Retry creates same outcome (idempotent)
  - [ ] Duplicate records not created

- [ ] **Double-Click Protection**
  - [ ] Submit button disabled during request
  - [ ] Button shows loading state
  - [ ] Second click ignored

---

## 🔧 BROKEN SAVES & RECOVERY

- [ ] **Network Failure**
  - [ ] Error message shown
  - [ ] Form data preserved
  - [ ] Retry button available
  - [ ] No silent failures

- [ ] **Validation Failure**
  - [ ] Specific error message
  - [ ] Field highlighted
  - [ ] User can correct and retry
  - [ ] No data lost

- [ ] **Timeout**
  - [ ] Request fails after 8 seconds
  - [ ] "Timeout" error shown
  - [ ] User can retry
  - [ ] No partial saves

---

## 📊 STALE DATA PREVENTION

- [ ] **Dashboard Freshness**
  - [ ] Pull-to-refresh updates metrics
  - [ ] Manual refresh button works
  - [ ] No more than 2-minute stale window
  - [ ] Tab focus triggers refresh

- [ ] **Job List**
  - [ ] New jobs appear in list
  - [ ] Updated jobs reflect changes
  - [ ] Deleted jobs removed from list
  - [ ] Search results stay current

- [ ] **Audit Log**
  - [ ] All mutations recorded with timestamp
  - [ ] User email captured
  - [ ] Company_id stored
  - [ ] No gaps in audit trail

---

## 🧪 EDGE CASES

- [ ] **Empty States**
  - [ ] No jobs: "Create your first job" message shown
  - [ ] No search results: "Try a different search" message
  - [ ] No profile: Setup wizard shown

- [ ] **Concurrent Access**
  - [ ] Same job edited by 2 users: last write wins
  - [ ] Rapid page navigation: no race conditions
  - [ ] Multiple tabs: data stays consistent

- [ ] **Timezone Handling**
  - [ ] Dates stored in UTC
  - [ ] User sees times in their timezone
  - [ ] No timezone-related UI bugs

- [ ] **Special Characters**
  - [ ] Job names with quotes, apostrophes work
  - [ ] Emoji in notes display correctly
  - [ ] No encoding errors

---

## 📱 MOBILE-SPECIFIC

- [ ] **Touch Targets**
  - [ ] All buttons minimum 44x44px
  - [ ] Spacing between buttons minimum 8px
  - [ ] No precision-click requirements

- [ ] **Scrolling**
  - [ ] Smooth scroll, no jank
  - [ ] Pull-to-refresh at top
  - [ ] No horizontal scroll
  - [ ] Safe area respected (notch, home indicator)

- [ ] **Keyboard**
  - [ ] Form fields gain focus in order
  - [ ] Return key submits form
  - [ ] Escape closes modal
  - [ ] No hidden inputs

---

## ✅ SIGN-OFF

| Role | Name | Status | Date |
|------|------|--------|------|
| Developer | AI Assistant | ✅ Complete | 2026-05-21 |
| QA Engineer | (Manual) | ⏳ Pending | — |
| Product Manager | (Review) | ⏳ Pending | — |
| Operations | (Deploy) | ⏳ Pending | — |

---

## 📝 NOTES FOR QA TEAM

1. **Start with critical path:** Create job → list → detail → update → delete
2. **Test on multiple devices:** Desktop, tablet, mobile
3. **Test on slow networks:** Simulate 3G for realistic conditions
4. **Test edge cases:** Empty states, offline, concurrent access
5. **Verify audit logs:** Check all mutations recorded correctly
6. **Check error messages:** Should be clear and actionable
7. **Monitor performance:** Use DevTools to verify load times
8. **Test accessibility:** Tab through form, use screen reader
9. **Check security:** Cannot access other company's data
10. **Sign off:** Confirm all checks passed before release

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-21  
**Next Review:** After production release