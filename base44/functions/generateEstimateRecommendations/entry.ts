import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RECOMMENDATIONS = {
  water_mitigation: {
    equipment: [
      { category: 'Equipment', description: 'Water Extractor (20+ hrs)', unit: 'day', unit_cost: 150 },
      { category: 'Equipment', description: 'Dehumidifier', unit: 'day', unit_cost: 75 },
      { category: 'Equipment', description: 'Air Mover', unit: 'day', unit_cost: 50 },
      { category: 'Equipment', description: 'Moisture Meter', unit: 'day', unit_cost: 25 },
    ],
    containment: [
      { category: 'Containment', description: 'Plastic Sheeting & Tape', unit: 'job', unit_cost: 200 },
      { category: 'Containment', description: 'Negative Pressure Unit', unit: 'day', unit_cost: 100 },
    ],
    ppe: [
      { category: 'PPE', description: 'Full PPE Set (per technician)', unit: 'set', unit_cost: 150 },
      { category: 'PPE', description: 'N95 Masks (box of 50)', unit: 'box', unit_cost: 40 },
    ],
    labor: [
      { category: 'Labor', description: 'Water Extraction & Setup', unit: 'hour', unit_cost: 85 },
      { category: 'Labor', description: 'Monitoring & Assessment', unit: 'hour', unit_cost: 75 },
    ],
  },
  mold_remediation: {
    equipment: [
      { category: 'Equipment', description: 'HEPA Air Scrubber', unit: 'day', unit_cost: 125 },
      { category: 'Equipment', description: 'Moisture Meter', unit: 'day', unit_cost: 25 },
      { category: 'Equipment', description: 'Dehumidifier', unit: 'day', unit_cost: 75 },
    ],
    containment: [
      { category: 'Containment', description: 'Containment Barriers', unit: 'job', unit_cost: 300 },
      { category: 'Containment', description: 'Negative Air Unit', unit: 'day', unit_cost: 150 },
      { category: 'Containment', description: 'HEPA Filtration System', unit: 'job', unit_cost: 400 },
    ],
    ppe: [
      { category: 'PPE', description: 'Full Mold Remediation PPE', unit: 'set', unit_cost: 300 },
      { category: 'PPE', description: 'Respirator (P100)', unit: 'unit', unit_cost: 200 },
    ],
    antimicrobial: [
      { category: 'Antimicrobial', description: 'Mold Inhibitor Treatment', unit: 'sqft', unit_cost: 0.50 },
      { category: 'Antimicrobial', description: 'Encapsulant Coating', unit: 'sqft', unit_cost: 1.25 },
    ],
    labor: [
      { category: 'Labor', description: 'Mold Remediation Specialist', unit: 'hour', unit_cost: 95 },
      { category: 'Labor', description: 'Containment Setup', unit: 'hour', unit_cost: 85 },
    ],
  },
  contents_manipulation: {
    equipment: [
      { category: 'Equipment', description: 'Dehumidifier', unit: 'day', unit_cost: 75 },
      { category: 'Equipment', description: 'Air Mover', unit: 'day', unit_cost: 50 },
      { category: 'Equipment', description: 'Moisture Meter', unit: 'day', unit_cost: 25 },
    ],
    containment: [
      { category: 'Containment', description: 'Contents Isolation Area', unit: 'sqft', unit_cost: 2.00 },
      { category: 'Containment', description: 'Climate Control', unit: 'day', unit_cost: 150 },
    ],
    ppe: [
      { category: 'PPE', description: 'Standard PPE', unit: 'set', unit_cost: 100 },
    ],
    labor: [
      { category: 'Labor', description: 'Contents Cleaning & Restoration', unit: 'hour', unit_cost: 80 },
      { category: 'Labor', description: 'Inventory & Documentation', unit: 'hour', unit_cost: 65 },
    ],
  },
  demolition: {
    equipment: [
      { category: 'Equipment', description: 'Dumpster Rental', unit: 'month', unit_cost: 500 },
      { category: 'Equipment', description: 'Skid Loader', unit: 'day', unit_cost: 350 },
    ],
    containment: [
      { category: 'Containment', description: 'Demolition Barriers', unit: 'sqft', unit_cost: 2.50 },
      { category: 'Containment', description: 'Dust Suppression', unit: 'job', unit_cost: 400 },
    ],
    ppe: [
      { category: 'PPE', description: 'Full Demolition PPE', unit: 'set', unit_cost: 250 },
      { category: 'PPE', description: 'Hard Hat & Safety Gear', unit: 'set', unit_cost: 150 },
    ],
    labor: [
      { category: 'Labor', description: 'Demolition Technician', unit: 'hour', unit_cost: 100 },
      { category: 'Labor', description: 'Debris Removal', unit: 'hour', unit_cost: 85 },
    ],
  },
  structural_drying: {
    equipment: [
      { category: 'Equipment', description: 'Industrial Dehumidifier', unit: 'day', unit_cost: 150 },
      { category: 'Equipment', description: 'Air Mover (heavy duty)', unit: 'day', unit_cost: 75 },
      { category: 'Equipment', description: 'Moisture Meter (advanced)', unit: 'day', unit_cost: 40 },
      { category: 'Equipment', description: 'Thermal Imaging', unit: 'job', unit_cost: 300 },
    ],
    containment: [
      { category: 'Containment', description: 'Climate Control System', unit: 'day', unit_cost: 200 },
      { category: 'Containment', description: 'Structural Drying Barriers', unit: 'sqft', unit_cost: 3.00 },
    ],
    ppe: [
      { category: 'PPE', description: 'Structural Drying PPE', unit: 'set', unit_cost: 150 },
    ],
    labor: [
      { category: 'Labor', description: 'Structural Drying Technician', unit: 'hour', unit_cost: 105 },
      { category: 'Labor', description: 'Monitoring & Adjustment', unit: 'hour', unit_cost: 80 },
    ],
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { service_type, scope = 'all' } = body;

    if (!service_type || !RECOMMENDATIONS[service_type]) {
      return Response.json({ error: 'Invalid service_type' }, { status: 400 });
    }

    const recs = RECOMMENDATIONS[service_type];
    let recommendations = [];

    // Return specific scope or all recommendations
    if (scope === 'equipment') {
      recommendations = recs.equipment || [];
    } else if (scope === 'containment') {
      recommendations = recs.containment || [];
    } else if (scope === 'ppe') {
      recommendations = recs.ppe || [];
    } else if (scope === 'labor') {
      recommendations = recs.labor || [];
    } else if (scope === 'antimicrobial') {
      recommendations = recs.antimicrobial || [];
    } else {
      // Return all recommendations
      recommendations = [
        ...(recs.equipment || []),
        ...(recs.containment || []),
        ...(recs.ppe || []),
        ...(recs.labor || []),
        ...(recs.antimicrobial || []),
      ];
    }

    return Response.json({
      service_type,
      recommendations: recommendations.map(r => ({
        ...r,
        id: crypto.randomUUID(),
        is_suggested: true,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});