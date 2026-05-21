import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Building2, Zap, Copy, CheckCircle, Plus, Calendar } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const POST_TYPES = ['Water Damage Response', 'Storm Damage Alert', 'Mold Prevention Tips', 'Fire Damage Restoration', 'Before & After Story', 'Service Announcement', 'Seasonal Tips', 'Community Spotlight'];
const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45', '--tw-ring-color': '#e05a1c' };

export default function RRGBPCommand() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [postType, setPostType] = useState('Water Damage Response');
  const [city, setCity] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['rr-profile'],
    queryFn: () => base44.entities.RRCompanyProfile.filter({ created_by: user?.email }),
  });
  const companyProfile = profile?.[0];
  const companyId = companyProfile?.id || user?.email || 'default';

  const { data: campaigns = [] } = useQuery({
    queryKey: ['rr-campaigns'],
    queryFn: () => base44.entities.RRMarketingCampaign.list('-created_date', 50),
  });

  const saveCampaign = useMutation({
    mutationFn: (data) => base44.entities.RRMarketingCampaign.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rr-campaigns'] }),
  });

  const generatePost = async () => {
    setGenerating(true);
    setGeneratedPost(null);
    try {
      const companyName = companyProfile?.company_name || 'our restoration company';
      const phone = companyProfile?.phone || '';
      const prompt = `You are a local SEO and Google Business Profile expert for restoration companies.
Generate a compelling GBP post for:
- Company: ${companyName}
- Post Type: ${postType}
- Target City: ${city || 'our service area'}
- Phone: ${phone}

Requirements:
- 150-300 words
- Include a strong call-to-action
- Mention specific services
- Local city/area references
- Urgency when appropriate
- End with phone number or contact info
- Use line breaks for readability
- Include 3-5 relevant hashtags at the end

Return ONLY the post text, ready to copy-paste.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setGeneratedPost(result);

      await saveCampaign.mutate({
        company_id: companyId,
        campaign_name: `GBP Post - ${postType} - ${city || 'General'}`,
        campaign_type: 'gbp_post',
        status: 'draft',
        target_city: city,
        target_service: postType,
        content_generated: [{ type: 'gbp_post', content: result, created_at: new Date().toISOString() }],
        posts_created: 1,
      });
    } catch (err) {
      toast({ title: 'Generation failed', description: err?.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const copyPost = () => {
    navigator.clipboard.writeText(generatedPost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied to clipboard!' });
  };

  const gbpCampaigns = campaigns.filter(c => c.campaign_type === 'gbp_post');

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 size={22} style={{ color: '#e05a1c' }} /> GBP Command Center
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>Generate and manage your Google Business Profile posts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generator */}
        <div className="rounded-xl border p-5 space-y-4" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} style={{ color: '#e05a1c' }} />
            <h2 className="text-sm font-semibold text-white">AI Post Generator</h2>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Post Type</label>
            <select className={inp} style={inpStyle} value={postType} onChange={e => setPostType(e.target.value)}>
              {POST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Target City (optional)</label>
            <input className={inp} style={inpStyle} placeholder="e.g. Nashville, TN" value={city} onChange={e => setCity(e.target.value)} />
          </div>

          {!companyProfile && (
            <div className="rounded-lg p-3 border border-yellow-500/30 text-xs text-yellow-400" style={{ background: '#1a1200' }}>
              ⚠️ Complete your company profile in Settings for better AI output
            </div>
          )}

          <button onClick={generatePost} disabled={generating}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#e05a1c' }}>
            <Zap size={15} /> {generating ? 'Generating…' : 'Generate GBP Post'}
          </button>
        </div>

        {/* Output */}
        <div className="rounded-xl border p-5 flex flex-col" style={{ background: '#0d1829', borderColor: '#1e2d45', minHeight: 260 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Generated Post</h2>
            {generatedPost && (
              <button onClick={copyPost}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition font-medium"
                style={{ background: copied ? '#10b98133' : '#1e2d45', color: copied ? '#10b981' : '#7ba3c8' }}>
                {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy Post'}
              </button>
            )}
          </div>

          {generating ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm" style={{ color: '#7ba3c8' }}>AI is crafting your post…</p>
              </div>
            </div>
          ) : generatedPost ? (
            <div className="flex-1 rounded-lg p-3 overflow-y-auto" style={{ background: '#0a1020' }}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#c8d9eb' }}>{generatedPost}</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Building2 size={28} className="mx-auto mb-2" style={{ color: '#3a5a7c' }} />
                <p className="text-sm" style={{ color: '#3a5a7c' }}>Your generated post will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Past campaigns */}
      {gbpCampaigns.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Calendar size={15} style={{ color: '#7ba3c8' }} /> Recent GBP Posts ({gbpCampaigns.length})
          </h2>
          <div className="space-y-2">
            {gbpCampaigns.slice(0, 5).map((c) => (
              <div key={c.id} className="rounded-xl border p-3 flex items-center gap-3" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{c.campaign_name}</p>
                  <p className="text-xs" style={{ color: '#7ba3c8' }}>{c.target_city || 'General'} · {new Date(c.created_date || Date.now()).toLocaleDateString()}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: '#1e2d45', color: '#7ba3c8' }}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}