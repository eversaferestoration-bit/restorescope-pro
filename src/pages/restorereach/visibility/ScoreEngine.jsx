/**
 * Visibility Score Engine
 * Calculates a 0-100 score across 6 weighted categories.
 */

export const CATEGORIES = [
  { key: 'gbp',      label: 'GBP Completeness',  weight: 25, icon: '📍', color: '#3b82f6' },
  { key: 'reviews',  label: 'Reviews',            weight: 20, icon: '⭐', color: '#f59e0b' },
  { key: 'posting',  label: 'Posting Activity',   weight: 20, icon: '📝', color: '#8b5cf6' },
  { key: 'content',  label: 'Local Content',      weight: 15, icon: '🌐', color: '#10b981' },
  { key: 'citations',label: 'Citations',          weight: 10, icon: '🔗', color: '#06b6d4' },
  { key: 'photos',   label: 'Photos',             weight: 10, icon: '📸', color: '#e05a1c' },
];

export const RATING_CONFIG = {
  poor:       { label: 'Poor',       min: 0,  max: 39,  color: '#ef4444', bg: '#ef444420' },
  needs_work: { label: 'Needs Work', min: 40, max: 59,  color: '#f59e0b', bg: '#f59e0b20' },
  strong:     { label: 'Strong',     min: 60, max: 79,  color: '#3b82f6', bg: '#3b82f620' },
  excellent:  { label: 'Excellent',  min: 80, max: 100, color: '#10b981', bg: '#10b98120' },
};

export function getRating(score) {
  if (score >= 80) return RATING_CONFIG.excellent;
  if (score >= 60) return RATING_CONFIG.strong;
  if (score >= 40) return RATING_CONFIG.needs_work;
  return RATING_CONFIG.poor;
}

export function calculateScore({ profile, areas, gbpPosts, campaigns, leads, reviews }) {
  const checks = {};

  // ─── GBP Completeness (25 pts) ────────────────────────────────
  const gbpItems = [
    { label: 'Business name set',             pass: !!profile?.company_name,                   points: 4 },
    { label: 'Phone number set',              pass: !!profile?.phone,                          points: 4 },
    { label: 'Website URL configured',        pass: !!profile?.website,                        points: 4 },
    { label: 'Address complete',              pass: !!(profile?.address && profile?.city),      points: 4 },
    { label: 'GBP profile URL linked',        pass: !!profile?.google_business_profile_url,    points: 5 },
    { label: 'Google review link set',        pass: !!profile?.google_review_link,             points: 4 },
  ];
  const gbpScore = gbpItems.reduce((s, i) => s + (i.pass ? i.points : 0), 0);
  checks.gbp = { score: Math.min(gbpScore, 25), max: 25, items: gbpItems };

  // ─── Reviews (20 pts) ──────────────────────────────────────────
  const reviewCount = reviews?.length || 0;
  const reviewItems = [
    { label: 'At least 1 review collected',   pass: reviewCount >= 1,   points: 5 },
    { label: '5+ reviews collected',          pass: reviewCount >= 5,   points: 5 },
    { label: '15+ reviews collected',         pass: reviewCount >= 15,  points: 5 },
    { label: 'Review link shared with clients',pass: !!profile?.google_review_link, points: 5 },
  ];
  const reviewScore = reviewItems.reduce((s, i) => s + (i.pass ? i.points : 0), 0);
  checks.reviews = { score: Math.min(reviewScore, 20), max: 20, items: reviewItems };

  // ─── Posting Activity (20 pts) ──────────────────────────────────
  const postCount = gbpPosts?.length || 0;
  const postingItems = [
    { label: 'At least 1 GBP post created',   pass: postCount >= 1,  points: 4 },
    { label: '5+ GBP posts created',           pass: postCount >= 5,  points: 4 },
    { label: '10+ GBP posts created',          pass: postCount >= 10, points: 4 },
    { label: 'Storm alert post created',       pass: campaigns?.some(c => c.campaign_type === 'storm_alert'), points: 4 },
    { label: 'Active marketing campaign',      pass: campaigns?.some(c => c.status === 'active'), points: 4 },
  ];
  const postingScore = postingItems.reduce((s, i) => s + (i.pass ? i.points : 0), 0);
  checks.posting = { score: Math.min(postingScore, 20), max: 20, items: postingItems };

  // ─── Local Content (15 pts) ────────────────────────────────────
  const seoAreas = areas?.filter(a => a.seo_status === 'active' || a.seo_pages?.length > 0) || [];
  const contentItems = [
    { label: 'At least 1 SEO city page generated', pass: seoAreas.length >= 1,  points: 4 },
    { label: '3+ city pages generated',            pass: seoAreas.length >= 3,  points: 4 },
    { label: '5+ city pages generated',            pass: seoAreas.length >= 5,  points: 4 },
    { label: 'Social media connected (FB/IG)',     pass: !!(profile?.facebook_url || profile?.instagram_url), points: 3 },
  ];
  const contentScore = contentItems.reduce((s, i) => s + (i.pass ? i.points : 0), 0);
  checks.content = { score: Math.min(contentScore, 15), max: 15, items: contentItems };

  // ─── Citations (10 pts) ────────────────────────────────────────
  const citationItems = [
    { label: 'Website URL present',           pass: !!profile?.website,      points: 3 },
    { label: 'LinkedIn profile linked',       pass: !!profile?.linkedin_url,  points: 2 },
    { label: 'Facebook page linked',          pass: !!profile?.facebook_url,  points: 3 },
    { label: 'Instagram linked',              pass: !!profile?.instagram_url, points: 2 },
  ];
  const citationScore = citationItems.reduce((s, i) => s + (i.pass ? i.points : 0), 0);
  checks.citations = { score: Math.min(citationScore, 10), max: 10, items: citationItems };

  // ─── Photos (10 pts) ──────────────────────────────────────────
  const photoLeads = leads?.filter(l => l.photos?.length > 0) || [];
  const photoItems = [
    { label: 'Logo uploaded',                 pass: !!profile?.logo_url,       points: 4 },
    { label: 'Job photos captured (1+)',       pass: photoLeads.length >= 1,    points: 3 },
    { label: 'Job photos captured (5+)',       pass: photoLeads.length >= 5,    points: 3 },
  ];
  const photoScore = photoItems.reduce((s, i) => s + (i.pass ? i.points : 0), 0);
  checks.photos = { score: Math.min(photoScore, 10), max: 10, items: photoItems };

  // ─── Total ────────────────────────────────────────────────────
  const total = Object.values(checks).reduce((s, c) => s + c.score, 0);

  return { total, checks };
}