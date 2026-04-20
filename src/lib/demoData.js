/**
 * Static demo data — never touches the database.
 * All IDs are prefixed with "demo_" to make isolation obvious.
 */

export const DEMO_JOB = {
  id: 'demo_job_001',
  job_number: 'RSP-20260315-DEMO',
  loss_type: 'water',
  service_type: 'Mitigation',
  cause_of_loss: 'Burst supply line under kitchen sink',
  status: 'in_progress',
  date_of_loss: '2026-03-15',
  inspection_date: '2026-03-16',
  emergency_flag: true,
  after_hours_flag: false,
  summary_notes: 'Category 2 water loss. Kitchen and adjacent hallway affected. Moisture migrated into subfloor and lower cabinet toe-kicks.',
  created_date: '2026-03-16T08:30:00Z',
};

export const DEMO_INSURED = {
  full_name: 'Sarah & Michael Thornton',
  email: 'mthornton@email.com',
  phone: '(312) 555-0182',
};

export const DEMO_PROPERTY = {
  address_line_1: '4821 Elmwood Ave',
  city: 'Chicago',
  state: 'IL',
  zip: '60640',
};

export const DEMO_ROOMS = [
  { id: 'demo_room_01', name: 'Kitchen', square_footage: 220, affected: true },
  { id: 'demo_room_02', name: 'Hallway', square_footage: 85, affected: true },
  { id: 'demo_room_03', name: 'Dining Room', square_footage: 160, affected: false },
];

export const DEMO_ESTIMATE = {
  id: 'demo_est_001',
  label: 'v1 — Initial Estimate',
  version_number: 1,
  status: 'approved',
  subtotal: 6840.0,
  modifier_total: 1.12,
  total: 7660.80,
  approved_by: 'james.reyes@restoresco.com',
  approved_at: '2026-03-18T14:22:00Z',
  line_items: [
    { room_name: 'Kitchen',  category: 'extraction',    description: 'Water extraction',              unit: 'sqft', quantity: 220, unit_cost: 0.35,  line_total: 77.00 },
    { room_name: 'Kitchen',  category: 'drying',        description: 'Structural drying (per day)',   unit: 'day',  quantity: 4,   unit_cost: 125,   line_total: 500.00 },
    { room_name: 'Kitchen',  category: 'demolition',    description: 'Drywall removal — lower cabs',  unit: 'sqft', quantity: 48,  unit_cost: 1.75,  line_total: 84.00 },
    { room_name: 'Kitchen',  category: 'cleaning',      description: 'Antimicrobial treatment',       unit: 'sqft', quantity: 220, unit_cost: 0.55,  line_total: 121.00 },
    { room_name: 'Kitchen',  category: 'hepa',          description: 'HEPA air scrubber (per day)',   unit: 'day',  quantity: 4,   unit_cost: 85,    line_total: 340.00 },
    { room_name: 'Kitchen',  category: 'containment',   description: 'Containment setup',             unit: 'lf',   quantity: 32,  unit_cost: 4.50,  line_total: 144.00 },
    { room_name: 'Kitchen',  category: 'documentation', description: 'Moisture documentation',        unit: 'hr',   quantity: 2,   unit_cost: 65,    line_total: 130.00 },
    { room_name: 'Hallway',  category: 'extraction',    description: 'Water extraction',              unit: 'sqft', quantity: 85,  unit_cost: 0.35,  line_total: 29.75 },
    { room_name: 'Hallway',  category: 'drying',        description: 'Structural drying (per day)',   unit: 'day',  quantity: 3,   unit_cost: 125,   line_total: 375.00 },
    { room_name: 'Hallway',  category: 'demolition',    description: 'Baseboard removal',             unit: 'lf',   quantity: 22,  unit_cost: 2.10,  line_total: 46.20 },
    { room_name: 'Hallway',  category: 'cleaning',      description: 'Antimicrobial treatment',       unit: 'sqft', quantity: 85,  unit_cost: 0.55,  line_total: 46.75 },
  ],
};

export const DEMO_DEFENSE = {
  defense_score: 87,
  carrier_pushback_risk: 'low',
  analysis_summary: 'Estimate is well-documented with strong photo evidence. Drying days are within industry norms for Cat 2 water loss at this square footage.',
  risk_flags: [
    { severity: 'low', category: 'pricing', description: 'HEPA scrubber rate slightly above regional median. Consider adding equipment log note.', },
  ],
  recommended_actions: [
    { priority: 'medium', action: 'Attach moisture log readings for all 4 drying days', rationale: 'Carriers commonly challenge drying day counts without sensor data.' },
    { priority: 'low',    action: 'Add photo of containment barrier with date stamp', rationale: 'Strengthens justification for containment line item.' },
  ],
};