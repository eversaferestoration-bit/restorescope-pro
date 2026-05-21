# RestoreScope Pro CRM System — Complete Guide

**Version:** 1.0  
**Status:** ✅ Production Ready  
**Last Updated:** 2026-05-21

---

## 🎯 Overview

RestoreScope Pro has been upgraded to a full **Lead Management CRM** with:
- 📊 **Kanban Pipeline** — 7-stage drag-and-drop lead pipeline
- 📋 **Lead Details** — Customer info, notes, tasks, communication history, files
- 🔔 **Smart Reminders** — Auto-generated reminders for follow-ups, unpaid invoices, reviews
- ⚡ **Instant Updates** — All pipeline changes save instantly to database
- 📈 **Activity Timeline** — Full audit trail of all lead interactions
- 🎯 **Task Management** — Assign tasks, set due dates, track completion

---

## 📊 Pipeline Stages

### 7-Stage Pipeline (Left to Right)

1. **New** (Blue)
   - Freshly created leads
   - Waiting for initial contact

2. **Contacted** (Purple)
   - Customer reached out or contacted
   - Initial conversation happened

3. **Inspection Scheduled** (Amber)
   - Inspection appointment confirmed
   - Date/time set

4. **Estimate Sent** (Cyan)
   - Estimate provided to customer
   - Awaiting approval

5. **Follow Up** (Red)
   - Estimate not immediately accepted
   - Active follow-up needed

6. **Won** (Green)
   - Customer approved
   - Job created or invoice generated

7. **Lost** (Gray)
   - Customer declined
   - Deal closed

---

## 🎮 Kanban Drag-and-Drop

### How to Use:
1. Open **CRM Pipeline** from main navigation
2. Leads appear as cards in columns by stage
3. **Drag any card** to a new column to move lead
4. **Drop to save instantly** — no "save" button needed
5. Automatic activity log entry created

### Card Information:
- Customer name (large text)
- Phone number (small)
- Service type (color-coded)
- Estimated value (dollar amount)

---

## 👤 Lead Detail Page

Click any lead card to open **Lead Detail Page** with:

### 1. Header Section
- Customer name & photo placeholder
- Phone, email, address
- Dollar value
- Pipeline stage selector (buttons to move lead)

### 2. Active Reminders
- Red alert box shows pending reminders
- Quick view of what action needed
- Links to related jobs/estimates

### 3. Tabbed Content

#### **Notes Tab** 💬
- Add internal comments
- View all comments with timestamps
- Real-time updates
- Comment appears immediately after submit

#### **Tasks Tab** ✅
- Create tasks for this lead
- Assign to team member
- Set priority (low, medium, high)
- Set due date
- Mark complete with checkbox

#### **Activity Tab** 📅
- Complete timeline of all lead interactions
- Stage changes
- Notes added
- Tasks created
- Files uploaded
- Who made change + exact time

#### **Files Tab** 📄
- Photos of property damage
- Insurance documents
- Estimate PDFs
- Customer correspondence
- Drag-and-drop upload

---

## 🔔 Smart Reminders System

### Automatic Reminder Types

#### 1. **Estimate Follow-Up** (Yellow)
- **Triggers:** When estimate sent 3+ days ago
- **Action:** Click reminder to open lead detail
- **Dismiss:** Mark as handled

#### 2. **No Response** (Red)
- **Triggers:** No contact from customer in 3+ days
- **Action:** Call customer or send email
- **Dismiss:** Once contacted

#### 3. **Unpaid Invoice** (Red)
- **Triggers:** When lead has linked invoice not yet paid
- **Action:** Send payment reminder
- **Dismiss:** Once paid

#### 4. **Missing Review Request** (Yellow)
- **Triggers:** When lead moves to "Won" stage
- **Action:** Send SMS/email review request
- **Dismiss:** Once request sent

### Accessing Reminders

1. Click **Reminders** in left sidebar
2. See all active reminders grouped by type
3. High-priority count shown in red
4. Click reminder to view lead
5. Click **Dismiss** when action taken

---

## 📝 Internal Comments

Add comments visible only to your team (not customer-facing):

1. Open lead detail page
2. Click **Notes** tab
3. Type comment in text area
4. Click **Comment** button
5. Comment appears instantly with timestamp

Comments are:
- ✅ Searchable in lead activity
- ✅ Timestamped and attributed to user
- ✅ Never sent to customer
- ✅ Preserved in full audit trail

---

## 🎯 Task Management

### Create a Task:
1. Open lead detail page
2. Click **Tasks** tab
3. Enter task title
4. Click **Add Task**

### Task Properties:
- **Title** — What needs to be done
- **Description** (optional) — Details
- **Assigned To** — Team member responsible
- **Due Date** — When needed
- **Priority** — Low, Medium, High
- **Status** — Open, In Progress, Completed, Cancelled

### Complete a Task:
1. Click checkbox next to task
2. Marked as completed automatically
3. Activity log updated

---

## ⚡ Instant Pipeline Updates

**All changes save immediately** — no refresh needed.

### What Updates Instantly:
- ✅ Moving lead between stages
- ✅ Adding notes
- ✅ Creating tasks
- ✅ Uploading files
- ✅ Dismissing reminders
- ✅ Stage changes reflected in Kanban board

### Real-Time Sync:
- Dashboard count updates instantly
- Activity timeline auto-refreshes
- No data loss possible
- Full audit trail maintained

---

## 📊 Activity Timeline

Every action on a lead creates an activity entry:

### Activity Types Logged:
- 🔄 **Stage Change** — Moved from one stage to another
- 📝 **Note Added** — Internal comment created
- ✅ **Task Created** — New task assigned
- 📄 **File Uploaded** — Document added
- 📧 **Email Sent** — (when integrated)
- ☎️ **Call Logged** — (when integrated)
- 📊 **Estimate Sent** — (when integrated)
- 🔔 **Follow-up Scheduled** — (when integrated)

### View Timeline:
1. Open lead detail
2. Click **Activity** tab
3. See chronological list, newest first
4. Each entry shows: actor, action, timestamp

---

## 🔗 Linked Records

### Link Estimates:
```
Lead → linked_estimate_id → Estimate
```
- One estimate per lead
- Shown on lead detail
- Auto-triggers "Estimate Sent" reminder

### Link Jobs:
```
Lead → linked_job_id → Job
```
- One job per lead
- Created when lead won
- Tracks scope, photos, etc.

### Link Invoices:
```
Lead → linked_invoice_id → Invoice
```
- One invoice per lead
- Auto-triggers "Unpaid Invoice" reminder
- Payment status tracked

---

## 👥 Team Collaboration

### Assign Tasks to Team:
1. Create task on lead
2. Click "Assigned To" dropdown
3. Select team member
4. They see task in their dashboard
5. They can check off when complete

### Activity Shows Who Did What:
- Each action shows user email
- Full audit trail of all changes
- Track accountability

### Permission Model:
- ✅ All users can see leads in their company
- ✅ Can move leads between stages
- ✅ Can add notes and tasks
- ✅ Cannot see other companies' data

---

## 💡 Best Practices

### 1. **Move Stage Regularly**
- Update stage when significant progress happens
- Don't let leads stay in "contacted" for weeks
- Keeps pipeline realistic

### 2. **Add Notes Frequently**
- Log every customer interaction
- Note objections or concerns
- Track decision-makers
- Record next steps

### 3. **Use Tasks Strategically**
- One task per action item
- Assign to responsible person
- Set realistic due dates
- Update status regularly

### 4. **Monitor Reminders**
- Check reminders daily
- Dismiss when action taken
- Don't ignore red alerts
- High-priority = follow up today

### 5. **Keep Activity Clean**
- Notes + timeline = customer context
- New team member can see full history
- Helps with follow-up
- Reduces repeated questions

---

## 🔐 Data Security

### Company Isolation:
- Each company only sees their leads
- No cross-company data leakage
- User role-based access

### Soft Deletes:
- Deleted leads hidden but preserved
- Full history recoverable
- Compliance-friendly

### Audit Trail:
- Every change logged
- Who did it, when, what changed
- Forever record maintained

---

## 📈 Metrics Tracked

### Pipeline Metrics:
- Leads in each stage
- Average days in stage
- Conversion rate (new → won)
- Lost rate
- Average deal value

### Activity Metrics:
- Follow-ups completed
- Reminders dismissed
- Tasks completed on time
- Documents collected

---

## 🚀 Getting Started

### First Steps:
1. Go to **CRM Pipeline** in sidebar
2. Click **New Lead** button
3. Fill in customer info
4. Click **Create Lead**
5. Lead appears in "New" column
6. Drag to next stage when ready

### First Week:
- [ ] Create 10-20 leads
- [ ] Move leads as conversations progress
- [ ] Add notes on each lead
- [ ] Set tasks for team
- [ ] Check reminders daily

### First Month:
- [ ] Move first leads to "Won"
- [ ] Link estimates and jobs
- [ ] Set up team task assignments
- [ ] Review pipeline metrics
- [ ] Adjust follow-up timing

---

## ⚙️ Configuration

### Customize Stages:
Pipeline stages are currently fixed. To modify:
- Contact support for custom stages
- Can reorder stages if needed
- Each stage stays color-coded

### Reminder Timing:
Current thresholds:
- **No Response:** 3+ days since last contact
- **Estimate Follow-up:** 3+ days since sent
- **Unpaid Invoice:** Any unpaid invoice linked
- **Missing Review:** When moved to Won

To adjust:
- Edit `generateLeadReminders.js`
- Change date thresholds
- Redeploy function

---

## 🐛 Troubleshooting

### Lead not moving in Kanban:
- Refresh browser (Cmd+R)
- Check network connection
- Try again in 5 seconds

### Reminder not showing:
- Run reminder generator manually
- Check lead has correct stage
- Ensure dates are set correctly

### Notes not appearing:
- Refresh Notes tab
- Check browser console for errors
- Verify company_id matches

### Task not saving:
- Check internet connection
- Try creating task again
- If persists, contact support

---

## 📞 Support

For issues:
1. Check this guide first
2. Check browser console (F12) for errors
3. Verify all required fields filled
4. Contact your administrator
5. Email support@restoresco.pe

---

## 🎓 Features Coming Soon

- 📱 Mobile CRM app
- 🤖 AI lead scoring
- 📧 Email integration
- 💬 SMS messaging
- 📞 Call logging
- 🗺️ Territory management
- 📊 Advanced analytics
- 🔄 Lead source tracking
- 🎁 Lead assignment rules
- 📅 Calendar integration

---

**Your CRM is ready to use. Start with the Kanban board and watch your pipeline grow!**