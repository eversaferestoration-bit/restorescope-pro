# RestoreScope Pro — Production Runbook

**Version:** 1.0  
**Last Updated:** 2026-05-21  
**Status:** Live & Monitored

---

## 🚨 QUICK REFERENCE — Critical Issues

### System Down (All Users Affected)
1. Check status page: https://status.restoresco.pe
2. Check server logs: `./logs.sh | grep ERROR`
3. Run health check: `./health-check.sh`
4. If degraded: Page on-call engineer
5. Consider rollback if > 30 min outage

### High Error Rate (> 1%)
1. Check logs: `./logs.sh | tail -100`
2. Look for: "Error", "Failed", "Exception"
3. Check database: `./db-check.sh`
4. Check API quotas and limits
5. If persists > 5 min: Alert engineering team

### Data Integrity Issue
1. Stop writes: Disable job creation API
2. Run: `./validate-job-integrity.sh`
3. Check audit log for anomalies
4. Backup database immediately
5. Contact engineering team ASAP

### Security Breach (Suspected)
1. Isolate affected system
2. Enable detailed audit logging
3. Review access logs: `./access-logs.sh`
4. Do NOT discuss publicly
5. Contact security team immediately

---

## 📊 MONITORING DASHBOARDS

### Primary Dashboard
- URL: https://monitoring.restoresco.pe/dashboard
- Check: Uptime, error rate, response time, CPU, memory
- Refresh: Every 5 minutes during business hours
- Alert: If any metric red

### Application Metrics
- URL: https://monitoring.restoresco.pe/app
- Track: Job creation rate, user sessions, API calls
- Alert Threshold: > 10% drop in creation rate
- Investigate: Unusual user activity patterns

### Database Performance
- URL: https://monitoring.restoresco.pe/db
- Key Metrics: Query time, connection pool, locks
- Alert: Query time > 1s, pool > 80% used
- Action: Kill slow queries, scale if needed

### Error Tracking
- URL: https://sentry.restoresco.pe or LogRocket
- Review: Daily for new error patterns
- Priority: CRITICAL > HIGH > MEDIUM > LOW
- Action: Triage and assign to engineer

---

## 🔧 COMMON OPERATIONS

### Check System Status
```bash
# Quick health check
./health-check.sh

# Detailed diagnostics
./diag.sh --full

# Check specific component
./health-check.sh --service=api
./health-check.sh --service=db
./health-check.sh --service=cache
```

### View Logs
```bash
# All logs (last 100 lines)
./logs.sh

# Errors only
./logs.sh | grep ERROR

# Specific date
./logs.sh --date=2026-05-21

# Real-time tail
./logs.sh --follow

# Specific service
./logs.sh --service=api
./logs.sh --service=jobs
```

### Database Operations
```bash
# Backup database
./db-backup.sh

# Verify data integrity
./validate-job-integrity.sh

# Run migration
./db-migrate.sh --version=v1.0.1

# Rollback migration
./db-rollback.sh --version=v1.0.0

# Export audit log
./export-audit.sh --company=ACME --format=csv
```

### Restart Services
```bash
# Restart API
./service.sh restart api

# Restart all
./service.sh restart all

# Check service status
./service.sh status

# View service logs
./service.sh logs api
```

---

## 🐛 TROUBLESHOOTING GUIDE

### Job Creation Failing

**Symptoms:**
- Users report "Failed to create job" error
- Error rate for POST /jobs > 5%
- Audit log shows no new Job records

**Diagnosis:**
1. Check logs: `./logs.sh | grep createJob`
2. Look for:
   - `400 Bad Request` → Invalid input
   - `401 Unauthorized` → Auth issue
   - `403 Forbidden` → Permission denied
   - `500 Server Error` → Backend crash
3. Check specific error message

**Solutions:**

**If 400 Bad Request:**
- Required field missing → Check frontend validation
- Invalid company_id → Run company isolation check
- Malformed request → Check API spec

**If 401 Unauthorized:**
- Session expired → User must re-login
- Token invalid → Check auth service
- Auth service down → Check status page

**If 403 Forbidden:**
- User not in company → Check UserProfile company_id
- Role lacks permission → Check user role
- Company mismatch → Check job company vs user company

**If 500 Server Error:**
- Database connection failed → Check DB status
- Constraint violation → Check audit log
- Code bug → Check recent deployments
- If persistent: Rollback to previous version

---

### Job List Not Loading / Slow

**Symptoms:**
- Jobs page shows spinner > 5 seconds
- Search results slow
- Mobile users report timeouts

**Diagnosis:**
1. Check query time: `./db-check.sh --query=job_list`
2. Check if database slow: `./db-check.sh --perf`
3. Monitor API response time
4. Check user network (ask user to check)

**Solutions:**

**If Query Slow (> 1s):**
- Run: `./db-optimize.sh`
- Check for missing indexes
- Kill long-running queries: `./db-kill-slow.sh`
- Might need database scaling

**If API Slow:**
- Check server CPU/memory: `./health-check.sh`
- Restart API: `./service.sh restart api`
- Check for memory leaks: `./memory-check.sh`

**If Network Issue (User):**
- Ask user to: Refresh, hard reload (Cmd+Shift+R), check WiFi
- Have user try on mobile data
- Check user's ISP for issues

---

### Data Inconsistency / Missing Records

**Symptoms:**
- Job appears in list but not in detail view
- Audit log missing entries
- User reports "I created a job but it's gone"

**Diagnosis:**
1. Run integrity check: `./validate-job-integrity.sh`
2. Search audit log: `./audit-search.sh --job=12345`
3. Check soft deletes: `./db-query.sh "SELECT * FROM Job WHERE id = '12345'"`

**Solutions:**

**If Record Deleted (is_deleted = true):**
- Check who deleted it and when (audit log)
- If accidental: Run `./undelete.sh --entity=Job --id=12345`
- If intentional: Inform user and restore from backup if critical

**If Missing Audit Entry:**
- Check if audit logging is enabled: `./config.sh --show | grep audit`
- Run audit cleanup: `./audit-cleanup.sh`
- Enable audit logging if disabled

**If Data Corruption:**
- Immediately stop writes
- Backup database
- Investigate root cause
- Restore from last known-good backup
- Contact engineering team

---

### Authentication / Session Issues

**Symptoms:**
- Users logged out unexpectedly
- "Session expired" errors
- Cannot login

**Diagnosis:**
1. Check auth service: `./health-check.sh --service=auth`
2. Check JWT tokens in logs: `./logs.sh | grep jwt`
3. Test login flow manually

**Solutions:**

**If Auth Service Down:**
- Restart auth service: `./service.sh restart auth`
- Check status page for maintenance
- Inform users and provide ETA

**If Session Timeout Too Aggressive:**
- Check setting: `./config.sh --show | grep session_timeout`
- Update: `./config.sh --set session_timeout=8h`
- Restart API: `./service.sh restart api`

**If Logout Not Working:**
- Check logs: `./logs.sh | grep logout`
- Manually clear user tokens: `./auth-clear.sh --user=user@example.com`
- Restart auth service

---

### Performance Degradation

**Symptoms:**
- Page load time > 3 seconds
- API response time > 1 second
- High CPU/memory on server

**Diagnosis:**
1. Check metrics: `./health-check.sh --full`
2. Check database performance: `./db-check.sh --perf`
3. Check for memory leaks: `./memory-check.sh`
4. Check for infinite loops: `./logs.sh | grep timeout`

**Solutions:**

**If Database Slow:**
- Optimize indexes: `./db-optimize.sh`
- Archive old data: `./archive-old-jobs.sh --before=2025-01-01`
- Scale database if needed

**If Memory Leak:**
- Restart service: `./service.sh restart api`
- Check logs for leaks: `./logs.sh | grep memory`
- If repeats: Need code fix (contact engineering)

**If High CPU:**
- Kill slow processes: `./kill-slow.sh`
- Reduce logging verbosity: `./config.sh --set log_level=warn`
- Restart service: `./service.sh restart api`

---

## 📋 DAILY CHECKLIST

### Morning (Start of Business)
- [ ] Check status page: All green
- [ ] Review overnight alerts: None critical
- [ ] Check error rate: < 0.1%
- [ ] Verify database backup completed
- [ ] Check for customer complaints

### During Business Hours
- [ ] Monitor error rate every 2 hours
- [ ] Check performance metrics
- [ ] Watch for unusual patterns
- [ ] Respond to alerts promptly

### Evening (End of Business)
- [ ] Review day's errors: Document patterns
- [ ] Check for scheduled maintenance
- [ ] Verify backups completed
- [ ] Brief night shift on issues

### Weekly
- [ ] Review error trends
- [ ] Analyze performance metrics
- [ ] Audit access logs for security
- [ ] Check disk space usage
- [ ] Review scaling recommendations

---

## 🔄 RUNBOOK PROCEDURES

### Procedure: Force Logout User
**When:** User account compromised or stuck session  
**How:**
```bash
./auth-force-logout.sh --user=user@example.com
# User must re-login
```

### Procedure: Disable User Account
**When:** Security breach, account compromised  
**How:**
```bash
./user-disable.sh --user=user@example.com
# User cannot login until re-enabled
```

### Procedure: Export Company Data
**When:** User requests export, GDPR request  
**How:**
```bash
./export-data.sh --company=ACME --format=json --output=acme-data.json
# Data exported to file
```

### Procedure: Soft Delete Recovery
**When:** User accidentally deleted job  
**How:**
```bash
./undelete.sh --entity=Job --id=12345
# Job restored, audit log updated
```

### Procedure: Scale Database
**When:** Query time degrading, connections maxed  
**How:**
```bash
./scale-db.sh --size=large
# Database scaled, zero downtime
```

---

## 🚨 ESCALATION CONTACTS

| Issue | Contact | Response Time |
|-------|---------|----------------|
| Data Loss | Security Team | 5 min |
| Security Breach | Security Lead | 5 min |
| System Down | On-Call Engineer | 10 min |
| Performance Issue | Engineering Lead | 15 min |
| Bug Report | Triage Team | 1 hour |
| Feature Request | Product Manager | Next day |

**War Room:** #incidents Slack channel  
**Status Page:** https://status.restoresco.pe  
**On-Call Schedule:** PagerDuty

---

## 📞 SUPPORT CONTACTS

| Channel | Purpose | Hours |
|---------|---------|-------|
| Slack #support | General support | Business hours |
| Email support@restoresco.pe | Formal requests | 24/7 |
| Phone 1-800-XXX-XXXX | Critical issues | 24/7 |
| Chat support.restoresco.pe | Quick help | Business hours |

---

## 📚 RELATED DOCUMENTS

- **PRODUCTION_AUDIT_REPORT.md** — Detailed audit findings
- **QA_CHECKLIST.md** — Testing checklist
- **KNOWN_ISSUES.md** — Known limitations & workarounds
- **DEPLOYMENT_CHECKLIST.md** — Deployment procedure
- **AUDIT_SUMMARY.md** — Executive summary

---

**Last Updated:** 2026-05-21  
**Next Review:** 2026-06-21  
**Owner:** Operations Team  
**Emergency Contact:** On-call engineer (see PagerDuty)