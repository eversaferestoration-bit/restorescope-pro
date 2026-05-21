import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageSquare, CheckSquare, Clock, FileText, Send } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const TABS = [
  { id: 'notes', label: 'Notes', icon: MessageSquare },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'activity', label: 'Activity', icon: Clock },
  { id: 'files', label: 'Files', icon: FileText },
];

export default function LeadDetailTabs({ lead, notes, tasks, activities, leadId }) {
  const [activeTab, setActiveTab] = useState('notes');
  const [newNote, setNewNote] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const qc = useQueryClient();

  const createNoteMutation = useMutation({
    mutationFn: (content) => base44.functions.invoke('createLeadNote', { lead_id: leadId, content, note_type: 'internal_comment' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-notes', leadId] });
      setNewNote('');
      toast({ title: '✅ Note added' });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (title) => base44.functions.invoke('createLeadTask', { lead_id: leadId, title }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-tasks', leadId] });
      setNewTaskTitle('');
      toast({ title: '✅ Task created' });
    },
  });

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b mb-6">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              <Icon size={18} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {/* Add Note */}
          <div className="p-4 rounded-lg bg-card border">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add internal comment…"
              className="w-full px-3 py-2 rounded border mb-2 resize-none"
              rows={3}
            />
            <button onClick={() => createNoteMutation.mutate(newNote)}
              disabled={createNoteMutation.isPending || !newNote.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded bg-primary text-white font-semibold disabled:opacity-50">
              <Send size={16} /> {createNoteMutation.isPending ? 'Saving…' : 'Comment'}
            </button>
          </div>

          {/* Notes List */}
          <div className="space-y-3">
            {notes.length === 0 ? (
              <p className="text-muted-foreground text-sm">No notes yet</p>
            ) : (
              notes.map(note => (
                <div key={note.id} className="p-4 rounded-lg bg-card border">
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(note.created_date).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Add Task */}
          <div className="p-4 rounded-lg bg-card border">
            <input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="New task…"
              className="w-full px-3 py-2 rounded border mb-2"
            />
            <button onClick={() => createTaskMutation.mutate(newTaskTitle)}
              disabled={createTaskMutation.isPending || !newTaskTitle.trim()}
              className="px-4 py-2 rounded bg-primary text-white font-semibold disabled:opacity-50">
              {createTaskMutation.isPending ? 'Creating…' : 'Add Task'}
            </button>
          </div>

          {/* Tasks List */}
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tasks</p>
            ) : (
              tasks.map(task => (
                <div key={task.id} className="p-3 rounded-lg bg-card border flex items-start gap-3">
                  <input type="checkbox" defaultChecked={task.status === 'completed'} className="mt-1" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{task.title}</p>
                    {task.due_date && <p className="text-xs text-muted-foreground">Due: {task.due_date}</p>}
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-muted">{task.priority}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="space-y-3">
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-sm">No activity</p>
          ) : (
            activities.map(activity => (
              <div key={activity.id} className="p-3 rounded-lg bg-card border border-l-4" style={{ borderLeftColor: '#3b82f6' }}>
                <p className="font-semibold text-sm">{activity.description}</p>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  <span>{activity.actor_email}</span>
                  <span>{new Date(activity.created_date).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Files Tab */}
      {activeTab === 'files' && (
        <div>
          <p className="text-muted-foreground text-sm">File upload coming soon</p>
        </div>
      )}
    </div>
  );
}