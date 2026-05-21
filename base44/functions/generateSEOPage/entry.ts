import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { company_id, city, service } = await req.json();

    if (!company_id || !city || !service) {
      return Response.json(
        { error: 'Missing required fields: company_id, city, service' },
        { status: 400 }
      );
    }

    // Get company profile for branding
    const company = await base44.asServiceRole.entities.Company.filter(
      { id: company_id },
      null,
      1
    );

    if (!company || company.length === 0) {
      return Response.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyData = company[0];
    const companyName = companyData.name || 'RestoreScope';

    // Service mapping with local keywords
    const serviceConfig = {
      water_damage: {
        label: 'Water Damage Restoration',
        keywords: [
          `${city} water damage repair`,
          `water damage restoration ${city}`,
          `emergency water cleanup ${city}`,
          `water mitigation ${city}`,
          `water damage restoration near me`,
        ],
      },
      mold_remediation: {
        label: 'Mold Remediation',
        keywords: [
          `${city} mold removal`,
          `mold remediation ${city}`,
          `black mold removal ${city}`,
          `mold inspection ${city}`,
          `mold remediation services near me`,
        ],
      },
      sewage_cleanup: {
        label: 'Sewage Cleanup',
        keywords: [
          `${city} sewage cleanup`,
          `sewage backup cleanup ${city}`,
          `biohazard cleanup ${city}`,
          `sewage restoration ${city}`,
          `sewage cleanup services near me`,
        ],
      },
      flood_cleanup: {
        label: 'Flood Cleanup',
        keywords: [
          `${city} flood cleanup`,
          `flood damage restoration ${city}`,
          `emergency flood cleanup ${city}`,
          `flood restoration ${city}`,
          `flood cleanup services near me`,
        ],
      },
      emergency_drying: {
        label: 'Emergency Drying',
        keywords: [
          `${city} emergency drying`,
          `structural drying ${city}`,
          `rapid drying services ${city}`,
          `moisture control ${city}`,
          `emergency drying services near me`,
        ],
      },
    };

    const config = serviceConfig[service];
    if (!config) {
      return Response.json({ error: 'Invalid service type' }, { status: 400 });
    }

    // Generate slug
    const slug = `${city.toLowerCase().replace(/\s+/g, '-')}-${service.replace(/_/g, '-')}`;

    // Generate SEO meta
    const metaTitle = `${config.label} in ${city} | ${companyName}`;
    const metaDescription = `Professional ${config.label.toLowerCase()} services in ${city}. Fast response, certified technicians, 24/7 emergency support. Call now for immediate help.`;

    // Generate content
    const prompt = `Generate SEO-optimized professional landing page content for a restoration company.

Company: ${companyName}
Service: ${config.label}
City: ${city}
Keywords: ${config.keywords.join(', ')}

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "h1": "Main heading incorporating city and service",
  "intro": "2-3 sentence intro paragraph with local keywords",
  "service_overview": "2 paragraph detailed service description",
  "why_choose_us": [
    { "title": "Benefit 1", "description": "Brief description" },
    { "title": "Benefit 2", "description": "Brief description" },
    { "title": "Benefit 3", "description": "Brief description" }
  ],
  "process_steps": [
    { "step": 1, "title": "Assessment", "description": "What we do first" },
    { "step": 2, "title": "Cleanup", "description": "Main work" },
    { "step": 3, "title": "Restoration", "description": "Final touches" }
  ],
  "faq": [
    { "question": "Question about the service?", "answer": "Professional answer" },
    { "question": "How quickly do you respond?", "answer": "Answer about response time" },
    { "question": "Do you work with insurance?", "answer": "Answer about insurance" }
  ],
  "cta_text": "Professional CTA text",
  "cta_button": "Call Now for 24/7 Service"
}`;

    const contentResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gpt_5_mini',
    });

    let content;
    try {
      content = typeof contentResponse === 'string' ? JSON.parse(contentResponse) : contentResponse;
    } catch (e) {
      return Response.json(
        { error: 'Failed to parse generated content' },
        { status: 500 }
      );
    }

    // Create the page
    const page = await base44.asServiceRole.entities.PublicPage.create({
      company_id,
      city,
      service,
      slug,
      meta_title: metaTitle,
      meta_description: metaDescription,
      keywords: config.keywords,
      content,
      published: false,
    });

    return Response.json({
      success: true,
      page,
      preview_url: `/public/${slug}`,
    });
  } catch (error) {
    console.error('generateSEOPage Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});