import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

function LeadCard({ lead, index, stage }) {
  return (
    <Draggable draggableId={`lead-${lead.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="rounded-lg border p-4 bg-card hover:shadow-lg transition cursor-move"
          style={{
            ...provided.draggableProps.style,
            borderLeft: `4px solid ${stage.color}`,
            opacity: snapshot.isDragging ? 0.8 : 1,
          }}>
          <Link
            to={`/crm/${lead.id}`}
            className="block hover:opacity-80 transition"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-2 mb-2">
              <GripVertical size={14} className="text-muted-foreground mt-1 shrink-0" {...provided.dragHandleProps} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{lead.customer_name}</p>
                <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
              </div>
            </div>
          </Link>
          {lead.service_type && (
            <p className="text-xs px-2 py-1 rounded-full inline-block mb-2" style={{ background: stage.color + '20', color: stage.color }}>
              {lead.service_type}
            </p>
          )}
          {lead.assigned_to_name && (
            <p className="text-xs text-muted-foreground">👤 {lead.assigned_to_name}</p>
          )}
          {lead.estimated_value && (
            <p className="text-xs font-semibold mt-1" style={{ color: stage.color }}>
              ${lead.estimated_value.toLocaleString()}
            </p>
          )}
        </div>
      )}
    </Draggable>
  );
}

export default function CRMKanban({ stages, isLoading }) {
  const qc = useQueryClient();
  const [updating, setUpdating] = useState(false);

  const updateStageMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('updateLeadStage', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err) => {
      toast({
        title: '❌ Failed to move lead',
        description: err?.message,
        variant: 'destructive',
      });
    },
  });

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const leadId = draggableId.replace('lead-', '');
    const newStage = stages[destination.droppableId].id;

    setUpdating(true);
    updateStageMutation.mutate({ lead_id: leadId, pipeline_stage: newStage });
    setTimeout(() => setUpdating(false), 500);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-6 h-full">
        {stages.map((stage) => (
          <Droppable key={stage.id} droppableId={stage.id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex-shrink-0 w-80 rounded-xl border p-4 space-y-3"
                style={{
                  background: snapshot.isDraggingOver ? 'var(--accent)' : 'var(--card)',
                  minHeight: '600px',
                }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full" style={{ background: stage.color }} />
                  <h3 className="font-semibold text-foreground">{stage.label}</h3>
                  <span className="ml-auto text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted">
                    {stage.leads.length}
                  </span>
                </div>

                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="rounded-lg bg-muted h-24 animate-pulse" />
                    ))}
                  </div>
                ) : stage.leads.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No leads</p>
                  </div>
                ) : (
                  stage.leads.map((lead, idx) => (
                    <LeadCard key={lead.id} lead={lead} index={idx} stage={stage} />
                  ))
                )}

                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}