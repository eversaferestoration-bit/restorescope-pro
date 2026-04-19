import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
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
      </div>
    </div>
  );
}