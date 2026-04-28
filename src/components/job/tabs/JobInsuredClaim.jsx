import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState } from 'react';
import InsuredSelector from '@/components/job/InsuredSelector';
import { Button } from '@/components/ui/button';

export default function JobInsuredClaim({ job }) {
  const [editing, setEditing] = useState(false);

  const { data: insured } = useQuery({
    queryKey: ['insured', job.insured_id],
    queryFn: () =>
      base44.entities.Insured.filter({
        id: job.insured_id,
        company_id: job.company_id,
        is_deleted: false,
      }),
    select: (d) => d[0],
    enabled: !!job.insured_id,
  });

  return (
    <div className="space-y-4">
      <div className="bg-card border p-4 rounded-xl space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Insured</h2>

          <Button size="sm" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel' : insured ? 'Edit' : 'Add'}
          </Button>
        </div>

        {!editing && (
          <>
            {insured ? (
              <div className="space-y-1">
                <p className="font-medium">{insured.full_name}</p>
                <p className="text-sm text-muted-foreground">{insured.phone}</p>
                <p className="text-sm text-muted-foreground">{insured.email}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">No insured linked</p>
            )}
          </>
        )}

        {editing && (
          <InsuredSelector
            value={insured}
            jobId={job.id} // CRITICAL FIX
            onChange={() => setEditing(false)}
          />
        )}
      </div>
    </div>
  );
}