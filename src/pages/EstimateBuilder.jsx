import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Plus, Trash2, Wand2, Download, CheckCircle2, Send } from 'lucide-react';
import LineItemsTable from './estimate/LineItemsTable';
import EstimateSummary from './estimate/EstimateSummary';

const SERVICE_TYPES = [
  'water_mitigation',
  'mold_remediation',
  'contents_manipulation',
  'demolition',
  'structural_drying',
];

export default function EstimateBuilder() {
  const companyId = useCompanyId();
  const qc = useQueryClient();
  const [estimateId, setEstimateId] = useState(null);
  const [formData, setFormData] = useState({
    estimate_number: `EST-${Date.now()}`,
    customer_name: '',
    email: '',
    phone: '',
    property_address: '',
    service_type: 'water_mitigation',
    notes: '',
    line_items: [],
    tax_rate: 0.08,
  });

  // Load estimate if editing
  const { data: estimate, isLoading } = useQuery({
    queryKey: ['estimate', estimateId],
    queryFn: () => estimateId ? base44.entities.Estimate.filter({ id: estimateId }, '-created_date', 1) : null,
    enabled: !!estimateId,
  });

  useEffect(() => {
    if (estimate?.[0]) {
      const est = estimate[0];
      setFormData({
        estimate_number: est.estimate_number,
        customer_name: est.customer_name,
        email: est.email || '',
        phone: est.phone || '',
        property_address: est.property_address || '',
        service_type: est.service_type,
        notes: est.notes || '',
        line_items: est.line_items || [],
        tax_rate: est.tax_rate || 0.08,
      });
    }
  }, [estimate]);

  // AI recommendations
  const { mutate: generateRecommendations, isPending: isGenerating } = useMutation({
    mutationFn: (data) => base44.functions.invoke('generateEstimateRecommendations', data),
    onSuccess: (res) => {
      const items = res.data?.items || [];
      setFormData(prev => ({
        ...prev,
        line_items: items,
      }));
      toast({
        title: '✅ AI recommendations loaded',
        description: `${items.length} line items suggested`,
      });
    },
    onError: (err) => {
      toast({
        title: '❌ Failed to generate recommendations',
        description: err?.message,
        variant: 'destructive',
      });
    },
  });

  // Save estimate
  const { mutate: saveEstimate, isPending: isSaving } = useMutation({
    mutationFn: async (data) => {
      const subtotal = data.line_items.reduce((sum, item) => sum + (item.total || 0), 0);
      const tax = Math.round(subtotal * data.tax_rate * 100) / 100;
      const total = subtotal + tax;

      if (estimateId) {
        return base44.entities.Estimate.update(estimateId, {
          ...data,
          subtotal,
          tax,
          total,
          company_id: companyId,
        });
      } else {
        return base44.entities.Estimate.create({
          ...data,
          subtotal,
          tax,
          total,
          company_id: companyId,
          status: 'draft',
        });
      }
    },
    onSuccess: () => {
      toast({
        title: '✅ Estimate saved',
      });
      qc.invalidateQueries({ queryKey: ['estimates'] });
    },
    onError: (err) => {
      toast({
        title: '❌ Failed to save estimate',
        description: err?.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddLineItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, {
        id: `item-${Date.now()}`,
        category: '',
        description: '',
        unit: '',
        quantity: 1,
        unit_cost: 0,
        total: 0,
      }],
    }));
  };

  const handleUpdateLineItem = (id, updates) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.map(item => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          updated.total = (updated.quantity || 0) * (updated.unit_cost || 0);
          return updated;
        }
        return item;
      }),
    }));
  };

  const handleDeleteLineItem = (id) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.filter(item => item.id !== id),
    }));
  };

  const subtotal = formData.line_items.reduce((sum, item) => sum + (item.total || 0), 0);
  const tax = Math.round(subtotal * formData.tax_rate * 100) / 100;
  const total = subtotal + tax;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Estimate Builder</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => generateRecommendations({ service_type: formData.service_type })}
              disabled={isGenerating || !formData.service_type}
            >
              <Wand2 size={16} className="mr-2" />
              {isGenerating ? 'Generating...' : 'AI Suggest'}
            </Button>
            <Button
              onClick={() => saveEstimate(formData)}
              disabled={isSaving || !formData.customer_name}
            >
              {isSaving ? 'Saving...' : 'Save Estimate'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-lg border p-4 space-y-4">
              <h2 className="font-semibold text-foreground">Customer Information</h2>
              
              <Input
                placeholder="Estimate Number"
                value={formData.estimate_number}
                onChange={(e) => setFormData(prev => ({ ...prev, estimate_number: e.target.value }))}
              />

              <Input
                placeholder="Customer Name *"
                value={formData.customer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
                <Input
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <Input
                placeholder="Property Address"
                value={formData.property_address}
                onChange={(e) => setFormData(prev => ({ ...prev, property_address: e.target.value }))}
              />

              <Select value={formData.service_type} onValueChange={(val) => setFormData(prev => ({ ...prev, service_type: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <textarea
                placeholder="Notes (optional)"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-2 border rounded-lg text-sm"
                rows="3"
              />
            </div>

            {/* Line Items */}
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Line Items</h2>
                <Button size="sm" onClick={handleAddLineItem}>
                  <Plus size={14} className="mr-1" /> Add Item
                </Button>
              </div>

              {formData.line_items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No line items. Click "Add Item" or "AI Suggest" to get started.</p>
              ) : (
                <LineItemsTable
                  items={formData.line_items}
                  onUpdate={handleUpdateLineItem}
                  onDelete={handleDeleteLineItem}
                />
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <EstimateSummary
              subtotal={subtotal}
              tax={tax}
              total={total}
              tax_rate={formData.tax_rate}
              onTaxRateChange={(rate) => setFormData(prev => ({ ...prev, tax_rate: rate }))}
            />

            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-semibold text-foreground text-sm">Actions</h3>
              <Button variant="outline" className="w-full" size="sm">
                <Download size={14} className="mr-2" /> Export PDF
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                <Send size={14} className="mr-2" /> Send to Customer
              </Button>
              <Button className="w-full" size="sm">
                <CheckCircle2 size={14} className="mr-2" /> Approve & Create Job
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}