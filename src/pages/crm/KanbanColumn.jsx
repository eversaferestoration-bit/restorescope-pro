import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GripVertical } from 'lucide-react';

export default function KanbanColumn({ stage, leads, onDrop, count }) {
  const dragOverRef = useRef(null);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const leadId = e.dataTransfer.getData('leadId');
    const leadData = JSON.parse(e.dataTransfer.getData('leadData'));
    onDrop(leadData);
  };

  return (
    <div className="flex-shrink-0 w-80">
      <div className="rounded-lg border-2 overflow-hidden" style={{ borderColor: stage.color + '40', background: stage.color + '08' }}>
        {/* Header */}
        <div className="px-4 py-3 border-b" style={{ borderColor: stage.color + '40', background: stage.color + '15' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold" style={{ color: stage.color }}>{stage.label}</h2>
            <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: stage.color + '25', color: stage.color }}>
              {count}
            </span>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          ref={dragOverRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="min-h-96 p-3 space-y-2 transition-all"
          style={{
            background: isDraggingOver ? stage.color + '20' : 'transparent',
            borderTop: isDraggingOver ? `2px solid ${stage.color}` : 'none',
          }}
        >
          {leads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No leads</div>
          ) : (
            leads.map(lead => (
              <LeadCard key={lead.id} lead={lead} stage={stage} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function LeadCard({ lead, stage }) {
  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('leadId', lead.id);
    e.dataTransfer.setData('leadData', JSON.stringify(lead));
  };

  return (
    <Link to={`/crm/lead/${lead.id}`}
      draggable
      onDragStart={handleDragStart}
      className="block p-3 rounded-lg border bg-card hover:shadow-lg transition-all cursor-grab active:cursor-grabbing"
      style={{ borderColor: stage.color + '50' }}>
      <div className="flex items-start gap-2">
        <GripVertical size={16} className="text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{lead.customer_name}</p>
          {lead.phone && <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>}
          {lead.service_type && <p className="text-xs mt-1" style={{ color: stage.color }}>{lead.service_type}</p>}
          {lead.estimated_value && (
            <p className="text-xs font-bold mt-2" style={{ color: stage.color }}>
              ${lead.estimated_value.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}