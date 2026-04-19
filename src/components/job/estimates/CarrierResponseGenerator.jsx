import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, MessageSquare, FileText, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@/lib/utils';

export default function CarrierResponseGenerator({ estimateVersionId }) {
  const [feedbackText, setFeedbackText] = useState('');
  const [response, setResponse] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  const mutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('generateCarrierResponse', data),
    onSuccess: (res) => {
      setResponse(res.data.carrier_response);
    },
    onError: (err) => {
      console.error('Failed to generate carrier response:', err);
    },
  });

  const handleGenerate = () => {
    if (!feedbackText.trim()) return;
    mutation.mutate({ estimate_version_id: estimateVersionId, carrier_feedback_text: feedbackText });
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const SectionCard = ({ title, icon: Icon, content, sectionKey }) => {
    if (!content) return null;
    const isArray = Array.isArray(content);
    const isExpanded = expandedSection === sectionKey;

    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition"
        >
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-primary" />
            <span className="text-sm font-semibold">{title}</span>
            {isArray && <span className="text-xs text-muted-foreground">({content.length} items)</span>}
          </div>
          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        {isExpanded && (
          <div className="px-4 py-3 bg-card">
            {isArray ? (
              <ul className="space-y-2">
                {content.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">
                    {typeof item === 'string' ? item : (
                      <div>
                        <p className="font-medium text-foreground">{item.point}</p>
                        <p className="text-xs mt-1">{item.supporting_evidence}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-primary" />
          <h3 className="text-sm font-semibold">Carrier Response Generator</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Paste the carrier's feedback or denial letter below. The AI will generate a professional, evidence-based response.
        </p>
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Paste carrier feedback here (e.g., 'Line items 3-7 are denied as not directly related to the reported loss...')"
          className="w-full h-32 px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleGenerate}
          disabled={mutation.isPending || !feedbackText.trim()}
          className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
        >
          {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          {mutation.isPending ? 'Generating Response…' : 'Generate Carrier Response'}
        </button>
      </div>

      {/* Loading State */}
      {mutation.isPending && (
        <div className="bg-card rounded-xl border border-primary/30 p-6 text-center space-y-2">
          <Loader2 size={24} className="animate-spin mx-auto text-primary" />
          <p className="text-sm font-medium">Analyzing estimate and generating professional response…</p>
          <p className="text-xs text-muted-foreground">This may take 10–20 seconds.</p>
        </div>
      )}

      {/* Error State */}
      {mutation.isError && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm text-destructive">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <p>Failed to generate response. Please try again.</p>
        </div>
      )}

      {/* Response Output */}
      {response && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-green-600" />
            <h3 className="text-sm font-semibold">Generated Response</h3>
          </div>

          <SectionCard
            title="Opening Statement"
            icon={MessageSquare}
            content={response.opening_statement}
            sectionKey="opening"
          />

          <SectionCard
            title="Rebuttal Points"
            icon={FileText}
            content={response.rebuttal_points}
            sectionKey="rebuttals"
          />

          <SectionCard
            title="Documentation References"
            icon={FileText}
            content={response.documentation_references}
            sectionKey="docs"
          />

          <SectionCard
            title="Justification Citations"
            icon={FileText}
            content={response.justification_citations}
            sectionKey="justifications"
          />

          {response.revised_language && (
            <SectionCard
              title="Suggested Revised Language"
              icon={FileText}
              content={response.revised_language}
              sectionKey="revised"
            />
          )}

          <SectionCard
            title="Closing Statement"
            icon={MessageSquare}
            content={response.closing_statement}
            sectionKey="closing"
          />

          {/* Copy Full Response */}
          <button
            onClick={() => {
              const fullText = [
                response.opening_statement,
                '\n\nRebuttal Points:\n' + response.rebuttal_points.map(p => `• ${typeof p === 'string' ? p : p.point}`).join('\n'),
                '\n\nDocumentation: ' + response.documentation_references.join(', '),
                '\n\nJustifications: ' + response.justification_citations.join(', '),
                response.revised_language ? `\n\nRevised Language: ${response.revised_language}` : '',
                '\n\n' + response.closing_statement,
              ].join('');
              navigator.clipboard.writeText(fullText);
            }}
            className="w-full h-9 rounded-lg border border-primary text-primary text-xs font-semibold hover:bg-accent transition"
          >
            Copy Full Response
          </button>
        </div>
      )}
    </div>
  );
}