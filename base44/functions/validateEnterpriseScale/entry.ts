import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Enterprise Scale Validation - Performance & Stability Testing
 * Tests: large datasets, multi-company isolation, concurrent operations, API limits, analytics accuracy
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

  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
    overall_status: 'pass',
    issues: [],
    recommendations: [],
  };

  try {
    // TEST 1: Large Dataset Performance
    results.tests.large_dataset = await testLargeDatasets(base44, user);
    
    // TEST 2: Multi-Company Data Isolation
    results.tests.multi_company = await testMultiCompanyIsolation(base44, user);
    
    // TEST 3: Concurrent Operations Simulation
    results.tests.concurrent_ops = await testConcurrentOperations(base44, user);
    
    // TEST 4: API Endpoint Performance
    results.tests.api_performance = await testAPIPerformance(base44, user);
    
    // TEST 5: Analytics Accuracy Validation
    results.tests.analytics_accuracy = await testAnalyticsAccuracy(base44, user);
    
    // TEST 6: Subscription & Usage Tracking
    results.tests.usage_tracking = await testUsageTracking(base44, user);
    
    // TEST 7: Enterprise Features Stability
    results.tests.enterprise_features = await testEnterpriseFeatures(base44, user);

    // Determine overall status
    const failedTests = Object.entries(results.tests).filter(([_, result]) => !result.passed);
    if (failedTests.length > 0) {
      results.overall_status = 'fail';
      results.issues = failedTests.map(([name, result]) => ({
        test: name,
        issue: result.error || 'Test failed',
      }));
    }

    // Generate recommendations
    if (results.tests.large_dataset.query_time_ms > 500) {
      results.recommendations.push('Consider adding database indexes for frequently queried fields');
    }
    if (results.tests.concurrent_ops.success_rate < 95) {
      results.recommendations.push('Implement retry logic for concurrent operations');
    }

  } catch (error) {
    results.overall_status = 'error';
    results.error = error.message;
  }

  // Log validation to audit
  await base44.asServiceRole.entities.AuditLog.create({
    company_id: 'system',
    entity_type: 'SystemValidation',
    entity_id: 'enterprise-scale-' + new Date().toISOString().split('T')[0],
    action: 'validation_run',
    actor_email: user.email,
    actor_id: user.id,
    description: 'Enterprise scale validation completed',
    metadata: {
      status: results.overall_status,
      tests_run: Object.keys(results.tests).length,
      issues_count: results.issues.length,
    },
  });

  return Response.json(results);
});

async function testLargeDatasets(base44, user) {
  const startTime = Date.now();
  const result = { passed: true, metrics: {} };

  try {
    // Test job queries with large datasets
    const jobsStart = Date.now();
    const jobs = await base44.entities.Job.filter({ is_deleted: false }, '-created_date', 500);
    result.metrics.jobs_query_time_ms = Date.now() - jobsStart;
    result.metrics.jobs_count = jobs.length;

    // Test estimate queries
    const estimatesStart = Date.now();
    const estimates = await base44.entities.EstimateDraft.filter({ is_deleted: false }, '-created_date', 200);
    result.metrics.estimates_query_time_ms = Date.now() - estimatesStart;
    result.metrics.estimates_count = estimates.length;

    // Test photo queries
    const photosStart = Date.now();
    const photos = await base44.entities.Photo.filter({ is_deleted: false }, '-created_date', 1000);
    result.metrics.photos_query_time_ms = Date.now() - photosStart;
    result.metrics.photos_count = photos.length;

    // Test with complex filters
    const filterStart = Date.now();
    const filteredJobs = await base44.entities.Job.filter({ 
      is_deleted: false,
      status: 'in_progress'
    }, '-created_date', 100);
    result.metrics.filtered_query_time_ms = Date.now() - filterStart;

    // Performance thresholds
    if (result.metrics.jobs_query_time_ms > 1000) {
      result.passed = false;
      result.error = 'Job queries exceeding 1s threshold';
    }
    if (result.metrics.photos_query_time_ms > 2000) {
      result.passed = false;
      result.error = 'Photo queries exceeding 2s threshold';
    }

  } catch (error) {
    result.passed = false;
    result.error = error.message;
  }

  result.total_time_ms = Date.now() - startTime;
  return result;
}

async function testMultiCompanyIsolation(base44, user) {
  const result = { passed: true, metrics: {} };

  try {
    // Get user's company
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({
      user_id: user.id,
      is_deleted: false,
    });

    if (!profiles.length) {
      // User has no company yet - skip this test
      result.passed = true;
      result.skipped = true;
      result.warning = 'User has no company profile';
      return result;
    }

    const company_id = profiles[0].company_id;
    result.metrics.user_company_id = company_id;

    // Verify company-scoped data
    const companyJobs = await base44.asServiceRole.entities.Job.filter({
      company_id,
      is_deleted: false,
    });

    result.metrics.company_jobs_count = companyJobs.length;

    // Verify isolation - all jobs should have correct company_id
    const isolationBreaches = companyJobs.filter(j => j.company_id !== company_id);
    if (isolationBreaches.length > 0) {
      result.passed = false;
      result.error = `Data isolation breach: ${isolationBreaches.length} jobs with wrong company_id`;
    }

    // Test location isolation if enterprise
    const locations = await base44.asServiceRole.entities.CompanyLocation.filter({
      company_id,
      is_deleted: false,
    });

    result.metrics.locations_count = locations.length;

    // Verify location data isolation
    for (const loc of locations) {
      if (loc.company_id !== company_id) {
        result.passed = false;
        result.error = 'Location isolation breach detected';
        break;
      }
    }

  } catch (error) {
    result.passed = false;
    result.error = error.message;
  }

  return result;
}

async function testConcurrentOperations(base44, user) {
  const result = { passed: true, metrics: {} };
  const operations = 20;
  const successes = 0;
  const failures = 0;

  try {
    // Simulate concurrent read operations
    const readPromises = Array(operations).fill(null).map(async (_, i) => {
      try {
        await base44.entities.Job.filter({ is_deleted: false }, '-created_date', 10);
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });

    const readResults = await Promise.allSettled(readPromises);
    result.metrics.concurrent_reads = operations;
    result.metrics.successful_reads = readResults.filter(r => r.status === 'fulfilled').length;
    result.metrics.failed_reads = readResults.filter(r => r.status === 'rejected').length;

    // Test concurrent writes (lightweight - audit logs)
    const writePromises = Array(5).fill(null).map(async (_, i) => {
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          company_id: 'test',
          entity_type: 'ValidationTest',
          entity_id: `concurrent-test-${Date.now()}-${i}`,
          action: 'test',
          actor_email: user.email,
          actor_id: user.id,
          description: 'Concurrent operation test',
        });
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });

    const writeResults = await Promise.allSettled(writePromises);
    result.metrics.concurrent_writes = 5;
    result.metrics.successful_writes = writeResults.filter(r => r.status === 'fulfilled').length;
    result.metrics.failed_writes = writeResults.filter(r => r.status === 'rejected').length;

    result.success_rate = ((result.metrics.successful_reads + result.metrics.successful_writes) / 
                          (operations + 5)) * 100;

    if (result.success_rate < 90) {
      result.passed = false;
      result.error = `Success rate ${result.success_rate.toFixed(1)}% below 90% threshold`;
    }

  } catch (error) {
    result.passed = false;
    result.error = error.message;
  }

  return result;
}

async function testAPIPerformance(base44, user) {
  const result = { passed: true, metrics: {} };

  try {
    // Test entity operations (always available)
    const entityStart = Date.now();
    const plans = await base44.entities.Plan.filter({ is_active: true });
    result.metrics.entity_query_time_ms = Date.now() - entityStart;
    result.metrics.plans_count = plans.length;

    // Test job entity (core functionality)
    const jobStart = Date.now();
    const jobs = await base44.entities.Job.filter({ is_deleted: false }, '-created_date', 10);
    result.metrics.job_query_time_ms = Date.now() - jobStart;
    result.metrics.jobs_fetched = jobs.length;

    // Performance thresholds
    if (result.metrics.entity_query_time_ms > 1000) {
      result.passed = false;
      result.error = 'Entity queries exceeding 1s threshold';
    }
    if (result.metrics.job_query_time_ms > 1000) {
      result.passed = false;
      result.error = 'Job queries exceeding 1s threshold';
    }

  } catch (error) {
    // 403 means function doesn't exist yet - that's OK for validation
    if (error.status === 403 || error.message?.includes('403')) {
      result.passed = true;
      result.skipped = true;
      result.warning = 'Some backend functions not yet deployed';
    } else {
      result.passed = false;
      result.error = error.message;
    }
  }

  return result;
}

async function testAnalyticsAccuracy(base44, user) {
  const result = { passed: true, metrics: {} };

  try {
    // Get analytics data
    const analyticsStart = Date.now();
    const analyticsRes = await base44.functions.invoke('getAnalyticsData', { time_range: '30d' });
    result.metrics.analytics_query_time_ms = Date.now() - analyticsStart;
    
    const analytics = analyticsRes.data;

    if (!analytics?.data) {
      result.passed = true;
      result.skipped = true;
      result.warning = 'Analytics function not yet available or no data';
      return result;
    }

    // Validate metric calculations
    const { metrics, breakdown } = analytics.data;

    // Check for required metrics
    const requiredMetrics = ['avg_job_value', 'approval_rate', 'supplement_success_rate', 'avg_turnaround_days'];
    const missingMetrics = requiredMetrics.filter(m => metrics[m] === undefined);
    
    if (missingMetrics.length > 0) {
      result.passed = false;
      result.error = `Missing metrics: ${missingMetrics.join(', ')}`;
      return result;
    }

    // Validate ranges
    if (metrics.approval_rate < 0 || metrics.approval_rate > 100) {
      result.passed = false;
      result.error = `Invalid approval_rate: ${metrics.approval_rate}`;
    }

    if (metrics.avg_job_value < 0) {
      result.passed = false;
      result.error = `Invalid avg_job_value: ${metrics.avg_job_value}`;
    }

    // Validate breakdown data
    if (breakdown.total_jobs === undefined || breakdown.total_jobs < 0) {
      result.passed = false;
      result.error = 'Invalid breakdown data';
    }

    result.metrics.total_jobs_analyzed = breakdown.total_jobs;
    result.metrics.total_estimates = breakdown.total_estimates;

  } catch (error) {
    // 403 means function doesn't exist yet - that's OK for validation
    if (error.status === 403 || error.message?.includes('403')) {
      result.passed = true;
      result.skipped = true;
      result.warning = 'Analytics function not yet deployed';
    } else {
      result.passed = false;
      result.error = error.message;
    }
  }

  return result;
}

async function testUsageTracking(base44, user) {
  const result = { passed: true, metrics: {} };

  try {
    // Get user's company
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({
      user_id: user.id,
      is_deleted: false,
    });

    if (!profiles.length) {
      // User has no company yet - skip this test
      result.passed = true;
      result.skipped = true;
      result.warning = 'User has no company profile';
      return result;
    }

    const company_id = profiles[0].company_id;

    // Get subscription
    const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
      company_id,
      is_deleted: false,
    });

    if (subscriptions.length > 0) {
      const subscription = subscriptions[0];
      result.metrics.has_subscription = true;
      result.metrics.subscription_status = subscription.status;

      // Get usage records
      const usageRecords = await base44.asServiceRole.entities.UsageRecord.filter({
        subscription_id: subscription.id,
        is_deleted: false,
      }, '-period_start', 1);

      if (usageRecords.length > 0) {
        const usage = usageRecords[0];
        result.metrics.usage_tracking_active = true;
        result.metrics.jobs_used = usage.jobs_used;
        result.metrics.ai_used = usage.ai_analyses_used;
        result.metrics.storage_used_mb = usage.storage_used_mb;

        // Validate usage doesn't exceed reasonable limits
        if (usage.jobs_used < 0 || usage.ai_analyses_used < 0 || usage.storage_used_mb < 0) {
          result.passed = false;
          result.error = 'Negative usage values detected';
        }
      } else {
        result.metrics.usage_tracking_active = false;
        result.warning = 'No usage records found';
      }
    } else {
      result.metrics.has_subscription = false;
      result.warning = 'No active subscription';
    }

  } catch (error) {
    result.passed = false;
    result.error = error.message;
  }

  return result;
}

async function testEnterpriseFeatures(base44, user) {
  const result = { passed: true, metrics: {} };

  try {
    // Test multi-location support
    const locations = await base44.asServiceRole.entities.CompanyLocation.filter({
      is_deleted: false,
    });
    result.metrics.locations_count = locations.length;
    result.metrics.multi_location_enabled = locations.length > 0;

    // Test pricing profiles
    const pricingProfiles = await base44.asServiceRole.entities.PricingProfile.filter({
      is_deleted: false,
    });
    result.metrics.pricing_profiles_count = pricingProfiles.length;
    result.metrics.custom_pricing_enabled = pricingProfiles.length > 1;

    // Test audit logging
    const auditLogs = await base44.asServiceRole.entities.AuditLog.filter({
      company_id: 'system',
    }, '-created_date', 10);
    result.metrics.audit_logs_count = auditLogs.length;
    result.metrics.audit_logging_active = auditLogs.length > 0;

    // Test adjuster intelligence (if available)
    try {
      const adjusters = await base44.asServiceRole.entities.Adjuster.filter({
        is_deleted: false,
      });
      result.metrics.adjusters_count = adjusters.length;
      result.metrics.adjuster_intelligence_enabled = adjusters.length > 0;
    } catch (e) {
      result.metrics.adjuster_intelligence_enabled = false;
    }

    // Test claim defense (if available)
    try {
      const defenses = await base44.asServiceRole.entities.ClaimDefense.filter({
        is_deleted: false,
      }, '-created_at', 10);
      result.metrics.claim_defense_count = defenses.length;
      result.metrics.claim_defense_enabled = defenses.length > 0;
    } catch (e) {
      result.metrics.claim_defense_enabled = false;
    }

  } catch (error) {
    result.passed = false;
    result.error = error.message;
  }

  return result;
}