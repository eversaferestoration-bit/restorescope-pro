import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function LeadTasks({ lead }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', priority: 'medium', due_date: '' });

  const { data: tasks = [] } = useQuery({
    queryKey: ['lead-tasks', lead.id],
    queryFn: () => base44.entities.LeadTask.filter({
      lead_id: lead.id,
      is_deleted: false,
    }, '-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadTask.create({
      ...data,
      company_id: lead.company_id,
      lead_id: lead.id,
      status: 'pending',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-tasks', lead.id] });
      setForm({ title: '', priority: 'medium', due_date: '' });
      setShowAdd(false);
      toast({ title: '✅ Task created' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadTask.update(data.id, { status: data.status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-tasks', lead.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LeadTask.update(id, { is_deleted: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead-tasks', lead.id] });
    },
  });

  const pending = tasks.filter(t => t.status === 'pending');
  const completed = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition">
          <Plus size={14} /> Add Task
        </button>
      </div>

      {showAdd && (
        <div className="rounded-xl border p-4 bg-card">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Task title…"
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.priority}
                onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
                className="px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-2 rounded-lg hover:bg-muted transition text-sm">
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.title}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Tasks */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Pending ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition">
                <button
                  onClick={() => statusMutation.mutate({ id: task.id, status: 'completed' })}
                  className="text-muted-foreground hover:text-primary transition">
                  <Circle size={20} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{task.title}</p>
                  <p className={`text-xs ${
                    task.priority === 'high' ? 'text-destructive' : 
                    task.priority === 'medium' ? 'text-orange-500' :
                    'text-muted-foreground'
                  }`}>
                    {task.priority} priority {task.due_date ? `• Due ${new Date(task.due_date).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(task.id)}
                  className="text-muted-foreground hover:text-destructive transition">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Completed ({completed.length})</h3>
          <div className="space-y-2">
            {completed.map(task => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <button
                  onClick={() => statusMutation.mutate({ id: task.id, status: 'pending' })}
                  className="text-green-500">
                  <CheckCircle2 size={20} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="line-through text-muted-foreground">{task.title}</p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(task.id)}
                  className="text-muted-foreground hover:text-destructive transition">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground">No tasks yet</p>
      )}
    </div>
  );
}