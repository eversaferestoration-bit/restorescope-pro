import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value || <span className="text-muted-foreground italic">—</span>}</p>
    </div>
  );
}

export default function JobProperty({ job }) {
  const { data: property } = useQuery({
    queryKey: ['property', job.property_id],
    queryFn: () => base44.entities.Property.filter({ id: job.property_id, company_id: job.company_id, is_deleted: false }),
    select: (d) => d[0],
    enabled: !!job.property_id && !!job.company_id,
  });

  if (!job.property_id) {
    return (
      <div className="bg-card rounded-xl border border-border p-10 text-center">
        <p className="text-sm text-muted-foreground italic">No property linked to this job.</p>
      </div>
    );
  }

  if (!property) {
    return <div className="h-32 rounded-xl bg-muted animate-pulse" />;
  }

  const address = [property.address_line_1, property.address_line_2, property.city, property.state, property.zip]
    .filter(Boolean).join(', ');

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <h3 className="text-sm font-semibold font-display">Property Details</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="col-span-2 md:col-span-3"><InfoRow label="Address" value={address} /></div>
        <InfoRow label="Occupancy Type" value={property.occupancy_type} />
        <InfoRow label="Structure Type" value={property.structure_type} />
        <InfoRow label="Year Built" value={property.year_built} />
        <InfoRow label="Square Feet" value={property.square_feet ? `${property.square_feet.toLocaleString()} sqft` : null} />
        {property.notes && <div className="col-span-2 md:col-span-3"><InfoRow label="Notes" value={property.notes} /></div>}
      </div>
    </div>
  );
}