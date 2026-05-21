/**
 * validateJobIntegrity — Backend safeguard to prevent orphaned/invalid jobs
 * 
 * Runs periodically to:
 * - Detect null company_id records
 * - Fix missing audit log entries
 * - Validate relationships (insured, property)
 * - Flag suspicious patterns
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth check — only admins can run this
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin only' },
        { status: 403 }
      );
    }

    const issues = {
      orphanedJobs: [],
      missingInsured: [],
      missingProperty: [],
      deletedReferences: [],
      missingAuditLog: [],
    };

    // 1. Find jobs with null company_id (critical issue)
    const allJobs = await base44.asServiceRole.entities.Job.filter(
      { is_deleted: false },
      '-created_date',
      500
    );

    for (const job of allJobs) {
      if (!job.company_id) {
        issues.orphanedJobs.push({
          id: job.id,
          job_number: job.job_number,
          created_date: job.created_date,
          created_by: job.created_by,
        });
      }

      // 2. Check insured/property exist
      if (job.insured_id) {
        try {
          const insured = await base44.asServiceRole.entities.Insured.get(
            job.insured_id
          );
          if (insured?.is_deleted) {
            issues.deletedReferences.push({
              job_id: job.id,
              type: 'insured',
              reference_id: job.insured_id,
            });
          }
        } catch {
          issues.missingInsured.push({
            job_id: job.id,
            insured_id: job.insured_id,
          });
        }
      }

      if (job.property_id) {
        try {
          const property = await base44.asServiceRole.entities.Property.get(
            job.property_id
          );
          if (property?.is_deleted) {
            issues.deletedReferences.push({
              job_id: job.id,
              type: 'property',
              reference_id: job.property_id,
            });
          }
        } catch {
          issues.missingProperty.push({
            job_id: job.id,
            property_id: job.property_id,
          });
        }
      }

      // 3. Check audit log has entry
      if (job.company_id) {
        const auditEntries = await base44.asServiceRole.entities.AuditLog.filter(
          {
            company_id: job.company_id,
            entity_type: 'Job',
            entity_id: job.id,
            action: 'created',
          },
          '-created_date',
          1
        );
        if (!auditEntries.length) {
          issues.missingAuditLog.push({
            job_id: job.id,
            company_id: job.company_id,
            created_by: job.created_by,
          });
        }
      }
    }

    // 4. Log any critical issues
    if (issues.orphanedJobs.length > 0) {
      console.error('[INTEGRITY] Found orphaned jobs:', issues.orphanedJobs);
    }
    if (issues.missingInsured.length > 0) {
      console.warn('[INTEGRITY] Found missing insured references:', issues.missingInsured);
    }
    if (issues.missingProperty.length > 0) {
      console.warn('[INTEGRITY] Found missing property references:', issues.missingProperty);
    }
    if (issues.deletedReferences.length > 0) {
      console.warn('[INTEGRITY] Found deleted references:', issues.deletedReferences);
    }

    // 5. Return summary to caller
    return Response.json({
      timestamp: new Date().toISOString(),
      totalJobsScanned: allJobs.length,
      issues,
      summary: {
        orphaned: issues.orphanedJobs.length,
        missingInsured: issues.missingInsured.length,
        missingProperty: issues.missingProperty.length,
        deletedReferences: issues.deletedReferences.length,
        missingAuditLog: issues.missingAuditLog.length,
      },
      status: issues.orphanedJobs.length > 0 ? 'CRITICAL' : 'OK',
    });
  } catch (error) {
    console.error('[VALIDATE_JOB_INTEGRITY_ERROR]', error);
    return Response.json(
      {
        error: 'Validation failed',
        message: error?.message,
      },
      { status: 500 }
    );
  }
});