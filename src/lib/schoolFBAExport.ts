import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, Footer,
} from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────────────────

function borders() {
  const b = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
  return { top: b, bottom: b, left: b, right: b };
}

function noBorders() {
  const b = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return { top: b, bottom: b, left: b, right: b };
}

function p(text: string, opts?: { bold?: boolean; size?: number; italics?: boolean; color?: string; indent?: number }): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text,
      bold: opts?.bold,
      size: opts?.size || 20,
      italics: opts?.italics,
      color: opts?.color,
    })],
    spacing: { after: 80 },
    ...(opts?.indent ? { indent: { left: opts.indent } } : {}),
  });
}

function heading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22 })],
    spacing: { before: 300, after: 120 },
  });
}

function checkSymbol(checked: boolean): string {
  return checked ? '☒' : '☐';
}

/** 2-column info row for student block (no visible borders, compact) */
function infoRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })], spacing: { after: 20 } })],
        borders: noBorders(),
        width: { size: 30, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: value || '', size: 20 })], spacing: { after: 20 } })],
        borders: noBorders(),
        width: { size: 70, type: WidthType.PERCENTAGE },
      }),
    ],
  });
}

/** Checkbox grid: items laid out in rows of `cols` columns */
function checkboxGrid(items: Array<{ label: string; checked: boolean }>, cols: number = 3): Table {
  const rows: TableRow[] = [];
  for (let i = 0; i < items.length; i += cols) {
    const cells: TableCell[] = [];
    for (let j = 0; j < cols; j++) {
      const item = items[i + j];
      cells.push(new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: item ? `${checkSymbol(item.checked)} ${item.label}` : '', size: 20 })],
          spacing: { after: 20 },
        })],
        borders: noBorders(),
        width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
      }));
    }
    rows.push(new TableRow({ children: cells }));
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// ─── Data Interface ───────────────────────────────────────────────────

export interface SchoolFBAData {
  // Student info
  studentName: string;
  dateOfBirth?: string;
  age?: string;
  ssid?: string;
  grade?: string;
  school?: string;
  teacher?: string;
  caseManager?: string;
  fbaCompletedBy?: string;

  // Section 1
  reasonForReferral: string;

  // Section 2 - Sources of Information (checkbox flags)
  sourcesChecklist: {
    parentInterview: boolean;
    teacherInterview: boolean;
    studentInterview: boolean;
    medicalRecords: boolean;
    schoolRecords: boolean;
    psychologicalEvaluation: boolean;
    slpOtAssessment: boolean;
    educationalTesting: boolean;
    iepIfsp: boolean;
    incidentReports: boolean;
    directObservation: boolean;
    anecdotalReports: boolean;
    otherSource: boolean;
    otherSourceText: string;
  };

  // Section 3
  backgroundInfo: string;

  // Section 4 - Data Collection Tools (checkbox flags)
  dataToolsChecklist: {
    abcRecording: boolean;
    intervalData: boolean;
    structuredInterviews: boolean;
    scatterplot: boolean;
    recordReview: boolean;
    otherTool: boolean;
    otherToolText: string;
  };

  // Section 5 - Indirect Assessment (split interviews)
  studentInterview: string;
  teacherInterview: string;
  parentInterview: string;

  // Section 6 - Direct Assessment
  observationSetting: {
    home: boolean;
    school: boolean;
    community: boolean;
    noObservation: boolean;
    other: boolean;
    otherText: string;
  };
  observationPeopleInvolved: string;
  observationTimeOfDay: string;
  observationDetails: Array<{
    date: string;
    activitiesObserved: string;
    dataCollectionMethods: string;
  }>;
  directObservationNarrative: string;

  // Target behaviors with per-behavior details
  targetBehaviors: Array<{
    name: string;
    operationalDefinition: string;
    baseline?: string;
    antecedents?: string;
    consequences?: string;
    hypothesizedFunction?: string;
  }>;

  // Frequency data
  frequencyData: Array<{
    behavior: string;
    count: number;
    ratePerHour?: number;
  }>;

  // ABC summary
  abcSummary: Array<{
    antecedent: string;
    behavior: string;
    consequence: string;
    count: number;
  }>;

  // Summary of findings
  summaryOfFindings: string;

  // Hypothesized function (checkboxes + narrative)
  hypothesizedFunctions: {
    attention: boolean;
    escape: boolean;
    tangible: boolean;
    automatic: boolean;
  };
  hypothesisNarrative: string;

  // Recommended strategies (numbered list)
  recommendedStrategies: string;

  // Recommendation checkboxes
  recommendationChecklist: {
    noIntervention: boolean;
    environmentalMods: boolean;
    bipNecessary: boolean;
    insufficientData: boolean;
  };

  // Legacy fields (kept for backward compat)
  hypothesisStatement?: string;
  attentionNarrative?: string;
  escapeNarrative?: string;
  tangibleNarrative?: string;
  automaticNarrative?: string;
  recommendations?: string;
  sourcesOfInformation?: string;
  dataCollectionTools?: string;
  indirectAssessment?: string;
  directObservation?: {
    setting: string;
    dates: string;
    totalSessions: number;
    totalObservationMinutes: number;
    narrative: string;
  };
  functionAnalysis?: {
    primaryFunction: string;
    primaryPercentage: number;
    secondaryFunctions: Array<{ function: string; percentage: number }>;
    topAntecedents: Array<{ value: string; percentage: number }>;
    topConsequences: Array<{ value: string; percentage: number }>;
  };

  // Signature
  analystName: string;
  analystCredentials: string;
  reportDate: string;

  // Branding
  organizationName?: string;
  footerText?: string;
}

// ─── Document Builder ─────────────────────────────────────────────────

export async function generateSchoolFBAReport(data: SchoolFBAData): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  // ═══ HEADER ═══
  children.push(new Paragraph({
    children: [
      new TextRun({ text: 'CONFIDENTIAL ', bold: true, size: 22 }),
      new TextRun({ text: 'Functional Behavior Assessment', bold: true, size: 22 }),
    ],
    spacing: { after: 200 },
  }));

  // ═══ STUDENT INFORMATION BLOCK ═══
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      infoRow('Student Name:', data.studentName),
      infoRow('SSID:', data.ssid || ''),
      infoRow('Date of Birth:', data.dateOfBirth || ''),
      infoRow('Age:', data.age || ''),
      infoRow('School Name:', data.school || ''),
      infoRow('Grade:', data.grade || ''),
      infoRow('Case Manager:', data.caseManager || ''),
      infoRow('Date of Report:', data.reportDate),
      infoRow('FBA Completed By:', data.fbaCompletedBy || data.analystName || ''),
    ],
  }));

  // ═══ 1. REASON FOR REFERRAL ═══
  children.push(heading('1. Reason for Referral and Target Problem Behaviors:'));
  children.push(p(data.reasonForReferral || '[To be completed]'));

  // ═══ 2. SOURCES OF INFORMATION ═══
  children.push(heading('2. Sources of Information:'));
  const sc = data.sourcesChecklist;
  const sourceItems = [
    { label: 'Parent Interview', checked: sc.parentInterview },
    { label: 'Teacher Interview', checked: sc.teacherInterview },
    { label: 'Student Interview', checked: sc.studentInterview },
    { label: 'Medical Records', checked: sc.medicalRecords },
    { label: 'School Records', checked: sc.schoolRecords },
    { label: 'Psychological Evaluation', checked: sc.psychologicalEvaluation },
    { label: 'SLP/OT Assessment', checked: sc.slpOtAssessment },
    { label: 'Educational Testing', checked: sc.educationalTesting },
    { label: 'IEP/IFSP', checked: sc.iepIfsp },
    { label: 'Incident/Disciplinary Action Reports', checked: sc.incidentReports },
    { label: 'Direct Observation', checked: sc.directObservation },
    { label: 'Anecdotal Reports', checked: sc.anecdotalReports },
    { label: `Other: ${sc.otherSourceText || 'Click here to list'}`, checked: sc.otherSource },
  ];
  children.push(checkboxGrid(sourceItems, 3));

  // ═══ 3. RELEVANT BACKGROUND INFORMATION ═══
  children.push(heading('3. Relevant Background Information:'));
  children.push(p(data.backgroundInfo || '[To be completed]'));

  // ═══ 4. DATA COLLECTION TOOLS ═══
  children.push(heading('4. Data Collection Tools:'));
  const dt = data.dataToolsChecklist;
  const toolItems = [
    { label: 'ABC Recording', checked: dt.abcRecording },
    { label: 'Interval Data Recording', checked: dt.intervalData },
    { label: 'Structured Interviews', checked: dt.structuredInterviews },
    { label: 'Scatterplot', checked: dt.scatterplot },
    { label: 'Record Review', checked: dt.recordReview },
    { label: `Other: ${dt.otherToolText || 'Indirect Assessment'}`, checked: dt.otherTool },
  ];
  children.push(checkboxGrid(toolItems, 3));

  // ═══ 5. INDIRECT ASSESSMENT ═══
  if (data.studentInterview?.trim()) {
    children.push(heading('5. Assessment of Behavior – Student Interview:'));
    children.push(p(data.studentInterview));
  }

  if (data.teacherInterview?.trim()) {
    children.push(heading('Indirect Assessment – Teacher Interview'));
    children.push(p(data.teacherInterview));
  }

  if (data.parentInterview?.trim()) {
    children.push(heading('Indirect Assessment – Parent/Caregiver Interview'));
    children.push(p(data.parentInterview));
  }

  // Legacy fallback
  if (!data.studentInterview?.trim() && !data.teacherInterview?.trim() && !data.parentInterview?.trim() && data.indirectAssessment?.trim()) {
    children.push(heading('5. Indirect Assessment:'));
    children.push(p(data.indirectAssessment));
  }

  // ═══ 6. DIRECT ASSESSMENT ═══
  children.push(heading('Direct Assessment - Observation Setting'));

  const os = data.observationSetting;
  const settingItems = [
    { label: 'Home', checked: os.home },
    { label: 'School', checked: os.school },
    { label: `Other: ${os.otherText || 'Click to enter'}`, checked: os.other },
    { label: 'Community', checked: os.community },
    { label: 'No Observation', checked: os.noObservation },
    { label: 'observation setting.', checked: false }, // placeholder to fill row
  ];
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${checkSymbol(os.home)} Home`, size: 20 })], spacing: { after: 20 } })],
            borders: borders(),
            width: { size: 33, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${checkSymbol(os.school)} School`, size: 20 })], spacing: { after: 20 } })],
            borders: borders(),
            width: { size: 33, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${checkSymbol(os.other)} Other: ${os.otherText || 'Click to enter'}`, size: 20 })], spacing: { after: 20 } })],
            borders: borders(),
            width: { size: 34, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${checkSymbol(os.community)} Community`, size: 20 })], spacing: { after: 20 } })],
            borders: borders(),
            width: { size: 33, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${checkSymbol(os.noObservation)} No Observation`, size: 20 })], spacing: { after: 20 } })],
            borders: borders(),
            width: { size: 33, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'observation setting.', size: 20 })], spacing: { after: 20 } })],
            borders: borders(),
            width: { size: 34, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ],
  }));

  if (data.observationPeopleInvolved) {
    children.push(p(`People Involved: ${data.observationPeopleInvolved}`, { bold: false }));
  }
  if (data.observationTimeOfDay) {
    children.push(p(`Time of Day: ${data.observationTimeOfDay}`, { bold: false }));
  }

  // FBA Observation Details table
  if (data.observationDetails && data.observationDetails.length > 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'FBA Observation Details', bold: true, size: 20 })], spacing: { before: 200, after: 100 } }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true, size: 20 })] })], borders: borders(), shading: { fill: 'D9E2F3' }, width: { size: 20, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Activities Observed', bold: true, size: 20 })] })], borders: borders(), shading: { fill: 'D9E2F3' }, width: { size: 40, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Data Collection Methods', bold: true, size: 20 })] })], borders: borders(), shading: { fill: 'D9E2F3' }, width: { size: 40, type: WidthType.PERCENTAGE } }),
          ],
        }),
        ...data.observationDetails.map(od => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: od.date, size: 20 })] })], borders: borders() }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: od.activitiesObserved, size: 20 })] })], borders: borders() }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: od.dataCollectionMethods, size: 20 })] })], borders: borders() }),
          ],
        })),
      ],
    }));
  }

  // Summary of Direct Observation Data
  children.push(heading('Summary of Direct Observation Data'));
  children.push(p(data.directObservationNarrative || data.directObservation?.narrative || '[To be completed]'));

  // Frequency data table
  if (data.frequencyData && data.frequencyData.length > 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'Frequency Data Summary', bold: true, size: 20 })], spacing: { before: 200, after: 100 } }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Behavior', bold: true, size: 20 })] })], borders: borders(), shading: { fill: 'D9E2F3' } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total Count', bold: true, size: 20 })] })], borders: borders(), shading: { fill: 'D9E2F3' } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Rate/Hour', bold: true, size: 20 })] })], borders: borders(), shading: { fill: 'D9E2F3' } }),
          ],
        }),
        ...data.frequencyData.map(f => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: f.behavior, size: 20 })] })], borders: borders() }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(f.count), size: 20 })] })], borders: borders() }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: f.ratePerHour ? f.ratePerHour.toFixed(2) : 'N/A', size: 20 })] })], borders: borders() }),
          ],
        })),
      ],
    }));
  }

  // ABC summary table
  if (data.abcSummary && data.abcSummary.length > 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'ABC Data Summary', bold: true, size: 20 })], spacing: { before: 200, after: 100 } }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Antecedent', bold: true, size: 20 })] })], borders: borders(), shading: { fill: 'D9E2F3' } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Behavior', bold: true, size: 20 })] })], borders: borders(), shading: { fill: 'D9E2F3' } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Consequence', bold: true, size: 20 })] })], borders: borders(), shading: { fill: 'D9E2F3' } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Count', bold: true, size: 20 })] })], borders: borders(), shading: { fill: 'D9E2F3' } }),
          ],
        }),
        ...data.abcSummary.slice(0, 15).map(abc => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: abc.antecedent, size: 20 })] })], borders: borders() }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: abc.behavior, size: 20 })] })], borders: borders() }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: abc.consequence, size: 20 })] })], borders: borders() }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(abc.count), size: 20 })] })], borders: borders() }),
          ],
        })),
      ],
    }));
  }

  // ═══ TARGET BEHAVIORS (per-behavior blocks) ═══
  if (data.targetBehaviors.length > 0) {
    data.targetBehaviors.forEach((beh, idx) => {
      children.push(heading(`Target Behavior ${idx + 1}: ${beh.name}`));

      children.push(new Paragraph({ children: [new TextRun({ text: 'Operational Definition:', bold: true, size: 20 })], spacing: { after: 40 } }));
      children.push(p(beh.operationalDefinition || '[To be completed]'));

      if (beh.antecedents) {
        children.push(new Paragraph({ children: [new TextRun({ text: 'Possible Antecedents:', bold: true, size: 20 })], spacing: { before: 100, after: 40 } }));
        children.push(p(beh.antecedents));
      }

      if (beh.consequences) {
        children.push(new Paragraph({ children: [new TextRun({ text: 'Possible Consequences:', bold: true, size: 20 })], spacing: { before: 100, after: 40 } }));
        children.push(p(beh.consequences));
      }

      if (beh.hypothesizedFunction) {
        children.push(new Paragraph({ children: [new TextRun({ text: 'Hypothesized Function:', bold: true, size: 20 })], spacing: { before: 100, after: 40 } }));
        children.push(p(beh.hypothesizedFunction));
      }
    });
  }

  // ═══ SUMMARY OF FINDINGS ═══
  children.push(heading('Summary of Findings'));
  children.push(p(data.summaryOfFindings || '[To be completed]'));

  // ═══ HYPOTHESIZED FUNCTION ═══
  children.push(heading('Hypothesized Function:'));
  const hf = data.hypothesizedFunctions;
  const fnCheckItems = [
    { label: 'Attention', checked: hf.attention },
    { label: 'Escape', checked: hf.escape },
    { label: 'Access to Tangibles', checked: hf.tangible },
    { label: 'Automatic Reinforcement', checked: hf.automatic },
  ];
  fnCheckItems.forEach(item => {
    children.push(p(`${checkSymbol(item.checked)} ${item.label}`, { indent: 200 }));
  });

  if (data.hypothesisNarrative?.trim()) {
    children.push(new Paragraph({ text: '', spacing: { after: 60 } }));
    children.push(p(data.hypothesisNarrative));
  }

  // Numbered strategies
  if (data.recommendedStrategies?.trim()) {
    const strategies = data.recommendedStrategies.split('\n').filter(s => s.trim());
    strategies.forEach((s, i) => {
      const text = s.replace(/^\d+\.\s*/, '');
      children.push(p(`${i + 1}. ${text}`, { indent: 200 }));
    });
  }

  // ═══ RECOMMENDATIONS ═══
  children.push(heading('Recommendations'));
  const rc = data.recommendationChecklist;
  children.push(p(`${checkSymbol(rc.noIntervention)} The student's behaviors do not require further intervention.`, { indent: 200 }));
  children.push(p(`${checkSymbol(rc.environmentalMods)} The student's behaviors suggest the need for environmental modifications/accommodations only.`, { indent: 200 }));
  children.push(p(`${checkSymbol(rc.bipNecessary)} The student's behaviors suggest a Behavior Intervention Plan is necessary.`, { indent: 200 }));
  children.push(p(`${checkSymbol(rc.insufficientData)} Existing data is insufficient for a complete functional behavior assessment. Additional data required.`, { indent: 200 }));

  // ═══ SIGNATURE ═══
  children.push(new Paragraph({ text: '', spacing: { before: 360 } }));
  children.push(p('Respectfully Submitted,'));
  children.push(new Paragraph({ text: '', spacing: { before: 300 } }));
  children.push(new Paragraph({
    children: [new TextRun({ text: '________________________________', size: 20 })],
    spacing: { after: 40 },
  }));
  children.push(new Paragraph({
    children: [
      new TextRun({ text: data.analystName || 'Behavior Analyst', bold: true, size: 20 }),
      ...(data.analystCredentials ? [new TextRun({ text: `, ${data.analystCredentials}`, size: 20 })] : []),
    ],
  }));
  children.push(p(`Date: ${data.reportDate}`));

  // Build document
  const doc = new Document({
    sections: [{
      properties: {},
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [new TextRun({ text: data.footerText || 'Confidential – School FBA Report', size: 16, color: '999999' })],
            alignment: AlignmentType.CENTER,
          })],
        }),
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `School_FBA_${data.studentName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.docx`;
  saveAs(blob, fileName);
}
