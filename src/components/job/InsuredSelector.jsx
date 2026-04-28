import { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Save, X } from 'lucide-react';

const inputCls =
  'w-full min-h-touch px-3 rounded-lg border border-input bg-background text-sm';

const emptyForm = {
  full_name: '',
  phone: '',
  email: '',
  mailing_address: '',
};

export default function InsuredSelector({ value, onChange, jobId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const companyId = user?.company_id;

  const [mode, setMode] = useState('select');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const insuredQuery = useQuery({
    queryKey: ['insureds', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      return await base44.entities.Insured.filter({
        company_id: companyId,
        is_deleted: false,
      });
    },
  });

  const insureds = insuredQuery.data || [];

  const filtered = useMemo(() => {
    if (!search) return insureds;

    const term = search.toLowerCase();

    return insureds.filter((i) =>
      [i.full_name, i.phone, i.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [insureds, search]);

  const linkToJob = async (insuredId) => {
    if (!jobId) return;

    await base44.entities.Job.update(jobId, {
      insured_id: insuredId,
    });

    await queryClient.invalidateQueries({ queryKey: ['job', jobId] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error('Name required');

      return await base44.entities.Insured.create({
        ...form,
        company_id: companyId,
        is_deleted: false,
      });
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries(['insureds', companyId]);

      await linkToJob(created.id); // FIX

      onChange(created);
      setForm(emptyForm);
      setMode('select');
    },
    onError: (err) => setError(err.message),
  });

  const selectInsured = async (insured) => {
    await linkToJob(insured.id); // FIX
    onChange(insured);
  };

  const update = (key) => (e) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
  };

  return (
    <div className="space-y-3">
      {value && (
        <div className="p-3 border rounded-lg bg-primary/5">
          <p className="font-medium">{value.full_name}</p>
          <button onClick={() => onChange(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setMode('select')}>Select</button>
        <button onClick={() => setMode('create')}>
          <Plus size={14} /> New
        </button>
      </div>

      {mode === 'select' && (
        <>
          <input
            className={inputCls}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search insured"
          />

          {filtered.map((i) => (
            <button key={i.id} onClick={() => selectInsured(i)}>
              {i.full_name}
            </button>
          ))}
        </>
      )}

      {mode === 'create' && (
        <div className="space-y-2">
          <input className={inputCls} value={form.full_name} onChange={update('full_name')} placeholder="Name" />
          <input className={inputCls} value={form.phone} onChange={update('phone')} placeholder="Phone" />
          <input className={inputCls} value={form.email} onChange={update('email')} placeholder="Email" />

          <button onClick={() => createMutation.mutate()}>
            <Save size={14} /> Save
          </button>
        </div>
      )}
    </div>
  );
}