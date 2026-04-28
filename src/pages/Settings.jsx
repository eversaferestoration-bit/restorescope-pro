import { useEffect, useMemo, useState } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  Bell,
  Shield,
  Plug,
  ListChecks,
  Trash2,
  AlertTriangle,
  X,
  Save,
  CheckCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import CompanyBetaPanel from '@/components/admin/CompanyBetaPanel';

const inputCls =
  'w-full min-h-touch px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition';

const tabButtonBase =
  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap';

const defaultCompanyForm = {
  name: '',
  legal_name: '',
  email: '',
  phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  zip: '',
  country: 'United States',
  timezone: 'America/Chicago',
  brand_primary_color: '#C65A1E',
  brand_secondary_color: '#0E2A47',
};

const defaultUserForm = {
  full_name: '',
  phone: '',
  title: '',
};

const defaultEnterpriseForm = {
  enable_usage_reporting: true,
  approval_workflow_enabled: false,
  cost_center_enabled: false,
  usage_report_email: '',
  usage_report_frequency: 'weekly',
};

const defaultLocalSettings = {
  email_notifications: true,
  job_notifications: true,
  approval_notifications: true,
  billing_notifications: true,
  require_secure_exports: true,
  session_warning_enabled: true,
  gmail_enabled: false,
  stripe_enabled: false,
  wave_enabled: false,
  openai_enabled: false,
};

function normalizeCompany(company) {
  return {
    ...defaultCompanyForm,
    name: company?.name || '',
    legal_name: company?.legal_name || '',
    email: company?.email || '',
    phone: company?.phone || '',
    address_line_1: company?.address_line_1 || '',
    address_line_2: company?.address_line_2 || '',
    city: company?.city || '',
    state: company?.state || '',
    zip: company?.zip || '',
    country: company?.country || 'United States',
    timezone: company?.timezone || 'America/Chicago',
    brand_primary_color: company?.brand_primary_color || '#C65A1E',
    brand_secondary_color: company?.brand_secondary_color || '#0E2A47',
  };
}

function normalizeProfile(profile, user) {
  return {
    full_name: profile?.full_name || user?.full_name || user?.name || '',
    phone: profile?.phone || '',
    title: profile?.title || '',
  };
}

function normalizeEnterprise(settings, user) {
  return {
    ...defaultEnterpriseForm,
    enable_usage_reporting: settings?.enable_usage_reporting ?? true,
    approval_workflow_enabled: settings?.approval_workflow_enabled ?? false,
    cost_center_enabled: settings?.cost_center_enabled ?? false,
    usage_report_email: settings?.usage_report_email || user?.email || '',
    usage_report_frequency: settings?.usage_report_frequency || 'weekly',
  };
}

function loadLocalSettings(companyId) {
  if (!companyId) return defaultLocalSettings;

  try {
    const raw = localStorage.getItem(`restoreflow_settings_${companyId}`);
    if (!raw) return defaultLocalSettings;

    return {
      ...defaultLocalSettings,
      ...JSON.parse(raw),
    };
  } catch {
    return defaultLocalSettings;
  }
}

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('company');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [company, setCompany] = useState(null);
  const [profile, setProfile] = useState(null);
  const [enterpriseSettings, setEnterpriseSettings] = useState(null);
  const [companyForm, setCompanyForm] = useState(defaultCompanyForm);
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [enterpriseForm, setEnterpriseForm] = useState(defaultEnterpriseForm);
  const [localSettings, setLocalSettings] = useState(defaultLocalSettings);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'platform_admin';
  const companyId = user?.company_id || profile?.company_id || company?.id || null;

  const tabs = useMemo(
    () => [
      { key: 'company', label: 'Company Profile', icon: Building2 },
      { key: 'notifications', label: 'Notifications', icon: Bell },
      { key: 'security', label: 'Security', icon: Shield },
      { key: 'integrations', label: 'Integrations', icon: Plug },
    ],
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      if (!user?.id && !user?.email) return;

      setLoading(true);
      setError('');

      try {
        let resolvedProfile = null;
        let resolvedCompany = null;
        let resolvedEnterprise = null;

        const profileFilters = [];

        if (user?.id) profileFilters.push({ user_id: user.id, is_deleted: false });
        if (user?.email) profileFilters.push({ email: user.email, is_deleted: false });

        for (const filter of profileFilters) {
          const profiles = await base44.entities.UserProfile.filter(filter, '-created_date', 1).catch(() => []);
          if (profiles?.[0]) {
            resolvedProfile = profiles[0];
            break;
          }
        }

        const resolvedCompanyId = user?.company_id || resolvedProfile?.company_id;

        if (resolvedCompanyId) {
          const companies = await base44.entities.Company.filter(
            {
              id: resolvedCompanyId,
              is_deleted: false,
            },
            '-created_date',
            1
          ).catch(() => []);

          resolvedCompany = companies?.[0] || null;

          const enterpriseRecords = await base44.entities.EnterpriseSettings.filter(
            {
              company_id: resolvedCompanyId,
              is_deleted: false,
            },
            '-created_date',
            1
          ).catch(() => []);

          resolvedEnterprise = enterpriseRecords?.[0] || null;
        }

        if (!cancelled) {
          setProfile(resolvedProfile);
          setCompany(resolvedCompany);
          setEnterpriseSettings(resolvedEnterprise);
          setCompanyForm(normalizeCompany(resolvedCompany));
          setUserForm(normalizeProfile(resolvedProfile, user));
          setEnterpriseForm(normalizeEnterprise(resolvedEnterprise, user));
          setLocalSettings(loadLocalSettings(resolvedCompanyId));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load settings.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, user?.company_id]);

  const showSuccess = (text) => {
    setMessage(text);
    setError('');
    setTimeout(() => setMessage(''), 3500);
  };

  const showError = (text) => {
    setError(text);
    setMessage('');
  };

  const saveCompanyProfile = async () => {
    if (!isAdmin) {
      showError('Only admins can update the company profile.');
      return;
    }

    if (!companyForm.name.trim()) {
      showError('Company name is required.');
      return;
    }

    setSaving('company');

    try {
      const payload = {
        ...companyForm,
        name: companyForm.name.trim(),
        legal_name: companyForm.legal_name.trim() || null,
        email: companyForm.email.trim() || null,
        phone: companyForm.phone.trim() || null,
        address_line_1: companyForm.address_line_1.trim() || null,
        address_line_2: companyForm.address_line_2.trim() || null,
        city: companyForm.city.trim() || null,
        state: companyForm.state.trim() || null,
        zip: companyForm.zip.trim() || null,
        country: companyForm.country.trim() || 'United States',
        timezone: companyForm.timezone.trim() || 'America/Chicago',
        brand_primary_color: companyForm.brand_primary_color || '#C65A1E',
        brand_secondary_color: companyForm.brand_secondary_color || '#0E2A47',
        is_deleted: false,
      };

      let saved;

      if (company?.id) {
        saved = await base44.entities.Company.update(company.id, payload);
      } else {
        saved = await base44.entities.Company.create({
          ...payload,
          created_by: user?.email || user?.id || null,
          status: 'active',
        });
      }

      setCompany(saved);
      setCompanyForm(normalizeCompany(saved));

      if (profile?.id && saved?.id && profile.company_id !== saved.id) {
        const updatedProfile = await base44.entities.UserProfile.update(profile.id, {
          company_id: saved.id,
        });
        setProfile(updatedProfile);
      }

      showSuccess('Company profile saved.');
    } catch (err) {
      showError(err?.message || 'Failed to save company profile.');
    } finally {
      setSaving('');
    }
  };

  const saveUserProfile = async () => {
    setSaving('user');

    try {
      const payload = {
        full_name: userForm.full_name.trim() || null,
        phone: userForm.phone.trim() || null,
        title: userForm.title.trim() || null,
      };

      if (profile?.id) {
        const saved = await base44.entities.UserProfile.update(profile.id, payload);
        setProfile(saved);
        setUserForm(normalizeProfile(saved, user));
      } else {
        if (!companyId) throw new Error('Company ID is required before creating a user profile.');

        const saved = await base44.entities.UserProfile.create({
          user_id: user.id,
          company_id: companyId,
          email: user.email,
          role: user.role || 'admin',
          status: 'active',
          is_deleted: false,
          ...payload,
        });

        setProfile(saved);
        setUserForm(normalizeProfile(saved, user));
      }

      showSuccess('User profile saved.');
    } catch (err) {
      showError(err?.message || 'Failed to save user profile.');
    } finally {
      setSaving('');
    }
  };

  const saveEnterpriseSettings = async () => {
    if (!isAdmin) {
      showError('Only admins can update security and reporting settings.');
      return;
    }

    if (!companyId) {
      showError('Company ID is required before saving settings.');
      return;
    }

    setSaving('enterprise');

    try {
      const payload = {
        company_id: companyId,
        enable_usage_reporting: !!enterpriseForm.enable_usage_reporting,
        approval_workflow_enabled: !!enterpriseForm.approval_workflow_enabled,
        cost_center_enabled: !!enterpriseForm.cost_center_enabled,
        usage_report_email: enterpriseForm.usage_report_email.trim() || null,
        usage_report_frequency: enterpriseForm.usage_report_frequency || 'weekly',
        is_deleted: false,
      };

      let saved;

      if (enterpriseSettings?.id) {
        saved = await base44.entities.EnterpriseSettings.update(enterpriseSettings.id, payload);
      } else {
        saved = await base44.entities.EnterpriseSettings.create(payload);
      }

      setEnterpriseSettings(saved);
      setEnterpriseForm(normalizeEnterprise(saved, user));
      showSuccess('Security and reporting settings saved.');
    } catch (err) {
      showError(err?.message || 'Failed to save security settings.');
    } finally {
      setSaving('');
    }
  };

  const saveLocalSettings = () => {
    if (!companyId) {
      showError('Company ID is required before saving settings.');
      return;
    }

    localStorage.setItem(`restoreflow_settings_${companyId}`, JSON.stringify(localSettings));
    showSuccess('Settings saved on this device.');
  };

  const handleReopenChecklist = () => {
    localStorage.removeItem('activation_checklist_dismissed');
    window.dispatchEvent(new Event('reopen_activation_checklist'));
    navigate('/dashboard');
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return;

    setDeleting(true);

    try {
      await base44.functions.invoke('deleteUserAccount', { user_id: user.id });
      base44.auth.logout('/login');
    } catch {
      showError('Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  const updateCompany = (key) => (event) => {
    setCompanyForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const updateUser = (key) => (event) => {
    setUserForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const updateEnterprise = (key, value) => {
    setEnterpriseForm((current) => ({ ...current, [key]: value }));
  };

  const updateLocal = (key, value) => {
    setLocalSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <SettingsIcon size={22} />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your company profile, user profile, notifications, security, and integrations.
        </p>
      </div>

      {loading && (
        <div className="bg-card rounded-xl border border-border p-6 text-sm text-muted-foreground">
          Loading settings...
        </div>
      )}

      {!loading && (
        <>
          {message && (
            <div className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle size={16} />
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex overflow-x-auto border-b border-border">
              {tabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`${tabButtonBase} ${
                      activeTab === tab.key
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="p-5">
              {activeTab === 'company' && (
                <div className="space-y-6">
                  <SectionHeader
                    title="Company Profile"
                    description="This information is used across jobs, documents, exports, and customer-facing records."
                  />

                  {!isAdmin && (
                    <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                      Only admins can update company profile details.
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Company Name" required>
                      <input className={inputCls} value={companyForm.name} onChange={updateCompany('name')} disabled={!isAdmin} />
                    </Field>

                    <Field label="Legal Name">
                      <input className={inputCls} value={companyForm.legal_name} onChange={updateCompany('legal_name')} disabled={!isAdmin} />
                    </Field>

                    <Field label="Company Email">
                      <input className={inputCls} value={companyForm.email} onChange={updateCompany('email')} disabled={!isAdmin} />
                    </Field>

                    <Field label="Company Phone">
                      <input className={inputCls} value={companyForm.phone} onChange={updateCompany('phone')} disabled={!isAdmin} />
                    </Field>

                    <Field label="Address Line 1">
                      <input className={inputCls} value={companyForm.address_line_1} onChange={updateCompany('address_line_1')} disabled={!isAdmin} />
                    </Field>

                    <Field label="Address Line 2">
                      <input className={inputCls} value={companyForm.address_line_2} onChange={updateCompany('address_line_2')} disabled={!isAdmin} />
                    </Field>

                    <Field label="City">
                      <input className={inputCls} value={companyForm.city} onChange={updateCompany('city')} disabled={!isAdmin} />
                    </Field>

                    <Field label="State">
                      <input className={inputCls} value={companyForm.state} onChange={updateCompany('state')} disabled={!isAdmin} maxLength={2} />
                    </Field>

                    <Field label="ZIP">
                      <input className={inputCls} value={companyForm.zip} onChange={updateCompany('zip')} disabled={!isAdmin} />
                    </Field>

                    <Field label="Timezone">
                      <select className={inputCls} value={companyForm.timezone} onChange={updateCompany('timezone')} disabled={!isAdmin}>
                        <option value="America/Chicago">America/Chicago</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="America/Denver">America/Denver</option>
                        <option value="America/Los_Angeles">America/Los_Angeles</option>
                      </select>
                    </Field>

                    <Field label="Primary Brand Color">
                      <input type="color" className="w-full h-10 rounded-lg border border-input bg-background" value={companyForm.brand_primary_color} onChange={updateCompany('brand_primary_color')} disabled={!isAdmin} />
                    </Field>

                    <Field label="Secondary Brand Color">
                      <input type="color" className="w-full h-10 rounded-lg border border-input bg-background" value={companyForm.brand_secondary_color} onChange={updateCompany('brand_secondary_color')} disabled={!isAdmin} />
                    </Field>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={saveCompanyProfile}
                      disabled={!isAdmin || saving === 'company'}
                      className="inline-flex items-center gap-2 min-h-touch px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
                    >
                      <Save size={15} />
                      {saving === 'company' ? 'Saving...' : 'Save Company Profile'}
                    </button>
                  </div>

                  <div className="border-t border-border pt-6 space-y-4">
                    <SectionHeader
                      title="Your Profile"
                      description="Your contact details and job title."
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Field label="Full Name">
                        <input className={inputCls} value={userForm.full_name} onChange={updateUser('full_name')} />
                      </Field>

                      <Field label="Phone">
                        <input className={inputCls} value={userForm.phone} onChange={updateUser('phone')} />
                      </Field>

                      <Field label="Title">
                        <input className={inputCls} value={userForm.title} onChange={updateUser('title')} />
                      </Field>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={saveUserProfile}
                        disabled={saving === 'user'}
                        className="inline-flex items-center gap-2 min-h-touch px-4 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition disabled:opacity-60"
                      >
                        <Save size={15} />
                        {saving === 'user' ? 'Saving...' : 'Save User Profile'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-5">
                  <SectionHeader
                    title="Notifications"
                    description="Choose which alerts are enabled for this browser. Email delivery requires your email integration to be connected."
                  />

                  <ToggleRow
                    title="Email notifications"
                    description="Enable general email notification preferences."
                    checked={localSettings.email_notifications}
                    onChange={(value) => updateLocal('email_notifications', value)}
                  />

                  <ToggleRow
                    title="Job activity notifications"
                    description="Notify for new jobs, job updates, assigned work, and status changes."
                    checked={localSettings.job_notifications}
                    onChange={(value) => updateLocal('job_notifications', value)}
                  />

                  <ToggleRow
                    title="Approval notifications"
                    description="Notify when estimates, supplements, and documents need approval."
                    checked={localSettings.approval_notifications}
                    onChange={(value) => updateLocal('approval_notifications', value)}
                  />

                  <ToggleRow
                    title="Billing notifications"
                    description="Notify admins for plan, payment, and billing issues."
                    checked={localSettings.billing_notifications}
                    onChange={(value) => updateLocal('billing_notifications', value)}
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={saveLocalSettings}
                      className="inline-flex items-center gap-2 min-h-touch px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
                    >
                      <Save size={15} />
                      Save Notifications
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-5">
                  <SectionHeader
                    title="Security"
                    description="Control company-level safety settings for beta testing and production readiness."
                  />

                  {!isAdmin && (
                    <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                      Only admins can update company security settings.
                    </div>
                  )}

                  <ToggleRow
                    title="Require secure exports"
                    description="Users must be signed in before opening job packets, estimates, and document exports."
                    checked={localSettings.require_secure_exports}
                    onChange={(value) => updateLocal('require_secure_exports', value)}
                  />

                  <ToggleRow
                    title="Session warning"
                    description="Warn users before they leave forms with unsaved work."
                    checked={localSettings.session_warning_enabled}
                    onChange={(value) => updateLocal('session_warning_enabled', value)}
                  />

                  <ToggleRow
                    title="Approval workflow"
                    description="Require admin or manager approval before finalizing estimates and supplements."
                    checked={enterpriseForm.approval_workflow_enabled}
                    disabled={!isAdmin}
                    onChange={(value) => updateEnterprise('approval_workflow_enabled', value)}
                  />

                  <ToggleRow
                    title="Usage reporting"
                    description="Enable company-level usage reporting for jobs, photos, estimates, and users."
                    checked={enterpriseForm.enable_usage_reporting}
                    disabled={!isAdmin}
                    onChange={(value) => updateEnterprise('enable_usage_reporting', value)}
                  />

                  <ToggleRow
                    title="Cost centers"
                    description="Track branch, department, or location cost centers when available."
                    checked={enterpriseForm.cost_center_enabled}
                    disabled={!isAdmin}
                    onChange={(value) => updateEnterprise('cost_center_enabled', value)}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <Field label="Usage Report Email">
                      <input
                        className={inputCls}
                        value={enterpriseForm.usage_report_email}
                        onChange={(event) => updateEnterprise('usage_report_email', event.target.value)}
                        disabled={!isAdmin}
                      />
                    </Field>

                    <Field label="Usage Report Frequency">
                      <select
                        className={inputCls}
                        value={enterpriseForm.usage_report_frequency}
                        onChange={(event) => updateEnterprise('usage_report_frequency', event.target.value)}
                        disabled={!isAdmin}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </Field>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={saveLocalSettings}
                      className="inline-flex items-center gap-2 min-h-touch px-4 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition"
                    >
                      <Save size={15} />
                      Save Device Security
                    </button>

                    <button
                      type="button"
                      onClick={saveEnterpriseSettings}
                      disabled={!isAdmin || saving === 'enterprise'}
                      className="inline-flex items-center gap-2 min-h-touch px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
                    >
                      <Save size={15} />
                      {saving === 'enterprise' ? 'Saving...' : 'Save Company Security'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="space-y-5">
                  <SectionHeader
                    title="Integrations"
                    description="Track which integrations are enabled. Secret keys must stay in Base44 environment variables or backend functions."
                  />

                  <IntegrationRow
                    title="Gmail / SMTP"
                    description="Used for outbound job documents, customer updates, and notifications."
                    checked={localSettings.gmail_enabled}
                    onChange={(value) => updateLocal('gmail_enabled', value)}
                  />

                  <IntegrationRow
                    title="Stripe"
                    description="Used for subscriptions, invoice payments, and payment links."
                    checked={localSettings.stripe_enabled}
                    onChange={(value) => updateLocal('stripe_enabled', value)}
                  />

                  <IntegrationRow
                    title="Wave Accounting"
                    description="Used for accounting sync and customer invoice workflows."
                    checked={localSettings.wave_enabled}
                    onChange={(value) => updateLocal('wave_enabled', value)}
                  />

                  <IntegrationRow
                    title="OpenAI"
                    description="Used for photo analysis, restoration scope suggestions, and document assistance."
                    checked={localSettings.openai_enabled}
                    onChange={(value) => updateLocal('openai_enabled', value)}
                  />

                  <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
                    Do not paste private API keys into frontend settings. Store secrets only in Base44 environment variables or backend functions.
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={saveLocalSettings}
                      className="inline-flex items-center gap-2 min-h-touch px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
                    >
                      <Save size={15} />
                      Save Integration Status
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 bg-card rounded-xl border border-border divide-y divide-border">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <ListChecks size={16} className="text-primary" />
                <div>
                  <p className="text-sm font-medium">Getting started checklist</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reopen the activation checklist on the dashboard.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReopenChecklist}
                className="min-h-touch px-3 rounded-lg border border-border text-xs text-primary font-medium hover:bg-muted transition"
              >
                Reopen
              </button>
            </div>
          </div>

          {isAdmin && companyId && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Beta Access Control
              </h2>
              <CompanyBetaPanel companyId={companyId} />
            </div>
          )}

          <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Trash2 size={18} className="text-red-600 shrink-0 mt-0.5" />

              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Delete Account</h3>
                <p className="text-sm text-red-800 mt-1">
                  Permanently delete your account and associated account data. This action cannot be undone.
                </p>

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="min-h-touch mt-3 inline-flex items-center gap-2 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
                >
                  <Trash2 size={14} /> Delete My Account
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl max-w-md w-full p-6 relative">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setConfirmText('');
              }}
              className="min-h-touch min-w-touch absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
            >
              <X size={18} />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-100 mx-auto mb-3 flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-600" />
              </div>

              <h2 className="text-lg font-bold font-display text-red-900">Delete Account?</h2>

              <p className="text-sm text-muted-foreground mt-2">
                This will permanently delete your account. This cannot be reversed.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Type <code className="font-mono font-bold text-red-600">DELETE</code> to confirm
                </label>

                <input
                  type="text"
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  placeholder="Type DELETE"
                  className={inputCls}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmText('');
                  }}
                  className="min-h-touch flex-1 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={confirmText !== 'DELETE' || deleting}
                  className="min-h-touch flex-1 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-60"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ToggleRow({ title, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full transition disabled:opacity-60 ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function IntegrationRow({ title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`min-h-touch px-3 rounded-lg border text-xs font-semibold transition ${
          checked
            ? 'border-green-300 bg-green-50 text-green-700'
            : 'border-border text-muted-foreground hover:bg-muted'
        }`}
      >
        {checked ? 'Enabled' : 'Disabled'}
      </button>
    </div>
  );
}