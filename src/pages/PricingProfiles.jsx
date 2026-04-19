import { Tag, Plus } from 'lucide-react';

export default function PricingProfiles() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Pricing Profiles</h1>
          <p className="text-sm text-muted-foreground mt-1">Define labor and material pricing for estimates</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition">
          <Plus size={15} />
          New Profile
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[280px]">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <Tag size={24} className="text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold font-display">No pricing profiles yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add pricing profiles to use on your estimates.</p>
        </div>
      </div>
    </div>
  );
}