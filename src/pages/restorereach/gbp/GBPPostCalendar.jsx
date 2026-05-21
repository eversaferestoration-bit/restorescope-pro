import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, Trash2, Edit2, CheckCircle2, Clock, X, Save } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45', '--tw-ring-color': '#e05a1c' };

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: '#3a5a7c', bg: '#1e2d45' },
  scheduled: { label: 'Scheduled', color: '#f59e0b', bg: '#f59e0b20' },
  posted: { label: 'Posted', color: '#10b981', bg: '#10b98120' },
};

function EditModal({ post, onClose, onSave }) {
  const [form, setForm] = useState({ title: post.title || '', body: post.body || '', scheduled_date: post.scheduled_date || '', status: post.status || 'draft' });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-lg rounded-2xl border p-6 space-y-4" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Edit Post</h3>
          <button onClick={onClose}><X size={17} className="text-slate-400" /></button>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Title</label>
          <input className={inp} style={inpStyle} value={form.title} onChange={set('title')} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Body</label>
          <textarea className={inp} style={inpStyle} rows={5} value={form.body} onChange={set('body')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Schedule Date</label>
            <input type="date" className={inp} style={inpStyle} value={form.scheduled_date} onChange={set('scheduled_date')} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Status</label>
            <select className={inp} style={inpStyle} value={form.status} onChange={set('status')}>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="posted">Posted</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border text-slate-400 hover:text-white transition" style={{ borderColor: '#1e2d45' }}>Cancel</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5 hover:opacity-90 transition" style={{ background: '#e05a1c' }}>
            <Save size={13} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GBPPostCalendar({ companyId }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['gbp-posts', companyId],
    queryFn: () => base44.entities.GBPPost.filter({ company_id: companyId }, '-created_date', 100),
    enabled: !!companyId,
  });

  const updatePost = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GBPPost.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gbp-posts', companyId] });
      setEditing(null);
      toast({ title: 'Post updated' });
    },
  });

  const deletePost = useMutation({
    mutationFn: (id) => base44.entities.GBPPost.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gbp-posts', companyId] });
      toast({ title: 'Post deleted' });
    },
  });

  const markPosted = (post) => updatePost.mutate({ id: post.id, data: { status: 'posted', posted_date: new Date().toISOString().split('T')[0] } });

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b flex-wrap gap-2" style={{ borderColor: '#1e2d45', background: '#0a1020' }}>
        <div className="flex items-center gap-2">
          <Calendar size={15} style={{ color: '#e05a1c' }} />
          <h2 className="text-sm font-semibold text-white">GBP Post Calendar</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#1e2d45', color: '#7ba3c8' }}>{posts.length}</span>
        </div>
        <div className="flex gap-1.5">
          {['all', 'draft', 'scheduled', 'posted'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="text-xs px-2.5 py-1 rounded-lg capitalize transition"
              style={filter === s ? { background: '#e05a1c', color: '#fff' } : { background: '#1e2d45', color: '#7ba3c8' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: '#1e2d45' }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center">
          <Calendar size={28} className="mx-auto mb-2" style={{ color: '#3a5a7c' }} />
          <p className="text-sm text-white font-medium">No posts {filter !== 'all' ? `with status "${filter}"` : 'yet'}</p>
          <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>Generate posts using the AI Post Generator above</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: '#1e2d45' }}>
          {filtered.map(post => {
            const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
            return (
              <div key={post.id} className="flex items-start gap-3 px-5 py-4 hover:bg-white/3 transition-colors" style={{ borderColor: '#1e2d45' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold text-white truncate">{post.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <p className="text-xs line-clamp-2 mb-1.5" style={{ color: '#7ba3c8' }}>{post.body}</p>
                  <div className="flex flex-wrap gap-3 text-xs" style={{ color: '#3a5a7c' }}>
                    {post.service && <span>🔧 {post.service}</span>}
                    {post.city && <span>📍 {post.city}</span>}
                    {post.scheduled_date && <span className="flex items-center gap-1"><Clock size={10} /> {post.scheduled_date}</span>}
                    {post.posted_date && <span className="flex items-center gap-1"><CheckCircle2 size={10} /> Posted {post.posted_date}</span>}
                  </div>
                  {post.hashtags && <p className="text-xs mt-1" style={{ color: '#3b82f6' }}>{post.hashtags}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {post.status !== 'posted' && (
                    <button onClick={() => markPosted(post)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition hover:text-green-400"
                      style={{ background: '#1e2d45', color: '#7ba3c8' }}
                      title="Mark as Posted">
                      <CheckCircle2 size={12} />
                    </button>
                  )}
                  <button onClick={() => setEditing(post)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition hover:text-orange-400"
                    style={{ background: '#1e2d45', color: '#7ba3c8' }}
                    title="Edit">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => deletePost.mutate(post.id)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition hover:text-red-400"
                    style={{ background: '#1e2d45', color: '#7ba3c8' }}
                    title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EditModal
          post={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => updatePost.mutate({ id: editing.id, data })}
        />
      )}
    </div>
  );
}