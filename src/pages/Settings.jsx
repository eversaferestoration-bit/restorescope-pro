import { Settings as SettingsIcon, ListChecks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();

  const handleReopenChecklist = () => {
    localStorage.removeItem('activation_checklist_dismissed');
    window.dispatchEvent(new Event('reopen_activation_checklist'));
    navigate('/dashboard');
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and company settings</p>
      </div>

      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        {['Company Profile', 'Notifications', 'Security', 'Integrations'].map((section) => (
          <div key={section} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium">{section}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Configure {section.toLowerCase()}</p>
            </div>
            <button className="text-xs text-primary font-medium hover:underline">Manage</button>
          </div>
        ))}

        {/* Reopen activation checklist */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <ListChecks size={16} className="text-primary" />
            <div>
              <p className="text-sm font-medium">Getting started checklist</p>
              <p className="text-xs text-muted-foreground mt-0.5">Reopen the activation checklist on the dashboard</p>
            </div>
          </div>
          <button
            onClick={handleReopenChecklist}
            className="text-xs text-primary font-medium hover:underline"
          >
            Reopen
          </button>
        </div>
      </div>
    </div>
  );
}