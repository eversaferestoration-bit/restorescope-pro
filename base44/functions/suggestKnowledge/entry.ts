import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Suggest relevant knowledge items based on job context
 * Returns best practices and past successful approaches
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { job_id } = body;

    if (!job_id) {
      return Response.json({ error: 'job_id required' }, { status: 400 });
    }

    // Fetch job details
    const jobs = await base44.asServiceRole.entities.Job.filter({
      id: job_id,
      is_deleted: false,
    });

    if (!jobs.length) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobs[0];

    // Fetch scope items to identify categories
    const scopeItems = await base44.asServiceRole.entities.ScopeItem.filter({
      job_id,
      is_deleted: false,
    });

    const scopeCategories = [...new Set(scopeItems.map(s => s.category))];

    // Fetch all knowledge items
    const allKnowledge = await base44.asServiceRole.entities.KnowledgeItem.filter({
      is_deleted: false,
    });

    // Score and filter relevant knowledge
    const relevantKnowledge = allKnowledge.map(item => {
      let score = 0;

      // Match by scope categories
      if (item.related_scope && item.related_scope.length > 0) {
        const matches = item.related_scope.filter(s => scopeCategories.includes(s)).length;
        score += matches * 10;
      }

      // Match by loss type
      if (item.loss_types && item.loss_types.length > 0 && job.loss_type) {
        if (item.loss_types.includes(job.loss_type)) {
          score += 15;
        }
      }

      // Boost pinned items
      if (item.is_pinned) {
        score += 5;
      }

      // Boost high-success items
      if (item.success_count && item.success_count > 0) {
        score += Math.min(item.success_count / 5, 10);
      }

      return { ...item, relevanceScore: score };
    })
      .filter(item => item.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 8);

    // Group by category
    const grouped = {};
    relevantKnowledge.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push({
        id: item.id,
        title: item.title,
        content: item.content,
        tags: item.tags,
        success_count: item.success_count,
        is_pinned: item.is_pinned,
      });
    });

    return Response.json({
      success: true,
      job_id,
      loss_type: job.loss_type,
      identified_scopes: scopeCategories,
      suggestions: {
        total_items: relevantKnowledge.length,
        by_category: grouped,
      },
      best_practices: relevantKnowledge
        .filter(k => k.category === 'best_practice')
        .slice(0, 3),
      successful_approaches: relevantKnowledge
        .filter(k => k.success_count && k.success_count > 0)
        .slice(0, 3),
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
});