import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { User, ChevronDown, X } from 'lucide-react';

const inputCls =
  'w-full min-h-touch px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition';

function AssignmentSection({ title, nameValue, emailValue, phoneValue, onNameChange, onEmailChange, onPhoneChange, nameError, users, onSelectUser }) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleUserSelect = (u) => {
    onNameChange(u.full_name || u.email || '');
    onEmailChange(u.email || '');
    onPhoneChange(u.phone || '');
    setShowDropdown(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {users.length > 0 && (
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <User size={11} /> Auto-fill from team <ChevronDown size={11} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="border border-border rounded-lg bg-card divide-y divide-border text-sm overflow-hidden">
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => handleUserSelect(u)}
              className="w-full text-left px-3 py-2 hover:bg-muted transition flex items-center gap-2"
            >
              <User size={13} className="text-muted-foreground shrink-0" />
              <span className="font-medium">{u.full_name || u.email}</span>
              {u.role && <span className="text-muted-foreground text-xs ml-auto">{u.role}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="block text-xs font-medium mb-1">
            Name <span className="text-destructive">*</span>
          </label>
          <input
            className={`${inputCls} ${nameError ? 'border-destructive' : ''}`}
            value={nameValue}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter name…"
          />
          {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1">Email</label>
            <input
              type="email"
              className={inputCls}
              value={emailValue}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Phone</label>
            <input
              type="tel"
              className={inputCls}
              value={phoneValue}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="(555) 000-0000"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TechnicianSection({ techNames, onAdd, onRemove, users }) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const addTech = (name) => {
    const trimmed = name.trim();
    if (trimmed && !techNames.includes(trimmed)) {
      onAdd(trimmed);
    }
    setInput('');
    setShowDropdown(false);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Assigned Technicians</h3>

      {techNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {techNames.map((name) => (
            <span key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
              {name}
              <button type="button" onClick={() => onRemove(name)} className="hover:text-destructive transition">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="flex gap-2">
          <input
            className={inputCls}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTech(input); } }}
            placeholder="Type name and press Enter…"
          />
          <button
            type="button"
            onClick={() => addTech(input)}
            disabled={!input.trim()}
            className="px-3 h-10 rounded-lg border border-border text-xs hover:bg-muted transition disabled:opacity-50 whitespace-nowrap"
          >
            Add
          </button>
        </div>
        {users.length > 0 && (
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="mt-1 text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <User size={11} /> Select from team
          </button>
        )}
        {showDropdown && (
          <div className="mt-1 border border-border rounded-lg bg-card divide-y divide-border text-sm overflow-hidden">
            {users
              .filter((u) => !techNames.includes(u.full_name || u.email))
              .map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => addTech(u.full_name || u.email)}
                  className="w-full text-left px-3 py-2 hover:bg-muted transition"
                >
                  {u.full_name || u.email}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssignmentStep({ assignment, onChange }) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  const { data: users = [] } = useQuery({
    queryKey: ['users-list', companyId],
    enabled: !!companyId,
    queryFn: () => base44.entities.UserProfile.filter({ company_id: companyId, is_deleted: false }),
  });

  const set = (key) => (value) => onChange({ ...assignment, [key]: value });

  const addTech = (name) => {
    const current = assignment.technicianNames || [];
    onChange({ ...assignment, technicianNames: [...current, name] });
  };

  const removeTech = (name) => {
    onChange({ ...assignment, technicianNames: (assignment.technicianNames || []).filter((n) => n !== name) });
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-6">
      <h2 className="text-sm font-semibold font-display text-muted-foreground uppercase tracking-wide">
        Assign Team
      </h2>

      <AssignmentSection
        title="Project Manager"
        nameValue={assignment.pmName || ''}
        emailValue={assignment.pmEmail || ''}
        phoneValue={assignment.pmPhone || ''}
        onNameChange={set('pmName')}
        onEmailChange={set('pmEmail')}
        onPhoneChange={set('pmPhone')}
        nameError={assignment._errors?.pmName}
        users={users}
      />

      <div className="border-t border-border" />

      <AssignmentSection
        title="Estimator"
        nameValue={assignment.estimatorName || ''}
        emailValue={assignment.estimatorEmail || ''}
        phoneValue={assignment.estimatorPhone || ''}
        onNameChange={set('estimatorName')}
        onEmailChange={set('estimatorEmail')}
        onPhoneChange={set('estimatorPhone')}
        nameError={assignment._errors?.estimatorName}
        users={users}
      />

      <div className="border-t border-border" />

      <TechnicianSection
        techNames={assignment.technicianNames || []}
        onAdd={addTech}
        onRemove={removeTech}
        users={users}
      />

      <p className="text-xs text-muted-foreground">
        Assignment is optional — fields can be completed later from the Job Overview.
      </p>
    </div>
  );
}