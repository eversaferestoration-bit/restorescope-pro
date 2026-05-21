import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { CloudLightning, Zap, AlertTriangle, Copy, CheckCircle, Radio } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const STORM_TYPES = ['Hurricane', 'Tornado', 'Severe Thunderstorm', 'Hail Storm', 'Flash Flood', 'Ice Storm', 'Wildfire', 'High Wind Event'];
const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45', '--tw-ring-color': '#e05a1c' };

export default function RRStormMode() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [active, setActive] = useState(false);
  const [stormType, setStormType] = useState('Severe Thunderstorm');
  const [affectedCity, setAffectedCity] = useState('');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [copied, setCopied] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['rr-profile'],
    queryFn: () => base44.entities.RRCompanyProfile.filter({ created_by: user?.email }),
  });
  const companyProfile = profile?.[0];
  const companyId = companyProfile?.id || user?.email || 'default';

  const saveCampaign = useMutation({
    mutationFn: (data) => base44.entities.RRMarketingCampaign.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rr-campaigns'] }),
  });

  const generate = async () => {
    setGenerating(true);
    setResults(null);
    try {
      const name = companyProfile?.company_name || 'our restoration company';
      const phone = companyProfile?.phone || 'CALL NOW';
      const city = affectedCity || 'your area';

      const prompt = `You are a restoration company marketing expert. Generate a complete storm response marketing package.

Company: ${name} | Phone: ${phone} | Storm Type: ${stormType} | Affected Area: ${city}

Generate ALL of the following (clearly labeled with headers):

1. **GBP EMERGENCY POST** (200 words - urgent, local, professional)

2. **FACEBOOK POST** (150 words with emoji - community-focused, helpful)

3. **GOOGLE ADS HEADLINES** (5 headlines, max 30 chars each - urgent, local)

4. **SMS BLAST TEMPLATE** (max 160 chars - urgent CTA with phone)

5. **DOOR HANGER COPY** (50 words - brief, professional, clear CTA)

6. **NEXTDOOR POST** (100 words - neighbor-to-neighbor tone, helpful)

Make all content urgent but professional. Focus on helping homeowners in crisis. Include ${phone} in each piece.`;

      const generated = await base44.integrations.Core.InvokeLLM({ prompt });
      setResults(generated);
      setActive(true);

      saveCampaign.mutate({
        company_id: companyId,
        campaign_name: `Storm Mode - ${stormType} - ${city}`,
        campaign_type: 'storm_alert',
        status: 'active',
        target_city: affectedCity,
        target_service: 'Storm Damage',
        content_generated: [{ type: 'storm_pack', content: generated, created_at: new Date().toISOString() }],
        posts_created: 6,
      });

      toast({ title: '⚡ Storm Mode Activated!', description: 'All content generated and campaign saved.' });
    } catch (err) {
      toast({ title: 'Failed', description: err?.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
    toast({ title: 'Copied!' });
  };

  return (
    <div className="p-5 md:p-7 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CloudLightning size={22} style={{ color: '#e05a1c' }} /> Storm Mode
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>Deploy instant storm response marketing across all channels</p>
      </div>

      {/* Storm Mode toggle */}
      <div className={`rounded-2xl border p-6 mb-6 transition-all ${active ? 'border-orange-500/50' : 'border-slate-700'}`}
        style={{ background: active ? '#1a0a00' : '#0d1829' }}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-orange-500' : 'bg-slate-700'}`}>
            <CloudLightning size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-bold text-white">Storm Response</h2>
              {active && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-orange-400 px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
                  <Radio size={10} className="animate-pulse" /> ACTIVE
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: '#7ba3c8' }}>Generate a complete multi-channel storm response campaign in seconds</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Storm Type</label>
            <select className={inp} style={inpStyle} value={stormType} onChange={e => setStormType(e.target.value)}>
              {STORM_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Affected City / Area</label>
            <input className={inp} style={inpStyle} placeholder="Nashville, TN" value={affectedCity} onChange={e => setAffectedCity(e.target.value)} />
          </div>
        </div>

        <button onClick={generate} disabled={generating}
          className="mt-4 w-full py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: generating ? '#7a3010' : '#e05a1c' }}>
          <CloudLightning size={16} />
          {generating ? 'Generating Storm Pack…' : '⚡ Activate Storm Mode — Generate All Content'}
        </button>
      </div>

      {/* Results */}
      {generating && (
        <div className="rounded-xl border p-8 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white font-semibold">Generating your Storm Response Pack…</p>
          <p className="text-sm mt-1" style={{ color: '#7ba3c8' }}>Creating GBP post, Facebook, Google Ads, SMS, door hanger & Nextdoor content</p>
        </div>
      )}

      {results && !generating && (
        <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
            <CheckCircle size={16} className="text-green-400" />
            <p className="text-sm font-semibold text-white">Storm Response Pack Generated</p>
            <button onClick={() => copy(results, 'all')}
              className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition"
              style={{ background: copied === 'all' ? '#10b98133' : '#1e2d45', color: copied === 'all' ? '#10b981' : '#7ba3c8' }}>
              {copied === 'all' ? <CheckCircle size={11} /> : <Copy size={11} />}
              Copy All
            </button>
          </div>
          <div className="p-5">
            <div className="rounded-lg p-4 overflow-y-auto max-h-[500px]" style={{ background: '#0a1020' }}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#c8d9eb' }}>{results}</p>
            </div>
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="mt-6 rounded-xl border p-5" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <AlertTriangle size={14} style={{ color: '#f59e0b' }} /> Storm Response Checklist
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            'Post GBP emergency update immediately',
            'Activate Google Ads storm campaign',
            'Send SMS blast to previous customers',
            'Post on Facebook community groups',
            'Deploy Nextdoor posts in affected areas',
            'Brief your team on surge capacity',
            'Set up call routing for overflow',
            'Document all storm leads separately',
          ].map((item, i) => (
            <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 accent-orange-500" />
              <span className="text-sm" style={{ color: '#7ba3c8' }}>{item}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}