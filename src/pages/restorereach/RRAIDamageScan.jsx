import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useRRCompany } from '@/hooks/useRRCompany';
import RRAccessGate from './components/RRAccessGate';
import DamageScanUploader from './damage/DamageScanUploader';
import DamageScanResult from './damage/DamageScanResult';
import DamageScanHistory from './damage/DamageScanHistory';
import { toast } from '@/components/ui/use-toast';
import { Scan, Loader2, RotateCcw, History } from 'lucide-react';

const inp = 'w-full px-3 py-2.5 rounded-xl border text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45' };

const ANALYSIS_PROMPT = (photoCount) => `You are an expert water damage and mold remediation inspector with 20+ years of experience.

You are analyzing ${photoCount} photo(s) of a property for damage assessment.

Carefully inspect the images for:
1. Water Intrusion - active leaks, water stains, wet surfaces
2. Ceiling Staining - discoloration, ring patterns, sagging
3. Microbial Growth - visible mold, mildew, dark spots, fuzzy growth
4. Swelling / Warping - buckling floors, swollen wood, deformed materials
5. Flooring Damage - lifted tiles, warped hardwood, wet carpet
6. Visible Contamination - sewage, dirty water, biological matter
7. Structural Concerns - compromised walls, weakened supports, large-scale damage

Based on what you observe, determine:
- Which damage types are present (only include confirmed findings)
- Overall urgency level: emergency (immediate life/safety risk), high (severe damage spreading fast), medium (significant but stable), low (minor, cosmetic)
- Confidence score 0-100 based on image clarity and damage visibility
- A professional 2-3 sentence summary for the restoration company
- 4-6 specific recommended next steps

Return ONLY valid JSON:
{
  "damage_types": ["list only damage types actually visible — pick from: Water Intrusion, Ceiling Staining, Microbial Growth, Swelling / Warping, Flooring Damage, Visible Contamination, Structural Concerns"],
  "urgency_level": "emergency | high | medium | low",
  "confidence_score": 0-100,
  "summary": "Professional 2-3 sentence damage assessment summary",
  "next_steps": [
    "Specific action 1",
    "Specific action 2",
    "Specific action 3",
    "Specific action 4"
  ]
}`;

export default function RRAIDamageScan() {
  const { companyId, profileLoading, isReady } = useRRCompany();

  const [photos, setPhotos] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const canAnalyze = photos.length > 0 && !analyzing;

  const handleAnalyze = async () => {
    if (!photos.length) {
      toast({ title: 'Upload at least one photo', variant: 'destructive' });
      return;
    }
    setAnalyzing(true);
    setResult(null);
    try {
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: ANALYSIS_PROMPT(photos.length),
        file_urls: photos,
        response_json_schema: {
          type: 'object',
          properties: {
            damage_types: { type: 'array', items: { type: 'string' } },
            urgency_level: { type: 'string' },
            confidence_score: { type: 'number' },
            summary: { type: 'string' },
            next_steps: { type: 'array', items: { type: 'string' } },
          },
        },
      });
      setResult(analysis);
    } catch (err) {
      toast({ title: 'Analysis failed', description: err?.message, variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setPhotos([]);
    setCustomerName('');
    setPropertyAddress('');
    setResult(null);
  };

  return (
    <RRAccessGate isReady={isReady} profileLoading={profileLoading}>
      <div className="p-4 md:p-7 max-w-5xl mx-auto space-y-5 md:space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Scan size={22} style={{ color: '#e05a1c' }} /> AI Damage Scan
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
              Upload damage photos for instant AI-powered severity analysis
            </p>
          </div>
          <button
            onClick={() => setShowHistory(s => !s)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition shrink-0 min-h-[44px]"
            style={showHistory
              ? { background: '#e05a1c25', borderColor: '#e05a1c', color: '#e05a1c' }
              : { background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}
          >
            <History size={14} /> Scan History
          </button>
        </div>

        {/* History panel */}
        {showHistory && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>Recent Scans</h2>
            <DamageScanHistory companyId={companyId} />
          </div>
        )}

        {/* Main scan card */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
          {/* Card header */}
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
            <div className="flex items-center gap-2">
              <Scan size={14} style={{ color: '#e05a1c' }} />
              <span className="text-sm font-semibold text-white">New Damage Scan</span>
            </div>
            {(photos.length > 0 || result) && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition"
                style={{ background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}
              >
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>

          <div className="p-5 space-y-5">
            {/* Property info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>
                  Customer Name <span style={{ color: '#3a5a7c' }}>(optional)</span>
                </label>
                <input
                  className={inp}
                  style={inpStyle}
                  placeholder="John Smith"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: '#7ba3c8' }}>
                  Property Address <span style={{ color: '#3a5a7c' }}>(optional)</span>
                </label>
                <input
                  className={inp}
                  style={inpStyle}
                  placeholder="123 Main St, Springfield, MO"
                  value={propertyAddress}
                  onChange={e => setPropertyAddress(e.target.value)}
                />
              </div>
            </div>

            {/* Photo uploader */}
            <div>
              <label className="text-xs font-semibold block mb-2" style={{ color: '#7ba3c8' }}>
                Damage Photos <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <DamageScanUploader photos={photos} onChange={setPhotos} />
            </div>

            {/* Analyze button */}
            {!result && (
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: canAnalyze ? '#e05a1c' : '#1e2d45' }}
              >
                {analyzing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Analyzing photos with AI…
                  </>
                ) : (
                  <>
                    <Scan size={16} />
                    {photos.length === 0
                      ? 'Upload photos to analyze'
                      : `Analyze ${photos.length} Photo${photos.length > 1 ? 's' : ''}`}
                  </>
                )}
              </button>
            )}

            {/* Analyzing state */}
            {analyzing && (
              <div className="rounded-xl border p-6 text-center" style={{ background: '#0a1020', borderColor: '#1e2d45' }}>
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Loader2 size={22} className="animate-spin" style={{ color: '#e05a1c' }} />
                  <span className="text-sm font-semibold text-white">AI is analyzing damage…</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    'Scanning for water intrusion patterns…',
                    'Checking for microbial growth indicators…',
                    'Assessing structural integrity…',
                    'Calculating urgency score…',
                  ].map((msg, i) => (
                    <p key={i} className="text-xs" style={{ color: '#3a5a7c' }}>{msg}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {result && !analyzing && (
              <DamageScanResult
                result={result}
                photos={photos}
                companyId={companyId}
                customerName={customerName}
                propertyAddress={propertyAddress}
                onSaved={handleReset}
              />
            )}
          </div>
        </div>
      </div>
    </RRAccessGate>
  );
}