/**
 * Centralized UI copy for demo ecosystem — tooltips, empty states, alert messages, labels.
 */

// ── Tooltips ──────────────────────────────────────────────
export const TOOLTIPS = {
  teacherSummary: 'Submitted by a teacher. This helps inform school-based support and assessments.',
  caregiverSummary: 'Submitted through Behavior Decoded. Often used to guide parent training.',
  assessmentPending: 'Pending means the form has been sent but not yet completed.',
  assessmentReviewed: 'This assessment has been scored and reviewed by a supervisor.',
  assessmentUnreviewed: 'Results are available but have not yet been reviewed by a supervisor.',
  authorization: 'Defines how many service units are approved by the payer.',
  unitsRemaining: 'Tracks how much service is still available under the current authorization.',
  sessionNote: 'A structured note tied to a specific service session, typically completed by an RBT or provider.',
  narrativeNote: 'A flexible, non-session-specific note used for observations, updates, or summaries.',
  supervisionNote: 'Documentation of BCBA or supervisor oversight, feedback, and clinical direction.',
  parentTrainingNote: 'A note documenting caregiver coaching, often informed by caregiver-reported data.',
  soapNote: 'Structured note format: Subjective, Objective, Assessment, Plan.',
  fba: 'A structured process to identify the function of behavior using interviews, observations, and ABC data.',
  bip: 'A plan derived from FBA results that outlines strategies, supports, and interventions.',
  claim: 'A billing submission sent to a payer for reimbursement.',
  invoice: 'A billing record sent to a private-pay client.',
  draftNote: 'This note has not been finalized. It must be signed before it affects billing.',
  unsignedNote: 'This note is complete but awaiting a signature from the author or supervisor.',
  sourceTeacherApp: 'This data was submitted through the standalone Teacher App.',
  sourceTeacherMode: 'This data was entered via Teacher Mode inside the core platform.',
  sourceBehaviorDecoded: 'This data came from the Behavior Decoded parent app.',
  sourceClinician: 'This data was entered directly by a clinician in the core platform.',
  sourceCaregiverPortal: 'This data was submitted by a caregiver through the portal.',
} as const;

// ── Empty States ──────────────────────────────────────────
export const EMPTY_STATES = {
  teacherSummaries: 'No teacher summaries yet — once submitted, they\'ll appear here.',
  caregiverSummaries: 'No caregiver summaries yet — once submitted through Behavior Decoded, they\'ll appear here.',
  sessionNotes: 'No session notes yet — notes will appear here after sessions are documented.',
  assessments: 'No assessments yet — sent assessments and their results will appear here.',
  fba: 'No FBA records yet — functional behavior assessments will appear here when initiated.',
  billingRecords: 'No billing records yet — claims, invoices, and authorizations will appear here.',
  alerts: 'No active alerts — the system will surface warnings when action is needed.',
  tasks: 'No open tasks — actionable items will appear here when assigned.',
  parentTraining: 'No parent training notes yet — notes will appear here after caregiver coaching sessions.',
  supervision: 'No supervision notes yet — oversight documentation will appear here.',
  abcLogs: 'No ABC logs yet — antecedent-behavior-consequence records will appear here.',
  recommendations: 'No recommendations yet — they will be generated from assessment and FBA results.',
} as const;

// ── Alert Copy ────────────────────────────────────────────
export const ALERT_COPY = {
  expiringAuth: 'Authorization expiring soon — review to avoid service interruption.',
  missingNote: 'A session note is missing — this may delay billing.',
  pendingAssessment: 'A caregiver assessment is still pending — results will appear once completed.',
  overdueNote: 'This note is past its due date — complete it to unblock billing.',
  blockedBilling: 'Billing is blocked — documentation or authorization issues need resolution.',
  unitsDepleted: 'Authorized units are nearly exhausted — consider requesting a renewal.',
  deniedClaim: 'This claim was denied — review the reason and resubmit or appeal.',
} as const;

// ── Demo Banners ──────────────────────────────────────────
export const DEMO_BANNERS = {
  primary: 'You\'re in Demo Mode — this is a simulated environment with sample data.',
  secondary: 'Explore freely. Nothing here affects real client data.',
} as const;

// ── Source Labels ─────────────────────────────────────────
export const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  teacher_app: { label: 'Teacher App', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  teacher_mode_core: { label: 'Teacher Mode', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  behavior_decoded_parent_app: { label: 'Behavior Decoded', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  caregiver_portal: { label: 'Caregiver Portal', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  clinician_entered: { label: 'Clinician', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
} as const;
