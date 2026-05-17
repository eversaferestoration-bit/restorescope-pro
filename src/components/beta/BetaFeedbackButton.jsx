import { useState } from 'react';
import { MessageSquarePlus, X, Send, Camera, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const FEEDBACK_TYPES = [
  { value: 'bug', label: '🐛 Bug Report' },
  { value: 'feature_request', label: '💡 Feature Request' },
  { value: 'confusion', label: '😕 Confusing UX' },
  { value: 'performance', label: '🐢 Slow / Performance' },
  { value: 'general', label: '💬 General Feedback' },
];

const SEVERITIES = [
  { value: 'low', label: 'Low', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
];

export default function BetaFeedbackButton({ companyId }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    feedback_type: 'bug',
    severity: 'medium',
    title: '',
    description: '',
    screenshot_url: '',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));

  const handleScreenshot = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, screenshot_url: file_url }));
    } catch {
      // silent — screenshot is optional
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    if (!user || !companyId) return;

    setSubmitting(true);
    try {
      await base44.entities.BetaFeedback.create({
        company_id: companyId,
        user_id: user.id,
        user_email: user.email,
        feedback_type: form.feedback_type,
        severity: form.severity,
        title: form.title.trim(),
        description: form.description.trim(),
        page_url: window.location.pathname,
        screenshot_url: form.screenshot_url || null,
        device_info: navigator.userAgent,
        status: 'open',
        is_deleted: false,
      });
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setForm({ feedback_type: 'bug', severity: 'medium', title: '', description: '', screenshot_url: '' });
      }, 2000);
    } catch {
      // fail silently for beta testers
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || !companyId) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-full shadow-lg text-sm font-semibold hover:bg-primary/90 transition"
        aria-label="Send beta feedback"
      >
        <MessageSquarePlus size={16} />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold font-display">Beta Feedback</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-muted transition">
                <X size={16} />
              </button>
            </div>

            {submitted ? (
              <div className="py-8 text-center">
                <p className="text-2xl mb-2">🎉</p>
                <p className="font-semibold">Thanks for your feedback!</p>
                <p className="text-sm text-muted-foreground mt-1">It helps us build a better app.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Type</label>
                  <select
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={form.feedback_type}
                    onChange={set('feedback_type')}
                  >
                    {FEEDBACK_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Severity</label>
                  <div className="flex gap-2">
                    {SEVERITIES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, severity: s.value }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                          form.severity === s.value
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Title *</label>
                  <input
                    className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Brief summary of the issue"
                    value={form.title}
                    onChange={set('title')}
                    maxLength={120}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Description *</label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    rows={4}
                    placeholder="Steps to reproduce, what you expected, what happened..."
                    value={form.description}
                    onChange={set('description')}
                    maxLength={2000}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Screenshot (optional)</label>
                  {form.screenshot_url ? (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <Camera size={12} /> Screenshot attached
                      <button type="button" onClick={() => setForm((f) => ({ ...f, screenshot_url: '' }))} className="text-muted-foreground hover:text-foreground ml-auto">Remove</button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition">
                      <Camera size={14} />
                      {uploading ? 'Uploading…' : 'Attach screenshot'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleScreenshot} disabled={uploading} />
                    </label>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 h-9 rounded-lg border border-border text-sm hover:bg-muted transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !form.title.trim() || !form.description.trim()}
                    className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    {submitting ? 'Sending…' : 'Send Feedback'}
                  </button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Page: {window.location.pathname}
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}