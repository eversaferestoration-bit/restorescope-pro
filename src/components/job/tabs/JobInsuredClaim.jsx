import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value || <span className="text-muted-foreground italic">—</span>}</p>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <h3 className="text-sm font-semibold font-display">{title}</h3>
      {children}
    </div>
  );
}

export default function JobInsuredClaim({ job }) {
  const { data: insured } = useQuery({
    queryKey: ['insured', job.insured_id],
    queryFn: () => base44.entities.Insured.filter({ id: job.insured_id, company_id: job.company_id, is_deleted: false }),
    select: (d) => d[0],
    enabled: !!job.insured_id && !!job.company_id,
  });

  const { data: claim } = useQuery({
    queryKey: ['claim', job.claim_id],
    queryFn: () => base44.entities.Claim.filter({ id: job.claim_id, company_id: job.company_id, is_deleted: false }),
    select: (d) => d[0],
    enabled: !!job.claim_id && !!job.company_id,
  });

  const { data: carrier } = useQuery({
    queryKey: ['carrier', claim?.carrier_id],
    queryFn: () => base44.entities.Carrier.filter({ id: claim.carrier_id, company_id: job.company_id, is_deleted: false }),
    select: (d) => d[0],
    enabled: !!claim?.carrier_id && !!job.company_id,
  });

  const { data: adjuster } = useQuery({
    queryKey: ['adjuster', claim?.adjuster_id],
    queryFn: () => base44.entities.Adjuster.filter({ id: claim.adjuster_id, company_id: job.company_id, is_deleted: false }),
    select: (d) => d[0],
    enabled: !!claim?.adjuster_id && !!job.company_id,
  });

  return (
    <div className="space-y-4">
      {/* Insured */}
      <Card title="Insured">
        {insured ? (
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Name" value={insured.full_name} />
            <InfoRow label="Phone" value={insured.phone} />
            <InfoRow label="Email" value={insured.email} />
            <InfoRow label="Alternate Phone" value={insured.alternate_phone} />
            <div className="col-span-2"><InfoRow label="Billing Address" value={insured.billing_address} /></div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No insured linked to this job.</p>
        )}
      </Card>

      {/* Claim */}
      <Card title="Claim">
        {claim ? (
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Claim Number" value={claim.claim_number} />
            <InfoRow label="Policy Number" value={claim.policy_number} />
            <InfoRow label="Deductible" value={claim.deductible != null ? `$${Number(claim.deductible).toLocaleString()}` : null} />
            <InfoRow label="Status" value={claim.claim_status} />
            <InfoRow label="Date of Loss" value={claim.date_of_loss ? format(new Date(claim.date_of_loss), 'MMM d, yyyy') : null} />
            <InfoRow label="Reported Date" value={claim.reported_date ? format(new Date(claim.reported_date), 'MMM d, yyyy') : null} />
            {claim.coverage_notes && <div className="col-span-2"><InfoRow label="Coverage Notes" value={claim.coverage_notes} /></div>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No claim linked to this job.</p>
        )}
      </Card>

      {/* Carrier */}
      <Card title="Carrier">
        {carrier ? (
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Name" value={carrier.name} />
            <InfoRow label="Phone" value={carrier.phone} />
            <InfoRow label="Email" value={carrier.email} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No carrier linked.</p>
        )}
      </Card>

      {/* Adjuster */}
      <Card title="Adjuster">
        {adjuster ? (
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Name" value={adjuster.full_name} />
            <InfoRow label="Title" value={adjuster.title} />
            <InfoRow label="Phone" value={adjuster.phone} />
            <InfoRow label="Email" value={adjuster.email} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No adjuster linked.</p>
        )}
      </Card>
    </div>
  );
}