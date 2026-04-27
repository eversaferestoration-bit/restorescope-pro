import { useState } from "react";

export default function Settings() {
  const [activeSection, setActiveSection] = useState("menu");

  if (activeSection === "company") {
    return (
      <div className="p-6 max-w-3xl">
        <button
          onClick={() => setActiveSection("menu")}
          className="text-sm text-primary mb-4"
        >
          ← Back to Settings
        </button>

        <h1 className="text-2xl font-bold mb-1">Company Profile</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Manage your company information.
        </p>

        <div className="border rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Eversafe Restoration" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input className="w-full border rounded-lg px-3 py-2" placeholder="636-219-9302" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input className="w-full border rounded-lg px-3 py-2" placeholder="eversaferestoration@gmail.com" />
          </div>

          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold">
            Save Company Profile
          </button>
        </div>
      </div>
    );
  }

  if (activeSection === "notifications") {
    return (
      <div className="p-6 max-w-3xl">
        <button onClick={() => setActiveSection("menu")} className="text-sm text-primary mb-4">
          ← Back to Settings
        </button>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">Notification settings will go here.</p>
      </div>
    );
  }

  if (activeSection === "security") {
    return (
      <div className="p-6 max-w-3xl">
        <button onClick={() => setActiveSection("menu")} className="text-sm text-primary mb-4">
          ← Back to Settings
        </button>
        <h1 className="text-2xl font-bold">Security</h1>
        <p className="text-sm text-muted-foreground mt-1">Security settings will go here.</p>
      </div>
    );
  }

  if (activeSection === "integrations") {
    return (
      <div className="p-6 max-w-3xl">
        <button onClick={() => setActiveSection("menu")} className="text-sm text-primary mb-4">
          ← Back to Settings
        </button>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">Integration settings will go here.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Manage your account and company settings
      </p>

      <div className="border rounded-xl divide-y">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">Company Profile</p>
            <p className="text-sm text-muted-foreground">Configure company profile</p>
          </div>
          <button onClick={() => setActiveSection("company")} className="text-sm text-primary font-medium">
            Manage
          </button>
        </div>

        <div className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">Notifications</p>
            <p className="text-sm text-muted-foreground">Configure notifications</p>
          </div>
          <button onClick={() => setActiveSection("notifications")} className="text-sm text-primary font-medium">
            Manage
          </button>
        </div>

        <div className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">Security</p>
            <p className="text-sm text-muted-foreground">Configure security</p>
          </div>
          <button onClick={() => setActiveSection("security")} className="text-sm text-primary font-medium">
            Manage
          </button>
        </div>

        <div className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">Integrations</p>
            <p className="text-sm text-muted-foreground">Configure integrations</p>
          </div>
          <button onClick={() => setActiveSection("integrations")} className="text-sm text-primary font-medium">
            Manage
          </button>
        </div>
      </div>
    </div>
  );
}