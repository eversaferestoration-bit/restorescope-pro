import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export default function Settings() {
  const { user, userProfile, refreshUserProfile } = useAuth();

  const [activeSection, setActiveSection] = useState("menu");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [companyId, setCompanyId] = useState(userProfile?.company_id || "");

  const [companyForm, setCompanyForm] = useState({
    name: "Eversafe Restoration",
    phone: "636-219-9302",
    email: "eversaferestoration@gmail.com",
    website: "https://eversafepro.com",
    city: "St. Louis",
    state: "MO",
    service_area: "St. Louis, MO and surrounding areas; Alton, IL and surrounding areas",
  });

  const [settingsForm, setSettingsForm] = useState({
    require_login: true,
    company_data_only: true,
    audit_logging_enabled: true,
    soft_delete_only: true,

    stripe_enabled: false,
    resend_enabled: false,
    openai_enabled: false,
    gmail_enabled: false,

    email_notifications: true,
    job_updates: true,
    estimate_updates: true,
    payment_updates: true,
  });

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 3500);
  };

  const loadCompany = async () => {
    try {
      let cId = companyId || userProfile?.company_id || "";

      if (!cId && user?.email) {
        const companies = await base44.entities.Company.filter({
          created_by: user.email,
          is_deleted: false,
        });

        if (companies?.length > 0) {
          cId = companies[0].id;
        }
      }

      if (!cId) return;

      const companies = await base44.entities.Company.filter({
        id: cId,
        is_deleted: false,
      });

      if (!companies?.length) return;

      const company = companies[0];

      setCompanyId(company.id);

      setCompanyForm({
        name: company.name || "Eversafe Restoration",
        phone: company.phone || "636-219-9302",
        email: company.email || user?.email || "eversaferestoration@gmail.com",
        website: company.website || "https://eversafepro.com",
        city: company.city || "St. Louis",
        state: company.state || "MO",
        service_area:
          company.service_area ||
          "St. Louis, MO and surrounding areas; Alton, IL and surrounding areas",
      });

      setSettingsForm({
        require_login: company.require_login ?? true,
        company_data_only: company.company_data_only ?? true,
        audit_logging_enabled: company.audit_logging_enabled ?? true,
        soft_delete_only: company.soft_delete_only ?? true,

        stripe_enabled: company.stripe_enabled ?? false,
        resend_enabled: company.resend_enabled ?? false,
        openai_enabled: company.openai_enabled ?? false,
        gmail_enabled: company.gmail_enabled ?? false,

        email_notifications: company.email_notifications ?? true,
        job_updates: company.job_updates ?? true,
        estimate_updates: company.estimate_updates ?? true,
        payment_updates: company.payment_updates ?? true,
      });
    } catch (error) {
      console.error("[Settings] Company load failed:", error?.message || error);
      showMessage("Could not load company settings.");
    }
  };

  useEffect(() => {
    loadCompany();
  }, [userProfile?.company_id, user?.email]);

  const ensureCompany = async () => {
    let cId = companyId || userProfile?.company_id || "";

    const payload = {
      name: companyForm.name || "Company",
      phone: companyForm.phone || "",
      email: companyForm.email || user?.email || "",
      website: companyForm.website || "",
      city: companyForm.city || "",
      state: companyForm.state || "",
      service_area: companyForm.service_area || "",
      status: "active",
      created_by: user?.email || companyForm.email || "",
      is_deleted: false,
    };

    if (cId) {
      await base44.entities.Company.update(cId, payload);
      return cId;
    }

    const company = await base44.entities.Company.create(payload);
    cId = company.id;
    setCompanyId(cId);

    if (userProfile?.id) {
      await base44.entities.UserProfile.update(userProfile.id, {
        company_id: cId,
        email: user?.email || companyForm.email || "",
        is_deleted: false,
      });
    }

    if (refreshUserProfile) {
      await refreshUserProfile();
    }

    return cId;
  };

  const saveCompanyProfile = async () => {
    setSaving(true);

    try {
      await ensureCompany();
      showMessage("Company profile saved.");
    } catch (error) {
      console.error("[Settings] Company save failed:", error?.message || error);
      showMessage("Could not save company profile. Check Company and UserProfile permissions.");
    } finally {
      setSaving(false);
    }
  };

  const saveCompanySettings = async (type) => {
    setSaving(true);

    try {
      const cId = await ensureCompany();

      let payload = {};

      if (type === "notifications") {
        payload = {
          email_notifications: settingsForm.email_notifications,
          job_updates: settingsForm.job_updates,
          estimate_updates: settingsForm.estimate_updates,
          payment_updates: settingsForm.payment_updates,
        };
      }

      if (type === "security") {
        payload = {
          require_login: settingsForm.require_login,
          company_data_only: settingsForm.company_data_only,
          audit_logging_enabled: settingsForm.audit_logging_enabled,
          soft_delete_only: settingsForm.soft_delete_only,
        };
      }

      if (type === "integrations") {
        payload = {
          stripe_enabled: settingsForm.stripe_enabled,
          resend_enabled: settingsForm.resend_enabled,
          openai_enabled: settingsForm.openai_enabled,
          gmail_enabled: settingsForm.gmail_enabled,
        };
      }

      await base44.entities.Company.update(cId, payload);

      showMessage(
        type === "notifications"
          ? "Notification settings saved."
          : type === "security"
            ? "Security settings saved."
            : "Integration settings saved."
      );
    } catch (error) {
      console.error(`[Settings] ${type} save failed:`, error?.message || error);
      showMessage("Could not save settings. Confirm Company fields are added to Company.jsonc.");
    } finally {
      setSaving(false);
    }
  };

  const SectionHeader = ({ title, description }) => (
    <div className="mb-6">
      <button
        onClick={() => setActiveSection("menu")}
        className="text-sm text-primary mb-4 hover:underline"
      >
        ← Back to Settings
      </button>
      <h1 className="text-2xl font-bold mb-1">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );

  const Field = ({ label, children }) => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );

  const Toggle = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between gap-4 border rounded-lg p-4 bg-card">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`block w-5 h-5 bg-white rounded-full transition transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );

  const inputClass =
    "w-full border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  const MessageBox = () =>
    message ? (
      <div className="mb-4 border rounded-lg px-4 py-3 text-sm bg-muted">{message}</div>
    ) : null;

  if (activeSection === "company") {
    return (
      <div className="p-6 max-w-3xl">
        <SectionHeader
          title="Company Profile"
          description="Manage company information used across jobs, users, estimates, and billing."
        />

        <MessageBox />

        <div className="border rounded-xl p-4 space-y-4 bg-card">
          <Field label="Company Name">
            <input
              className={inputClass}
              value={companyForm.name}
              onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
            />
          </Field>

          <Field label="Phone">
            <input
              className={inputClass}
              value={companyForm.phone}
              onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
            />
          </Field>

          <Field label="Email">
            <input
              className={inputClass}
              value={companyForm.email}
              onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
            />
          </Field>

          <Field label="Website">
            <input
              className={inputClass}
              value={companyForm.website}
              onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <input
                className={inputClass}
                value={companyForm.city}
                onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
              />
            </Field>

            <Field label="State">
              <input
                className={inputClass}
                value={companyForm.state}
                onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Service Area">
            <textarea
              className={inputClass}
              rows={3}
              value={companyForm.service_area}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, service_area: e.target.value })
              }
            />
          </Field>

          <button
            onClick={saveCompanyProfile}
            disabled={saving}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Company Profile"}
          </button>
        </div>
      </div>
    );
  }

  if (activeSection === "notifications") {
    return (
      <div className="p-6 max-w-3xl">
        <SectionHeader
          title="Notifications"
          description="Control which alerts company users receive during beta testing."
        />

        <MessageBox />

        <div className="space-y-3">
          <Toggle
            label="Email Notifications"
            description="Send general account and job notifications by email."
            checked={settingsForm.email_notifications}
            onChange={(value) => setSettingsForm({ ...settingsForm, email_notifications: value })}
          />

          <Toggle
            label="Job Updates"
            description="Notify users when jobs are created or updated."
            checked={settingsForm.job_updates}
            onChange={(value) => setSettingsForm({ ...settingsForm, job_updates: value })}
          />

          <Toggle
            label="Estimate Updates"
            description="Notify users when estimates are created or changed."
            checked={settingsForm.estimate_updates}
            onChange={(value) => setSettingsForm({ ...settingsForm, estimate_updates: value })}
          />

          <Toggle
            label="Payment Updates"
            description="Notify users when invoices or payments change."
            checked={settingsForm.payment_updates}
            onChange={(value) => setSettingsForm({ ...settingsForm, payment_updates: value })}
          />

          <button
            onClick={() => saveCompanySettings("notifications")}
            disabled={saving}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Notification Settings"}
          </button>
        </div>
      </div>
    );
  }

  if (activeSection === "security") {
    return (
      <div className="p-6 max-w-3xl">
        <SectionHeader
          title="Security"
          description="Configure baseline SaaS protections for beta companies."
        />

        <MessageBox />

        <div className="space-y-3">
          <Toggle
            label="Require Login"
            description="Users must be authenticated before accessing app data."
            checked={settingsForm.require_login}
            onChange={(value) => setSettingsForm({ ...settingsForm, require_login: value })}
          />

          <Toggle
            label="Company Data Isolation"
            description="Only show records tied to the active company_id."
            checked={settingsForm.company_data_only}
            onChange={(value) => setSettingsForm({ ...settingsForm, company_data_only: value })}
          />

          <Toggle
            label="Audit Logging"
            description="Track important create, update, and delete actions."
            checked={settingsForm.audit_logging_enabled}
            onChange={(value) =>
              setSettingsForm({ ...settingsForm, audit_logging_enabled: value })
            }
          />

          <Toggle
            label="Soft Delete Only"
            description="Archive records instead of permanently deleting them."
            checked={settingsForm.soft_delete_only}
            onChange={(value) => setSettingsForm({ ...settingsForm, soft_delete_only: value })}
          />

          <button
            onClick={() => saveCompanySettings("security")}
            disabled={saving}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Security Settings"}
          </button>
        </div>
      </div>
    );
  }

  if (activeSection === "integrations") {
    return (
      <div className="p-6 max-w-3xl">
        <SectionHeader
          title="Integrations"
          description="Track external integrations configured for this company."
        />

        <MessageBox />

        <div className="space-y-3">
          <Toggle
            label="Stripe"
            description="Payment processing for invoices."
            checked={settingsForm.stripe_enabled}
            onChange={(value) => setSettingsForm({ ...settingsForm, stripe_enabled: value })}
          />

          <Toggle
            label="Resend"
            description="Transactional email delivery."
            checked={settingsForm.resend_enabled}
            onChange={(value) => setSettingsForm({ ...settingsForm, resend_enabled: value })}
          />

          <Toggle
            label="OpenAI"
            description="AI photo analysis and scope support."
            checked={settingsForm.openai_enabled}
            onChange={(value) => setSettingsForm({ ...settingsForm, openai_enabled: value })}
          />

          <Toggle
            label="Gmail SMTP"
            description="Fallback email delivery through Gmail."
            checked={settingsForm.gmail_enabled}
            onChange={(value) => setSettingsForm({ ...settingsForm, gmail_enabled: value })}
          />

          <button
            onClick={() => saveCompanySettings("integrations")}
            disabled={saving}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Integration Settings"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Manage your account, company settings, beta security, and integrations.
      </p>

      <div className="border rounded-xl divide-y bg-card">
        {[
          ["Company Profile", "Configure company profile", "company"],
          ["Notifications", "Configure notification preferences", "notifications"],
          ["Security", "Configure company security defaults", "security"],
          ["Integrations", "Configure company integrations", "integrations"],
        ].map(([title, description, key]) => (
          <div key={key} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            <button
              onClick={() => setActiveSection(key)}
              className="text-sm text-primary font-medium hover:underline"
            >
              Manage
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 border border-destructive/30 rounded-xl p-4 bg-destructive/5">
        <p className="font-semibold text-destructive mb-1">Delete Account</p>
        <p className="text-sm text-muted-foreground mb-3">
          Disabled during beta testing to prevent accidental company data loss.
        </p>

        <button
          onClick={() => alert("Delete account is disabled during beta testing.")}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700"
        >
          Delete My Account
        </button>
      </div>
    </div>
  );
}