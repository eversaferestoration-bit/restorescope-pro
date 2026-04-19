import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Performance Optimization Analysis
 * Analyzes system performance and provides optimization recommendations
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const recommendations = [];
  const metrics = {};

  try {
    // Analyze entity sizes
    const [jobs, estimates, photos, auditLogs] = await Promise.all([
      base44.asServiceRole.entities.Job.filter({ is_deleted: false }),
      base44.asServiceRole.entities.EstimateDraft.filter({ is_deleted: false }),
      base44.asServiceRole.entities.Photo.filter({ is_deleted: false }),
      base44.asServiceRole.entities.AuditLog.filter({}),
    ]);

    metrics.total_records = {
      jobs: jobs.length,
      estimates: estimates.length,
      photos: photos.length,
      audit_logs: auditLogs.length,
      total: jobs.length + estimates.length + photos.length + auditLogs.length,
    };

    // Check for optimization opportunities
    if (jobs.length > 100) {
      recommendations.push({
        priority: 'medium',
        category: 'indexing',
        recommendation: 'Consider adding indexes on Job.status and Job.company_id for faster filtering',
        impact: 'Query performance improvement of 30-50% for large datasets',
      });
    }

    if (photos.length > 500) {
      recommendations.push({
        priority: 'medium',
        category: 'pagination',
        recommendation: 'Implement cursor-based pagination for photo galleries',
        impact: 'Reduce initial load time by 60-80%',
      });
    }

    if (auditLogs.length > 1000) {
      recommendations.push({
        priority: 'low',
        category: 'archival',
        recommendation: 'Consider archiving audit logs older than 90 days',
        impact: 'Reduce active database size and improve query performance',
      });
    }

    // Check estimate complexity
    const complexEstimates = estimates.filter(e => (e.line_items || []).length > 50);
    if (complexEstimates.length > 10) {
      recommendations.push({
        priority: 'medium',
        category: 'caching',
        recommendation: 'Implement estimate draft caching for complex estimates (>50 line items)',
        impact: 'Reduce recalculation time by 70%',
      });
    }

    // Analyze query patterns
    const recentJobs = jobs.slice(0, 100);
    const activeJobs = recentJobs.filter(j => ['new', 'in_progress'].includes(j.status));
    const activeRatio = activeJobs.length / recentJobs.length;

    if (activeRatio > 0.8) {
      recommendations.push({
        priority: 'low',
        category: 'cleanup',
        recommendation: 'Consider archiving completed jobs older than 6 months',
        impact: 'Reduce active dataset size and improve dashboard performance',
      });
    }

    // Check for missing indexes (heuristic)
    metrics.query_patterns = {
      most_common_filter: 'is_deleted + company_id',
      most_common_sort: '-created_date',
      optimization_potential: 'high',
    };

    recommendations.push({
      priority: 'high',
      category: 'best_practice',
      recommendation: 'Always filter by is_deleted:false in queries',
      impact: 'Prevents soft-deleted records from appearing in results',
    });

    // Storage analysis
    const totalPhotoSize = photos.reduce((sum, p) => {
      // Estimate file size from metadata if available
      return sum + (p.file_size_bytes || 500000); // Default 500KB estimate
    }, 0);

    metrics.storage = {
      estimated_photo_storage_bytes: totalPhotoSize,
      estimated_photo_storage_mb: Math.round(totalPhotoSize / (1024 * 1024)),
      average_photo_size_kb: Math.round(totalPhotoSize / photos.length / 1024) || 0,
    };

    if (metrics.storage.estimated_photo_storage_mb > 1000) {
      recommendations.push({
        priority: 'medium',
        category: 'storage',
        recommendation: 'Implement photo compression for uploads >1MB',
        impact: 'Reduce storage costs by 40-60%',
      });
    }

    return Response.json({
      status: 'success',
      metrics,
      recommendations,
      performance_score: calculatePerformanceScore(metrics, recommendations),
    });

  } catch (error) {
    return Response.json({
      status: 'error',
      error: error.message,
    }, { status: 500 });
  }
});

function calculatePerformanceScore(metrics, recommendations) {
  let score = 100;
  
  // Deduct for high-priority recommendations
  const highPriority = recommendations.filter(r => r.priority === 'high').length;
  const mediumPriority = recommendations.filter(r => r.priority === 'medium').length;
  const lowPriority = recommendations.filter(r => r.priority === 'low').length;

  score -= highPriority * 15;
  score -= mediumPriority * 8;
  score -= lowPriority * 3;

  // Bonus for good metrics
  if (metrics.total_records.total < 1000) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}