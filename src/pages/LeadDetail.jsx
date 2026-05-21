import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, MapPin, Phone, Mail, DollarSign, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import LeadInfo from '@/pages/crm/detail/LeadInfo';
import LeadNotes from '@/pages/crm/detail/LeadNotes';
import LeadTasks from '@/pages/crm/detail/LeadTasks';
import LeadActivity from '@/pages/crm/detail/LeadActivity';
import LeadReminders from '@/pages/crm/detail/LeadReminders';
import LeadDocuments from '@/pages/crm/detail/LeadDocuments';

export default function LeadDetail() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');

  const { data: lead, isLoading: leadLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => base44.entities.Lead.get(leadId),
    enabled: !!leadId,
  });

  if (leadLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Lead not found</p>
      </div>
    );
  }

  const TABS = [
    { id: 'info', label: 'Information' },
    { id: 'notes', label: 'Notes & Comments' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'activity', label: 'Activity' },
    { id: 'reminders', label: 'Reminders' },
    { id: 'documents', label: 'Documents' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="p-6 flex items-center gap-4">
          <button
            onClick={() => navigate('/crm')}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{lead.customer_name}</h1>
            <p className="text-sm text-muted-foreground mt-1">Pipeline: {lead.pipeline_stage.replace(/_/g, ' ')}</p>
          </div>
        </div>

        {/* Quick Info */}
        <div className="px-6 pb-6 flex flex-wrap gap-4">
          {lead.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone size={16} className="text-muted-foreground" />
              <a href={`tel:${lead.phone}`} className="hover:text-primary transition">{lead.phone}</a>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail size={16} className="text-muted-foreground" />
              <a href={`mailto:${lead.email}`} className="hover:text-primary transition">{lead.email}</a>
            </div>
          )}
          {lead.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin size={16} />
              <span>{lead.address}{lead.city ? `, ${lead.city}` : ''}</span>
            </div>
          )}
          {lead.estimated_value && (
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#10b981' }}>
              <DollarSign size={16} />
              ${lead.estimated_value.toLocaleString()}
            </div>
          )}
          {lead.stage_updated_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar size={16} />
              Updated {new Date(lead.stage_updated_at).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-6 flex gap-1 border-t overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl">
        {activeTab === 'info' && <LeadInfo lead={lead} />}
        {activeTab === 'notes' && <LeadNotes lead={lead} />}
        {activeTab === 'tasks' && <LeadTasks lead={lead} />}
        {activeTab === 'activity' && <LeadActivity lead={lead} />}
        {activeTab === 'reminders' && <LeadReminders lead={lead} />}
        {activeTab === 'documents' && <LeadDocuments lead={lead} />}
      </div>
    </div>
  );
}