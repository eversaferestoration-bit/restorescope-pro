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

  const [notificationForm, setNotificationForm] = useState({
    email_notifications: true,
    job_updates: true,
    estimate_updates: true,
    payment_updates: true,
  });

  const [securityForm, setSecurityForm] = useState({
    require_login: true,
    company_data_only: true,
    audit_logging: true,
    soft_delete_only: true,
  });

  const [integrationForm, setIntegrationForm] = useState({
    stripe_enabled: false,
    resend_enabled: false,
    openai_enabled: false,
    gmail_enabled: false,
  });

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  };

  useEffect(() => {
    async function loadCompany() {
      if (!userProfile?.company_id) return;

      try {
        const companies = await base44.entities.Company.filter({
          id: userProfile.company_id,
          is_deleted: false,
        });

        if (companies?.length > 0) {
          const company = companies[0];
          setCompanyId(company.id);

          setCompanyForm({
            name: company.name || "Eversafe Restoration",
            phone: company.phone || "636-219-9302",
            email: company.email || "eversaferestoration@gmail.com",
            website: company.website || "https://eversafepro.com",
            city: company.city || "St. Louis",
            state: company.state || "MO",
            service_area:
              company.service_area ||
              "St. Louis, MO and surrounding areas; Alton, IL and surrounding areas",
          });
        }
      } catch (error) {
        console.warn("[Settings] Company load failed:", error?.message || error);
      }
    }

    loadCompany();
  }, [userProfile?.company_id]);

  const saveCompanyProfile = async () => {
    setSaving(true);

    try {
      let cId = companyId || userProfile?.company_id || "";

      const payload = {
        name: companyForm.name,
        phone: companyForm.phone,
        email: companyForm.email,
        website: companyForm.website,
        city: companyForm.city,
        state: companyForm.state,
        service_area: companyForm.service_area,
        status: "active",
        created_by: user?.email || companyForm.email,
        is_deleted: false,
      };

      if (cId) {
        await base44.entities.Company.update(cId, payload);
      } else {
        const company = await base44.entities.Company.create(payload);
        cId = company.id;
        setCompanyId(cId);
      }

      if (userProfile?.id && cId) {
        await base44.entities.UserProfile.update(userProfile.id, {
          company_id: cId,
          email: user?.email || companyForm.email,
          is_deleted: false,
        });
      }

      if (refreshUserProfile) {
        await refreshUserProfile();
      }

      showMessage("Company profile saved.");
    } catch (error) {
      console.error("[Settings] Save company failed:", error?.message || error);
      showMessage("Could not save company profile. Check Company and UserProfile permissions.");
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    setSaving(true);

    try {
      if (!userProfile?.id) {
        showMessage("Missing user profile. Cannot save notifications.");
        return;
      }

      await base44.entities.UserProfile.update(userProfile.id, {
        notification_settings: notificationForm,
      });

      showMessage("Notification settings saved.");
    } catch (error) {
      console.warn("[Settings] Notification save failed:", error?.message || error);
      showMessage("Could not save notifications. Field may not exist on UserProfile.");
    } finally {
      setSaving(false);
    }
  };

  const saveSecuritySettings = async () => {
    setSaving(true);

    try {
      if (!companyId && !userProfile?.company_id) {
        showMessage("Missing company profile. Save company profile first.");
        return;
      }

      await base44.entities.Company.update(companyId || userProfile.company_id, {
        security_settings: securityForm,
      });

      showMessage("Security settings saved.");
    } catch (error) {
      console.warn("[Settings] Security save failed:", error?.message || error);
      showMessage("Could not save security settings. Field may not exist on Company.");
    } finally {
      setSaving(false);
    }
  };

  const saveIntegrationSettings = async () => {
    setSaving(true);

    try {
      if (!companyId && !userProfile?.company_id) {
        showMessage("Missing company profile. Save company profile first.");
        return;
      }

      await base44.entities.Company.update(companyId || userProfile.company_id, {
        integration_settings: integrationForm,
      });

      showMessage("Integration settings saved.");
    } catch (error) {
      console.warn("[Settings] Integration save failed:", error?.message || error);
      showMessage("Could not save integration settings. Field may not exist on Company.");
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

  const inputClass =
    "w-full border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  const Toggle = ({ label, checked, onChange, description }) => (
    <div className="flex items-start justify-between gap-4 border rounded-lg p-4">
      <div>
        <p className="font-medium text-sm">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`block w-5 h-5 bg-white rounded-full transition transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );

  if (activeSection === "company") {
    return (
      <div className="p-6 max-w-3xl">
        <SectionHeader
          title="Company Profile"
          description="Manage your company identity and service area."
        />

        {message && (
          <div className="mb-4 border rounded-lg px-4 py-3 text-sm bg-muted">
            {message}
          </div>
        )}

        <div className="border rounded-xl p-4 space-y-4">
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
          description="Control which alerts your team receives."
        />

        {message && (
          <div className="mb-4 border rounded-lg px-4 py-3 text-sm bg-muted">
            {message}
          </div>
        )}

        <div className="space-y-3">
          <Toggle
            label="Email Notifications"
            description="Send account and job notifications by email."
            checked={notificationForm.email_notifications}
            onChange={(value) =>
              setNotificationForm({ ...notificationForm, email_notifications: value })
            }
          />

          <Toggle
            label="Job Updates"
            description="Notify users when jobs are created or updated."
            checked={notificationForm.job_updates}
            onChange={(value) =>
              setNotificationForm({ ...notificationForm, job_updates: value })
            }
          />

          <Toggle
            label="Estimate Updates"
            description="Notify users when estimates are changed."
            checked={notificationForm.estimate_updates}
            onChange={(value) =>
              setNotificationForm({ ...notificationForm, estimate_updates: value })
            }
          />

          <Toggle
            label="Payment Updates"
            description="Notify users when payments or invoices change."
            checked={notificationForm.payment_updates}
            onChange={(value) =>
              setNotificationForm({ ...notificationForm, payment_updates: value })
            }
          />

          <button
            onClick={saveNotificationSettings}
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
          description="Manage beta security defaults and company data protections."
        />

        {message && (
          <div className="mb-4 border rounded-lg px-4 py-3 text-sm bg-muted">
            {message}
          </div>
        )}

        <div className="space-y-3">
          <Toggle
            label="Require Login"
            description="Users must be authenticated before accessing the app."
            checked={securityForm.require_login}
            onChange={(value) =>
              setSecurityForm({ ...securityForm, require_login: value })
            }
          />

          <Toggle
            label="Company Data Isolation"
            description="Only show records tied to the user's company_id."
            checked={securityForm.company_data_only}
            onChange={(value) =>
              setSecurityForm({ ...securityForm, company_data_only: value })
            }
          />

          <Toggle
            label="Audit Logging"
            description="Track critical create, update, and delete actions."
            checked={securityForm.audit_logging}
            onChange={(value) =>
              setSecurityForm({ ...securityForm, audit_logging: value })
            }
          />

          <Toggle
            label="Soft Delete Only"
            description="Archive records instead of permanently deleting them."
            checked={securityForm.soft_delete_only}
            onChange={(value) =>
              setSecurityForm({ ...securityForm, soft_delete_only: value })
            }
          />

          <button
            onClick={saveSecuritySettings}
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
          description="Track which external integrations are configured."
        />

        {message && (
          <div className="mb-4 border rounded-lg px-4 py-3 text-sm bg-muted">
            {message}
          </div>
        )}

        <div className="space-y-3">
          <Toggle
            label="Stripe"
            description="Payment processing for invoices."
            checked={integrationForm.stripe_enabled}
            onChange={(value) =>
              setIntegrationForm({ ...integrationForm, stripe_enabled: value })
            }
          />

          <Toggle
            label="Resend"
            description="Transactional email delivery."
            checked={integrationForm.resend_enabled}
            onChange={(value) =>
              setIntegrationForm({ ...integrationForm, resend_enabled: value })
            }
          />

          <Toggle
            label="OpenAI"
            description="AI photo analysis and scope support."
            checked={integrationForm.openai_enabled}
            onChange={(value) =>
              setIntegrationForm({ ...integrationForm, openai_enabled: value })
            }
          />

          <Toggle
            label="Gmail SMTP"
            description="Fallback email delivery through Gmail."
            checked={integrationForm.gmail_enabled}
            onChange={(value) =>
              setIntegrationForm({ ...integrationForm, gmail_enabled: value })
            }
          />

          <button
            onClick={saveIntegrationSettings}
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
        Manage your account and company settings
      </p>

      <div className="border rounded-xl divide-y">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">Company Profile</p>
            <p className="text-sm text-muted-foreground">Configure company profile</p>
          </div>
          <button
            onClick={() => setActiveSection("company")}
            className="text-sm text-primary font-medium hover:underline"
          >
            Manage
          </button>
        </div>

        <div className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">Notifications</p>
            <p className="text-sm text-muted-foreground">Configure notifications</p>
          </div>
          <button
            onClick={() => setActiveSection("notifications")}
            className="text-sm text-primary font-medium hover:underline"
          >
            Manage
          </button>
        </div>

        <div className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">Security</p>
            <p className="text-sm text-muted-foreground">Configure security</p>
          </div>
          <button
            onClick={() => setActiveSection("security")}
            className="text-sm text-primary font-medium hover:underline"
          >
            Manage
          </button>
        </div>

        <div className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">Integrations</p>
            <p className="text-sm text-muted-foreground">Configure integrations</p>
          </div>
          <button
            onClick={() => setActiveSection("integrations")}
            className="text-sm text-primary font-medium hover:underline"
          >
            Manage
          </button>
        </div>
      </div>

      <div className="mt-6 border border-destructive/30 rounded-xl p-4 bg-destructive/5">
        <p className="font-semibold text-destructive mb-1">Delete Account</p>
        <p className="text-sm text-muted-foreground mb-3">
          Permanently delete your account and all associated data. This should be disabled during beta.
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