import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import {
  AlertTriangle, CheckCircle, Zap, Save, UserPlus,
  Calendar, ChevronDown, ChevronUp, ShieldAlert, Droplets
} from 'lucide-react';

const URGENCY_CONFIG = {
  emergency: { label: 'Emergency',  color: '#dc2626', bg: '#dc262620', icon: ShieldAlert },
  high:      { label: 'High',       color: '#ef4444', bg: '#ef444420', icon: AlertTriangle },
  medium:    { label: 'Medium',     color: '#f59e0b', bg: '#f59e0b20', icon: Droplets },
  low:       { label: 'Low',        color: '#10b981', bg: '#10b98120', icon: CheckCircle },
};

const DAMAGE_ICONS = {
  'Water Intrusion': '💧',
  'Ceiling Staining': '🟤',
  'Microbial Growth': '🦠',
  'Swelling / Warping': '📐',
  'Flooring Damage': '🪵',
  'Visible Contamination': '⚠️',
  'Structural Concerns': '🏚️',
};

export default function DamageScanResult({ result, photos, companyId, customerName, propertyAddress, onSaved }) {
  const qc = useQueryClient();
  const [showSteps, setShowSteps] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const urgency = URGENCY_CONFIG[result.urgency_level] || URGENCY_CONFIG.medium;
  const UrgencyIcon = urgency.icon;

  const saveScan = async () => {
    setSaving(true);
    try {
      await base44.entities.DamageScan.create({
        company_id: companyId,
        customer_name: customerName,
        property_address: propertyAddress,
        uploaded_photos: photos,
        detected_damage_types: result.damage_types,
        urgency_level: result.urgency_level,
        confidence_score: result.confidence_score,
        ai_summary: result.summary,
        recommended_next_steps: result.next_steps,
        created_date: new Date().toISOString(),
        status: 'analyzed',
      });
      qc.invalidateQueries({ queryKey: ['damage-scans'], exact: false });
      toast({ title: '✅ Scan saved successfully' });
      if (onSaved) onSaved();
    } catch (err) {
      toast({ title: 'Save failed', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const createLead = async () => {
    setCreating(true);
    try {
      // Determine service from damage types
      const damageTypes = result.damage_types || [];
      let service = 'Water Damage Restoration';
      if (damageTypes.some(d => d.includes('Mold') || d.includes('Microbial'))) service = 'Mold Remediation';
      else if (damageTypes.some(d => d.includes('Structural'))) service = 'Structural Drying';

      await base44.entities.EmergencyLead.create({
        company_id: companyId,
        customer_name: customerName || 'Unknown',
        address: propertyAddress || '',
        service_needed: service,
        what_happened: result.summary,
        urgency_level: result.urgency_level,
        urgency_score: result.confidence_score,
        urgency_reasons: result.damage_types,
        photos: photos,
        status: 'new',
        visible_mold: damageTypes.some(d => d.includes('Microbial') || d.includes('Mold')),
        standing_water: damageTypes.some(d => d.includes('Water Intrusion')),
      });
      qc.invalidateQueries({ queryKey: ['emergency-leads'], exact: false });
      toast({ title: '🚨 Lead created from scan', description: 'Visible in Lead Capture' });
    } catch (err) {
      toast({ title: 'Lead creation failed', description: err?.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const scheduleInspection = () => {
    toast({ title: '📅 Inspection Scheduled', description: 'This would integrate with your calendar.' });
  };

  return (
    <div className="space-y-4">
      {/* Urgency hero */}
      <div className="rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ background: urgency.bg, borderColor: urgency.color + '50' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: urgency.color + '30' }}>
          <UrgencyIcon size={26} style={{ color: urgency.color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: urgency.color }}>
              Urgency Level
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: urgency.color + '30', color: urgency.color }}>
              {urgency.label}
            </span>
          </div>
          <p className="text-base font-bold text-white">
            Confidence: {result.confidence_score}%
          </p>
          <p className="text-sm mt-1" style={{ color: '#c8d9eb' }}>{result.summary}</p>
        </div>
      </div>

      {/* Detected damage types */}
      <div className="rounded-xl border p-4" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>
          Detected Damage Types
        </p>
        {result.damage_types?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {result.damage_types.map((d, i) => (
              <span key={i} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border font-medium"
                style={{ background: '#1e2d45', borderColor: '#2a3a55', color: '#c8d9eb' }}>
                <span>{DAMAGE_ICONS[d] || '⚡'}</span> {d}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#7ba3c8' }}>No specific damage types identified.</p>
        )}
      </div>

      {/* Recommended next steps */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <button
          onClick={() => setShowSteps(s => !s)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition"
        >
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap size={14} style={{ color: '#e05a1c' }} /> Recommended Next Steps
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#e05a1c20', color: '#e05a1c' }}>
              {result.next_steps?.length || 0}
            </span>
          </p>
          {showSteps ? <ChevronUp size={14} style={{ color: '#3a5a7c' }} /> : <ChevronDown size={14} style={{ color: '#3a5a7c' }} />}
        </button>
        {showSteps && result.next_steps?.length > 0 && (
          <div className="border-t px-5 py-3 space-y-2" style={{ borderColor: '#1e2d45' }}>
            {result.next_steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 py-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{ background: '#e05a1c20', color: '#e05a1c' }}>{i + 1}</div>
                <p className="text-sm" style={{ color: '#c8d9eb' }}>{step}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 pt-1">
        <button
          onClick={saveScan}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50"
          style={{ background: '#3b82f6' }}
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
          Save Scan
        </button>
        <button
          onClick={createLead}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50"
          style={{ background: '#e05a1c' }}
        >
          {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus size={14} />}
          Create Lead
        </button>
        <button
          onClick={scheduleInspection}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition border"
          style={{ background: '#0a1020', borderColor: '#1e2d45', color: '#7ba3c8' }}
        >
          <Calendar size={14} /> Schedule Inspection
        </button>
      </div>
    </div>
  );
}