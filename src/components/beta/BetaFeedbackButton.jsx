import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageSquare, X, Bug, Lightbulb, HelpCircle, Star } from 'lucide-react';

const TYPES = [
  { value: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500' },
  { value: 'feature_request', label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-500' },
  { value: 'confusion', label: 'Confusing UI', icon: HelpCircle, color: 'text-blue-500' },
  { value: 'praise', label: 'Positive Feedback', icon: Star, color: 'text-green-500' },
];

const SEVERITY = ['low', 'medium', 'high', 'critical'];

export default function BetaFeedbackButton() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ feedback_type: 'bug', title: '', description: '', severity: 'medium' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.description.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await base44.functions.invoke('submitBetaFeedback', {
        ...form,
        page_url: window.location.href,
      });
      setSubmitted(true);
      setTimeout(() => { setOpen(false); setSubmitted(false); setForm({ feedback_type: 'bug', title: '', description: '', severity: 'medium' }); }, 2000);
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 h-10 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-lg hover:bg-primary/90 transition"
        title="Send feedback"
      >
        <MessageSquare size={15} />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold font-display text-sm">Beta Feedback</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-muted transition">
                <X size={16} />
              </button>
            </div>

            {submitted ? (
              <div className="px-5 py-8 text-center">
                <Star size={28} className="text-green-500 mx-auto mb-2" />
                <p className="font-semibold">Thank you!</p>
                <p className="text-sm text-muted-foreground mt-1">Your feedback has been submitted.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                {/* Type selector */}
                <div className="grid grid-cols-2 gap-2">
                  {TYPES.map(t => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, feedback_type: t.value }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition ${form.feedback_type === t.value ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-muted'}`}
                      >
                        <Icon size={13} className={form.feedback_type === t.value ? '' : t.color} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Title <span className="text-destructive">*</span></label>
                  <input
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={form.title}
                    onChange={set('title')}
                    placeholder="Brief summary..."
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Description <span className="text-destructive">*</span></label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    rows={3}
                    value={form.description}
                    onChange={set('description')}
                    placeholder="What happened? What did you expect?"
                    maxLength={2000}
                  />
                </div>

                {form.feedback_type === 'bug' && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Severity</label>
                    <select
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={form.severity}
                      onChange={set('severity')}
                    >
                      {SEVERITY.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                )}

                {error && <p className="text-xs text-destructive">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit Feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}