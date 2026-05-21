import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function LeadNotes({ lead }) {
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState('internal_comment');

  const { data: notes = [] } = useQuery({
    queryKey: ['lead-notes', lead.id],
    queryFn: () => base44.entities.LeadNote.filter({
      lead_id: lead.id,
      is_deleted: false,
    }, '-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('addLeadNote', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-notes', lead.id] });
      qc.invalidateQueries({ queryKey: ['lead', lead.id] });
      setContent('');
      toast({ title: '✅ Note added' });
    },
    onError: (err) => {
      toast({
        title: '❌ Failed to add note',
        description: err?.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LeadNote.update(id, { is_deleted: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-notes', lead.id] });
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) {
      toast({ title: 'Note cannot be empty', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      lead_id: lead.id,
      content,
      note_type: noteType,
    });
  };

  return (
    <div className="space-y-6">
      {/* Add Note */}
      <div className="rounded-xl border p-6 bg-card">
        <label className="text-xs font-medium text-muted-foreground block mb-3">Add Note</label>
        <div className="space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your note…"
            className="w-full px-4 py-3 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none h-24"
          />
          <div className="flex items-center gap-3">
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              className="px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="internal_comment">Internal Comment</option>
              <option value="customer_note">Customer Note</option>
            </select>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="ml-auto px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2">
              {createMutation.isPending && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {createMutation.isPending ? 'Adding…' : 'Add Note'}
            </button>
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <MessageCircle size={16} /> Notes & Comments
        </h3>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet</p>
        ) : (
          <div className="space-y-3">
            {notes.map(note => (
              <div key={note.id} className="rounded-lg border p-4 bg-card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {note.created_by_name || note.created_by}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(note.created_date).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      note.is_internal ? 'bg-primary/10 text-primary' : 'bg-green-500/10 text-green-500'
                    }`}>
                      {note.is_internal ? 'Internal' : 'Customer'}
                    </span>
                    <button
                      onClick={() => deleteMutation.mutate(note.id)}
                      className="text-muted-foreground hover:text-destructive transition">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}