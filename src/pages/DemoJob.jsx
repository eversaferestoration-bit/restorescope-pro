import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '@/lib/DemoContext';
import {
  DEMO_JOB, DEMO_INSURED, DEMO_PROPERTY,
  DEMO_ROOMS, DEMO_ESTIMATE, DEMO_DEFENSE,
} from '@/lib/demoData';
import {
  AlertCircle, ArrowLeft, Shield, CheckCircle2,
  FileText, ChevronRight, AlertTriangle, Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const TAB_LABELS = ['Overview', 'Estimate', 'Defense', 'Export'];

const CATEGORY_COLORS = {
  extraction:    'bg-blue-100 text-blue-700',
  drying:        'bg-cyan-100 text-cyan-700',
  demolition:    'bg-red-100 text-red-700',
  cleaning:      'bg-green-100 text-green-700',
  hepa:          'bg-purple-100 text-purple-700',
  containment:   'bg-amber-100 text-amber-700',
  documentation: 'bg-slate-100 text-slate-700',
};

function Section({ title, children }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3">
      <h3 className="text-sm font-semibold font-display text-muted-foreground uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value || '—'}</span>
    </div>
  );
}

export default function DemoJob() {
  const navigate = useNavigate();
  const { isDemo, exitDemo } = useDemo();
  const [tab, setTab] = useState(0);
  const [exportMsg, setExportMsg] = useState('');

  // Guard: if not in demo mode, redirect
  if (!isDemo) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleFakeExport = (type) => {
    setExportMsg(`✓ "${type}" would download here in a real account.`);
    setTimeout(() => setExportMsg(''), 3000);
  };

  const groupedItems = DEMO_ESTIMATE.line_items.reduce((acc, item) => {
    if (!acc[item.room_name]) acc[item.room_name] = [];
    acc[item.room_name].push(item);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition mt-0.5"
        >
          <ArrowLeft size={15} /> Dashboard
        </button>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold font-display">{DEMO_JOB.job_number}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">In Progress</span>
            {DEMO_JOB.emergency_flag && (
              <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full font-medium">
                <AlertCircle size={11} /> Emergency
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{DEMO_PROPERTY.address_line_1}, {DEMO_PROPERTY.city}, {DEMO_PROPERTY.state}</p>
        </div>
        <button
          onClick={exitDemo}
          className="inline-flex items-center gap-1.5 text-sm px-4 h-9 rounded-lg border border-border hover:bg-muted transition font-medium"
        >
          Exit Demo
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {TAB_LABELS.map((label, i) => (
          <button
            key={label}
            onClick={() => setTab(i)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              tab === i ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="Job Info">
            <KV label="Loss Type" value={DEMO_JOB.loss_type.charAt(0).toUpperCase() + DEMO_JOB.loss_type.slice(1)} />
            <KV label="Service Type" value={DEMO_JOB.service_type} />
            <KV label="Cause of Loss" value={DEMO_JOB.cause_of_loss} />
            <KV label="Date of Loss" value={format(new Date(DEMO_JOB.date_of_loss), 'MMMM d, yyyy')} />
            <KV label="Inspection Date" value={format(new Date(DEMO_JOB.inspection_date), 'MMMM d, yyyy')} />
          </Section>

          <Section title="Insured & Property">
            <KV label="Insured" value={DEMO_INSURED.full_name} />
            <KV label="Phone" value={DEMO_INSURED.phone} />
            <KV label="Email" value={DEMO_INSURED.email} />
            <KV label="Address" value={`${DEMO_PROPERTY.address_line_1}, ${DEMO_PROPERTY.city}, ${DEMO_PROPERTY.state} ${DEMO_PROPERTY.zip}`} />
          </Section>

          <Section title="Affected Rooms">
            {DEMO_ROOMS.filter(r => r.affected).map(r => (
              <div key={r.id} className="flex justify-between text-sm">
                <span>{r.name}</span>
                <span className="text-muted-foreground">{r.square_footage} sqft</span>
              </div>
            ))}
          </Section>

          <Section title="Summary Notes">
            <p className="text-sm text-foreground leading-relaxed">{DEMO_JOB.summary_notes}</p>
          </Section>
        </div>
      )}

      {/* Estimate */}
      {tab === 1 && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <h3 className="font-semibold font-display">{DEMO_ESTIMATE.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Approved by {DEMO_ESTIMATE.approved_by}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold font-display">${DEMO_ESTIMATE.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted-foreground">incl. {((DEMO_ESTIMATE.modifier_total - 1) * 100).toFixed(0)}% modifiers</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2.5 py-1 rounded-full font-medium">
              <CheckCircle2 size={11} /> Approved
            </span>
          </div>

          {Object.entries(groupedItems).map(([room, items]) => (
            <div key={room} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
                <p className="text-sm font-semibold">{room}</p>
              </div>
              <div className="divide-y divide-border">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', CATEGORY_COLORS[item.category] || 'bg-muted text-muted-foreground')}>
                      {item.category}
                    </span>
                    <span className="text-sm flex-1">{item.description}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{item.quantity} {item.unit} × ${item.unit_cost}</span>
                    <span className="text-sm font-semibold shrink-0">${item.line_total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-card rounded-xl border border-border p-4 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="text-sm font-semibold">${DEMO_ESTIMATE.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      {/* Defense */}
      {tab === 2 && (
        <div className="space-y-4">
          {/* Score */}
          <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-5">
            <div className="w-20 h-20 rounded-full border-4 border-green-400 flex flex-col items-center justify-center shrink-0">
              <span className="text-2xl font-bold font-display text-green-600">{DEMO_DEFENSE.defense_score}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <div>
              <h3 className="font-semibold font-display">Defense Score</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{DEMO_DEFENSE.analysis_summary}</p>
              <span className="inline-block mt-2 text-xs text-green-700 bg-green-100 px-2.5 py-1 rounded-full font-medium">
                Low Carrier Pushback Risk
              </span>
            </div>
          </div>

          {/* Risk flags */}
          <Section title="Risk Flags">
            {DEMO_DEFENSE.risk_flags.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm">{f.description}</p>
                  <span className="text-xs text-amber-600 font-medium capitalize">{f.severity} severity — {f.category}</span>
                </div>
              </div>
            ))}
          </Section>

          {/* Recommended actions */}
          <Section title="Recommended Actions">
            {DEMO_DEFENSE.recommended_actions.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <ChevronRight size={14} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{a.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.rationale}</p>
                </div>
              </div>
            ))}
          </Section>
        </div>
      )}

      {/* Export */}
      {tab === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            In a real account, these buttons generate and download PDFs instantly.
          </p>

          {exportMsg && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              {exportMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: 'Estimate PDF',           icon: FileText,   color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200',   desc: 'Full line-item breakdown with totals and approval record.' },
              { key: 'Photo Report',           icon: FileText,   color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', desc: 'All job photos organized by room with AI damage tags.' },
              { key: 'Justification Package', icon: Shield,     color: 'text-green-600', bg: 'bg-green-50 border-green-200',  desc: 'Carrier-facing justification notes with evidence appendix.' },
            ].map(({ key, icon: Icon, color, bg, desc }) => (
              <div key={key} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', bg)}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{key}</p>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </div>
                <button
                  onClick={() => handleFakeExport(key)}
                  className="mt-auto w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition"
                >
                  <Download size={14} /> Export {key}
                </button>
              </div>
            ))}
          </div>

          <div className="bg-muted/40 rounded-xl border border-dashed border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Ready to run your own jobs?{' '}
              <button onClick={exitDemo} className="text-primary font-semibold hover:underline">
                Exit Demo →
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}