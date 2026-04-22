import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Droplets, AlertCircle, Building2, ChevronDown, ChevronUp } from 'lucide-react';

export default function CompanySetup() {
  const navigate = useNavigate();
  const { user, checkUserAuth } = useAuth();

  const [userProfileId, setUserProfileId] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    phone: '',
    email: '',
    service_area: '',
    logo_url: '',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Load existing profile/company on mount
  useEffect(() => {
    if (!user) {
      console.log('[CompanySetup] No user — redirecting to login');
      navigate('/login', { replace: true });
      return;
    }

    const loadProfile = async () => {
      try {
        console.log('[CompanySetup] Loading profile for user:', user.id);
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id, is_deleted: false });

        if (profiles.length > 0) {
          const profile = profiles[0];
          console.log('[CompanySetup] Profile loaded:', profile.id, '| company_id:', profile.company_id);
          setUserProfileId(profile.id);
          setCompanyId(profile.company_id || null);

          if (profile.company_id) {
            const companies = await base44.entities.Company.filter({ id: profile.company_id, is_deleted: false });
            if (companies.length > 0) {
              const co = companies[0];
              console.log('[CompanySetup] Pre-filling company form from:', co.id);
              setForm({
                company_name: co.name || '',
                phone: co.phone || '',
                email: co.email || user?.email || '',
                service_area: co.city || '',
                logo_url: co.logo_url || '',
              });
            }
          } else {
            setForm((f) => ({ ...f, email: user?.email || '' }));
          }
        } else {
          console.log('[CompanySetup] No profile found — will create on submit');
          setForm((f) => ({ ...f, email: user?.email || '' }));
        }
      } catch (e) {
        console.error('[CompanySetup] Failed to load profile:', e?.message);
        setError('Could not load your profile. Please refresh and try again.');
      } finally {
        setInitializing(false);
      }
    };

    loadProfile();
  }, [user?.id]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, logo_url: file_url }));
    } catch (e) { /* silent */ }
  };

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      setError('Company name is required.');
      return;
    }

    setLoading(true);
    setError('');
    console.log('[CompanySetup] Saving company:', form.company_name.trim());

    try {
      let cId = companyId;

      if (!cId) {
        console.log('[CompanySetup] Creating new company');
        const company = await base44.entities.Company.create({
          name: form.company_name.trim(),
          phone: form.phone || undefined,
          email: form.email || user?.email,
          city: form.service_area || undefined,
          logo_url: form.logo_url || undefined,
          status: 'active',
          created_by: user?.email,
          is_deleted: false,
        });
        cId = company.id;
        console.log('[CompanySetup] Company created:', cId);
        setCompanyId(cId);
      } else {
        console.log('[CompanySetup] Updating existing company:', cId);
        await base44.entities.Company.update(cId, {
          name: form.company_name.trim(),
          phone: form.phone || undefined,
          email: form.email || undefined,
          city: form.service_area || undefined,
          logo_url: form.logo_url || undefined,
        });
      }

      // Create or update UserProfile with the company link
      if (!userProfileId) {
        console.log('[CompanySetup] Creating UserProfile for company:', cId);
        const profile = await base44.entities.UserProfile.create({
          user_id: user.id,
          company_id: cId,
          email: user.email,
          role: 'admin',
          current_onboarding_step: 3,
          onboarding_status: 'company_completed',
          completed_steps: [1, 2],
          is_deleted: false,
        });
        setUserProfileId(profile.id);
        console.log('[CompanySetup] UserProfile created:', profile.id);
      } else {
        console.log('[CompanySetup] Updating UserProfile with company:', cId);
        await base44.entities.UserProfile.update(userProfileId, {
          company_id: cId,
          current_onboarding_step: 3,
          onboarding_status: 'company_completed',
        });
      }

      // Refresh auth context so ProtectedRoute re-evaluates account state
      console.log('[CompanySetup] Refreshing auth session state');
      await checkUserAuth();

      console.log('[CompanySetup] Company setup complete — navigating to onboarding');
      navigate('/onboarding', { replace: true });
    } catch (e) {
      console.error('[CompanySetup] Save failed:', e?.message);
      setError('Could not save your company. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Brand header */}
      <div className="flex items-center px-5 py-4 border-b border-border bg-card/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Droplets size={16} className="text-white" />
          </div>
          <span className="text-sm font-bold font-display">RestoreScope Pro</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-8">
        <div className="w-full max-w-[420px]">

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Building2 size={20} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold font-display mb-1">Set up your company</h1>
            <p className="text-sm text-muted-foreground mb-5">
              Tell us about your restoration company so we can personalize your workspace.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Company name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={set('company_name')}
                  autoFocus
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Acme Restoration LLC"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
              >
                {showMore ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showMore ? 'Hide optional details' : 'Add phone, email, service area (optional)'}
              </button>

              {showMore && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={set('phone')}
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="(555) 000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={set('email')}
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="hello@company.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Service area</label>
                    <input
                      type="text"
                      value={form.service_area}
                      onChange={set('service_area')}
                      className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="e.g. Dallas, TX metro"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Logo</label>
                    <div className="flex items-center gap-2">
                      {form.logo_url && (
                        <img src={form.logo_url} alt="Logo" className="w-8 h-8 rounded object-contain border border-border" />
                      )}
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-input bg-background text-xs font-medium hover:bg-muted transition">
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={handleSave}
                disabled={loading || !form.company_name.trim()}
                className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {loading ? 'Saving…' : 'Save & Continue'}
              </button>
            </div>

            {error && (
              <div className="mt-3">
                <button
                  onClick={handleSave}
                  disabled={loading || !form.company_name.trim()}
                  className="w-full h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition disabled:opacity-60"
                >
                  Go to company setup
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            {user?.email && <span>Logged in as: <strong>{user.email}</strong></span>}
          </p>
        </div>
      </div>
    </div>
  );
}