import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Save } from 'lucide-react';

const inputCls = 'w-full px-3 py-2 border rounded';

export default function Settings() {
  const { user } = useAuth();

  const [company, setCompany] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address_line_1: '',
    city: '',
    state: '',
    zip: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const companyId = user?.company_id;

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);

    try {
      let existing = null;

      if (companyId) {
        const res = await base44.entities.Company.filter({
          id: companyId,
          is_deleted: false,
        });

        existing = res?.[0] || null;
      }

      // 🔥 AUTO CREATE COMPANY IF MISSING
      if (!existing) {
        const created = await base44.entities.Company.create({
          name: 'My Company',
          company_id: companyId,
          is_deleted: false,
        });

        existing = created;
      }

      setCompany(existing);

      setForm({
        name: existing.name || '',
        email: existing.email || '',
        phone: existing.phone || '',
        address_line_1: existing.address_line_1 || '',
        city: existing.city || '',
        state: existing.state || '',
        zip: existing.zip || '',
      });

    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  const save = async () => {
    setSaving(true);

    try {
      if (!company?.id) throw new Error('Missing company');

      const updated = await base44.entities.Company.update(company.id, {
        ...form,
        is_deleted: false,
      });

      setCompany(updated);
      setMsg('Saved successfully');

      setTimeout(() => setMsg(''), 3000);

    } catch (err) {
      setMsg(err.message);
    }

    setSaving(false);
  };

  const setField = (key) => (e) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
  };

  if (loading) return <div className="p-6">Loading settings...</div>;

  return (
    <div className="p-6 max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Company Settings</h1>

      <input className={inputCls} placeholder="Company Name" value={form.name} onChange={setField('name')} />
      <input className={inputCls} placeholder="Email" value={form.email} onChange={setField('email')} />
      <input className={inputCls} placeholder="Phone" value={form.phone} onChange={setField('phone')} />
      <input className={inputCls} placeholder="Address" value={form.address_line_1} onChange={setField('address_line_1')} />
      <input className={inputCls} placeholder="City" value={form.city} onChange={setField('city')} />
      <input className={inputCls} placeholder="State" value={form.state} onChange={setField('state')} />
      <input className={inputCls} placeholder="ZIP" value={form.zip} onChange={setField('zip')} />

      <button
        onClick={save}
        disabled={saving}
        className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2"
      >
        <Save size={14} />
        {saving ? 'Saving...' : 'Save Company'}
      </button>

      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}