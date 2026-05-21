import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, Edit2, Trash2, CheckCircle, Clock, X, Save } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const inp = 'w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition';
const inpStyle = { background: '#0a1020', borderColor: '#1e2d45', '--tw-ring-color': '#e05a1c' };

const STATUS_STYLES = {
  draft: 'bg-slate-500/20 text-slate-400',
  scheduled: 'bg-blue-500/20 text-blue-400',
  posted: 'bg-green-500/20 text-green-400',
  archived: 'bg-slate-700/30 text-slate-500',
};

function EditModal({ post, onClose, onSave }) {
  const [form, setForm] = useState({ title: post.title || '', body: post.body || '', scheduled_date: post.scheduled_date || '', status: post.status || 'draft' });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-lg rounded-2xl border p-6 space-y-3 max-h-[90vh] overflow-y-auto" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Edit Post</h2>
          <button onClick={onClose}><X size={16} className="text-slate-400" /></button>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Title</label>
          <input className={inp} style={inpStyle} value={form.title} onChange={set('title')} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1 block">Body</label>
          <textarea className={inp} style={inpStyle} rows={6} value={form.body} onChange={set('body')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Scheduled Date</label>
            <input type="date" className={inp} style={inpStyle} value={form.scheduled_date} onChange={set('scheduled_date')} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Status</label>
            <select className={inp} style={inpStyle} value={form.status} onChange={set('status')}>
              {['draft','scheduled','posted','archived'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm border text-slate-400 hover:text-white transition" style={{ borderColor: '#1e2d45' }}>Cancel</button>
          <button onClick={() => onSave(post.id, form)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5 hover:opacity-90 transition" style={{ background: '#e05a1c' }}>
            <Save size={13} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GBPPostCalendar({ companyId }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['gbp-posts'],
    queryFn: () => base44.entities.GBPPost.list('-created_date', 100),
  });

  const updatePost = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GBPPost.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gbp-posts'] });
      setEditing(null);
      toast({ title: 'Post updated' });
    },
  });

  const deletePost = useMutation({
    mutationFn: (id) => base44.entities.GBPPost.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gbp-posts'] });
      toast({ title: 'Post deleted' });
    },
  });

  const markPosted = (id) => updatePost.mutate({ id, data: { status: 'posted', posted_date: new Date().toISOString().split('T')[0] } });

  const filtered = filterStatus === 'all' ? posts : posts.filter(p => p.status === filterStatus);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: '#1e2d45' }}>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Calendar size={15} style={{ color: '#3b82f6' }} /> GBP Post Calendar ({posts.length})
        </h2>
        <div className="flex gap-1.5 flex-wrap">
          {['all','draft','scheduled','posted'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition"
              style={filterStatus === s ? { background: '#e05a1c', color: '#fff' } : { background: '#1e2d45', color: '#7ba3c8' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: '#1e2d45' }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center">
          <Calendar size={28} className="mx-auto mb-2" style={{ color: '#3a5a7c' }} />
          <p className="text-sm" style={{ color: '#7ba3c8' }}>No posts yet — generate one above</p>
        </div>
      ) : (
        <div className="divide-y" style={{ divideColor: '#1e2d45' }}>
          {filtered.map(post => (
            <div key={post.id} className="px-5 py-3 hover:bg-white/3 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-medium text-white truncate">{post.title || 'Untitled Post'}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[post.status] || STATUS_STYLES.draft}`}>{post.status}</span>
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: '#7ba3c8' }}>{post.body}</p>
                  <div className="flex gap-3 mt-1 text-xs" style={{ color: '#3a5a7c' }}>
                    {post.city && <span>📍 {post.city}</span>}
                    {post.service && <span>🔧 {post.service}</span>}
                    {post.scheduled_date && <span><Clock size={10} className="inline mr-0.5" />{post.scheduled_date}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {post.status !== 'posted' && (
                    <button onClick={() => markPosted(post.id)} title="Mark as posted"
                      className="w-7 h-7 flex items-center justify-center rounded-lg transition hover:bg-green-500/20"
                      style={{ color: '#10b981' }}>
                      <CheckCircle size={14} />
                    </button>
                  )}
                  <button onClick={() => setEditing(post)} title="Edit"
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition hover:bg-white/10"
                    style={{ color: '#7ba3c8' }}>
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => deletePost.mutate(post.id)} title="Delete"
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition hover:bg-red-500/20"
                    style={{ color: '#ef4444' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <EditModal post={editing} onClose={() => setEditing(null)} onSave={(id, data) => updatePost.mutate({ id, data })} />}
    </div>
  );
}