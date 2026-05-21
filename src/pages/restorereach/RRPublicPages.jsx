import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRRCompany } from '@/hooks/useRRCompany';
import RRAccessGate from './components/RRAccessGate';
import {
  Globe, Plus, Eye, Trash2, Edit, CheckCircle, Clock, AlertCircle,
  ArrowRight, Zap, Search, Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const SERVICES = [
  { value: 'water_damage', label: 'Water Damage Restoration' },
  { value: 'mold_remediation', label: 'Mold Remediation' },
  { value: 'sewage_cleanup', label: 'Sewage Cleanup' },
  { value: 'flood_cleanup', label: 'Flood Cleanup' },
  { value: 'emergency_drying', label: 'Emergency Drying' },
];

function PageCard({ page, onPublish, onDelete, isLoading }) {
  const statusColor = page.published ? 'text-green-600' : 'text-yellow-600';
  const statusIcon = page.published ? CheckCircle : Clock;
  const StatusIcon = statusIcon;

  return (
    <div className="rounded-lg border p-4 bg-card hover:shadow-md transition" style={{ borderColor: '#1e2d45' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate">{page.content?.h1 || 'Untitled'}</h3>
          <p className="text-sm text-muted-foreground">
            {page.city} • {SERVICES.find(s => s.value === page.service)?.label}
          </p>
        </div>
        <StatusIcon size={18} className={statusColor} />
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {page.meta_description}
        </p>
        <div className="flex flex-wrap gap-1">
          {page.keywords?.slice(0, 2).map((kw, i) => (
            <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              {kw}
            </span>
          ))}
          {page.keywords?.length > 2 && (
            <span className="text-xs text-muted-foreground px-2 py-0.5">
              +{page.keywords.length - 2} more
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <a
          href={`/public/${page.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 text-sm px-3 py-2 rounded bg-primary/10 text-primary hover:bg-primary/20 transition"
        >
          <Eye size={16} /> Preview
        </a>

        <button
          onClick={() => onPublish(page.id, !page.published)}
          disabled={isLoading}
          className="flex-1 text-sm px-3 py-2 rounded bg-green-500/10 text-green-600 hover:bg-green-500/20 transition disabled:opacity-50"
        >
          {page.published ? 'Unpublish' : 'Publish'}
        </button>

        <button
          onClick={() => onDelete(page.id)}
          disabled={isLoading}
          className="px-3 py-2 rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 transition disabled:opacity-50"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function GenerateForm({ companyId, onSuccess }) {
  const [city, setCity] = useState('');
  const [service, setService] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!city || !service) return;

    setIsLoading(true);
    try {
      const result = await base44.functions.invoke('generateSEOPage', {
        company_id: companyId,
        city: city.trim(),
        service,
      });

      if (result.data?.success) {
        setCity('');
        setService('');
        onSuccess();
      }
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border p-6 bg-card" style={{ borderColor: '#1e2d45', background: '#0d1829' }}>
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Zap size={20} style={{ color: '#e05a1c' }} /> Generate New Page
      </h2>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-white mb-2 block">City</label>
          <Input
            placeholder="e.g., Chicago, Austin, Denver"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-white mb-2 block">Service</label>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
          >
            <option value="">Select a service...</option>
            {SERVICES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!city || !service || isLoading}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Zap size={16} className="mr-2" /> Generate Page
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function RRPublicPages() {
  const { companyId, profileLoading, isReady } = useRRCompany();
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['public-pages', companyId],
    queryFn: () =>
      base44.entities.PublicPage.filter(
        { company_id: companyId, is_deleted: false },
        '-created_date',
        100
      ),
    enabled: !!companyId,
  });

  const publishMutation = useMutation({
    mutationFn: ({ pageId, published }) =>
      base44.entities.PublicPage.update(pageId, { published }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['public-pages'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (pageId) =>
      base44.entities.PublicPage.update(pageId, { is_deleted: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['public-pages'] }),
  });

  const filteredPages = pages.filter((page) => {
    const matchesSearch =
      page.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.meta_title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesService = serviceFilter === 'all' || page.service === serviceFilter;
    return matchesSearch && matchesService;
  });

  const publishedCount = pages.filter((p) => p.published).length;

  return (
    <RRAccessGate isReady={isReady} profileLoading={profileLoading}>
      <div className="p-4 md:p-7 max-w-6xl mx-auto space-y-5 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe size={22} style={{ color: '#e05a1c' }} /> Public Landing Pages
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#7ba3c8' }}>
            Generate SEO-optimized city & service pages for local search rankings
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total Pages', value: pages.length, color: '#7ba3c8' },
            { label: 'Published', value: publishedCount, color: '#10b981' },
            { label: 'Draft', value: pages.length - publishedCount, color: '#f59e0b' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border p-3 text-center" style={{ background: '#0d1829', borderColor: '#1e2d45' }}>
              <p className="text-xl md:text-2xl font-bold" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="text-xs mt-1" style={{ color: '#7ba3c8' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Generator + Filter row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <GenerateForm companyId={companyId} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['public-pages'] })} />

          {/* Filter panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-lg border p-6 bg-card" style={{ borderColor: '#1e2d45', background: '#0d1829' }}>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Filter size={20} /> Find Pages
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-white mb-2 block">Search</label>
                  <Input
                    placeholder="Search by city or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-white mb-2 block">Service Filter</label>
                  <select
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
                  >
                    <option value="all">All Services</option>
                    {SERVICES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pages list */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#3a5a7c' }}>
            Pages ({filteredPages.length})
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 rounded-lg bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="rounded-lg border p-12 text-center" style={{ borderColor: '#1e2d45', background: '#0d1829' }}>
              <Globe size={40} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-white font-semibold mb-1">No pages found</p>
              <p className="text-muted-foreground text-sm">
                {pages.length === 0
                  ? 'Create your first SEO landing page to get started'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPages.map((page) => (
                <PageCard
                  key={page.id}
                  page={page}
                  onPublish={(id, pub) => publishMutation.mutate({ pageId: id, published: pub })}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  isLoading={publishMutation.isPending || deleteMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </RRAccessGate>
  );
}