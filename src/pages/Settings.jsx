import { useState } from 'react';
import { Settings as SettingsIcon, ListChecks, Trash2, AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleReopenChecklist = () => {
    localStorage.removeItem('activation_checklist_dismissed');
    window.dispatchEvent(new Event('reopen_activation_checklist'));
    navigate('/dashboard');
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      return;
    }
    setDeleting(true);
    try {
      await base44.functions.invoke('deleteUserAccount', { user_id: user.id });
      base44.auth.logout('/login');
    } catch (e) {
      alert('Failed to delete account. Please try again.');
      setDeleting(false);
    }
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
            <button className="touch-target text-xs text-primary font-medium hover:underline">Manage</button>
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
            className="touch-target text-xs text-primary font-medium hover:underline"
          >
            Reopen
          </button>
        </div>
      </div>

      {/* Delete Account Section */}
      <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Trash2 size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Delete Account</h3>
            <p className="text-sm text-red-800 mt-1">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="touch-target mt-3 inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
            >
              <Trash2 size={14} /> Delete My Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setConfirmText('');
              }}
              className="touch-target absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
            >
              <X size={18} />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-100 mx-auto mb-3 flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold font-display text-red-900">Delete Account?</h2>
              <p className="text-sm text-muted-foreground mt-2">
                This will permanently delete your account and all associated data. This cannot be reversed.
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
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmText('');
                  }}
                  className="touch-target flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={confirmText !== 'DELETE' || deleting}
                  className="touch-target flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}