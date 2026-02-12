import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, Header, Footer,
} from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import type { BehaviorFunction } from '@/types/behavior';

const FUNCTION_LABELS: Record<string, string> = {
  attention: 'Attention',
  escape: 'Escape/Avoidance',
  tangible: 'Tangible/Access',
  sensory: 'Sensory/Automatic',
  automatic: 'Automatic Reinforcement',
  unknown: 'Unknown/Undetermined',
};

function borders() {
  const b = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
  return { top: b, bottom: b, left: b, right: b };
}

function headerCell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20 })] })],
    borders: borders(),
    shading: { fill: 'D9E2F3' },
  });
}

function cell(text: string, opts?: { bold?: boolean }): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, size: 20, bold: opts?.bold })] })],
    borders: borders(),
  });
}

function labelValueRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
        borders: borders(),
        width: { size: 35, type: WidthType.PERCENTAGE },
        shading: { fill: 'F2F2F2' },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: value || '[To be completed]', size: 20 })] })],
        borders: borders(),
        width: { size: 65, type: WidthType.PERCENTAGE },
      }),
    ],
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, color: '1F3864' })],
    spacing: { before: 360, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: '1F3864' } },
  });
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20 })],
    spacing: { after: 80 },
  });
}

export interface SchoolFBAData {
  // Student info
  studentName: string;
  dateOfBirth?: string;
  ssid?: string;
  grade?: string;
  school?: string;
  teacher?: string;
  caseManager?: string;

  // Sections (all editable)
  reasonForReferral: string;
  targetBehaviors: Array<{
    name: string;
    operationalDefinition: string;
    baseline?: string;
  }>;
  sourcesOfInformation: string;
  dataCollectionTools: string;
  indirectAssessment: string;

  // Direct observation
  directObservation: {
    setting: string;
    dates: string;
    totalSessions: number;
    totalObservationMinutes: number;
    narrative: string;
  };

  // ABC summary data
  abcSummary: Array<{
    antecedent: string;
    behavior: string;
    consequence: string;
    count: number;
  }>;

  // Frequency data
  frequencyData: Array<{
    behavior: string;
    count: number;
    ratePerHour?: number;
  }>;

  // Function analysis
  functionAnalysis: {
    primaryFunction: string;
    primaryPercentage: number;
    secondaryFunctions: Array<{ function: string; percentage: number }>;
    topAntecedents: Array<{ value: string; percentage: number }>;
    topConsequences: Array<{ value: string; percentage: number }>;
  };

  // Hypothesized function narratives
  hypothesisStatement: string;
  attentionNarrative: string;
  escapeNarrative: string;
  tangibleNarrative: string;
  automaticNarrative: string;

  // Recommendations
  recommendedStrategies: string;
  recommendations: string;

  // Signature
  analystName: string;
  analystCredentials: string;
  reportDate: string;

  // Branding
  organizationName?: string;
  footerText?: string;
}

export async function generateSchoolFBAReport(data: SchoolFBAData): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(new Paragraph({
    children: [new TextRun({ text: 'FUNCTIONAL BEHAVIOR ASSESSMENT', bold: true, size: 32, color: '1F3864' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'School-Based Report', size: 24, color: '4472C4' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  }));

  // ═══ I. STUDENT INFORMATION ═══
  children.push(sectionHeading('I. STUDENT INFORMATION'));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      labelValueRow('Student Name', data.studentName),
      labelValueRow('Date of Birth', data.dateOfBirth || ''),
      labelValueRow('SSID/Student ID', data.ssid || ''),
      labelValueRow('Grade', data.grade || ''),
      labelValueRow('School', data.school || ''),
      labelValueRow('Teacher', data.teacher || ''),
      labelValueRow('Case Manager', data.caseManager || ''),
      labelValueRow('Report Date', data.reportDate),
    ],
  }));

  // ═══ II. REASON FOR REFERRAL ═══
  children.push(sectionHeading('II. REASON FOR REFERRAL'));
  children.push(bodyText(data.reasonForReferral || '[To be completed]'));

  // ═══ III. TARGET BEHAVIORS ═══
  children.push(sectionHeading('III. TARGET BEHAVIORS'));
  if (data.targetBehaviors.length > 0) {
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [headerCell('Behavior'), headerCell('Operational Definition'), headerCell('Baseline')] }),
        ...data.targetBehaviors.map(b =>
          new TableRow({ children: [cell(b.name), cell(b.operationalDefinition || '[Pending]'), cell(b.baseline || 'N/A')] })
        ),
      ],
    }));
  } else {
    children.push(bodyText('[No target behaviors defined]'));
  }

  // ═══ IV. SOURCES OF INFORMATION ═══
  children.push(sectionHeading('IV. SOURCES OF INFORMATION'));
  children.push(bodyText(data.sourcesOfInformation || '[To be completed]'));

  // ═══ V. DATA COLLECTION TOOLS ═══
  children.push(sectionHeading('V. DATA COLLECTION TOOLS'));
  children.push(bodyText(data.dataCollectionTools || '[To be completed]'));

  // ═══ VI. INDIRECT ASSESSMENT ═══
  children.push(sectionHeading('VI. INDIRECT ASSESSMENT (Teacher/Staff Interview)'));
  children.push(bodyText(data.indirectAssessment || '[To be completed]'));

  // ═══ VII. DIRECT OBSERVATION ═══
  children.push(sectionHeading('VII. DIRECT OBSERVATION'));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      labelValueRow('Setting', data.directObservation.setting || 'School'),
      labelValueRow('Observation Dates', data.directObservation.dates || ''),
      labelValueRow('Total Sessions', String(data.directObservation.totalSessions)),
      labelValueRow('Total Observation Time', `${data.directObservation.totalObservationMinutes} minutes`),
    ],
  }));
  children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
  children.push(bodyText(data.directObservation.narrative || ''));

  // Frequency Data Table
  if (data.frequencyData.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Frequency Data Summary', bold: true, size: 20, color: '1F3864' })],
      spacing: { before: 200, after: 100 },
    }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [headerCell('Behavior'), headerCell('Total Count'), headerCell('Rate/Hour')] }),
        ...data.frequencyData.map(f =>
          new TableRow({ children: [cell(f.behavior), cell(String(f.count)), cell(f.ratePerHour ? f.ratePerHour.toFixed(2) : 'N/A')] })
        ),
      ],
    }));
  }

  // ABC Summary Table
  if (data.abcSummary.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'ABC Data Summary', bold: true, size: 20, color: '1F3864' })],
      spacing: { before: 200, after: 100 },
    }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [headerCell('Antecedent'), headerCell('Behavior'), headerCell('Consequence'), headerCell('Count')] }),
        ...data.abcSummary.slice(0, 15).map(abc =>
          new TableRow({ children: [cell(abc.antecedent), cell(abc.behavior), cell(abc.consequence), cell(String(abc.count))] })
        ),
      ],
    }));
  }

  // ═══ VIII. FUNCTION ANALYSIS ═══
  children.push(sectionHeading('VIII. FUNCTION ANALYSIS'));

  // Function distribution table
  const allFunctions: Array<{ name: string; pct: number }> = [
    { name: data.functionAnalysis.primaryFunction, pct: data.functionAnalysis.primaryPercentage },
    ...data.functionAnalysis.secondaryFunctions.map(s => ({ name: s.function, pct: s.percentage })),
  ].filter(f => f.pct > 0);

  if (allFunctions.length > 0) {
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [headerCell('Function'), headerCell('Percentage'), headerCell('Strength')] }),
        ...allFunctions.map(f => {
          const label = FUNCTION_LABELS[f.name] || f.name;
          const strength = f.pct >= 50 ? 'Primary' : f.pct >= 25 ? 'Secondary' : 'Minor';
          return new TableRow({ children: [cell(label), cell(`${f.pct}%`), cell(strength, { bold: strength === 'Primary' })] });
        }),
      ],
    }));
  }

  // Antecedent/Consequence summary
  if (data.functionAnalysis.topAntecedents.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Common Antecedents:', bold: true, size: 20 })],
      spacing: { before: 160, after: 60 },
    }));
    for (const a of data.functionAnalysis.topAntecedents.slice(0, 5)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `• ${a.value} (${a.percentage}%)`, size: 20 })],
        indent: { left: 360 },
        spacing: { after: 40 },
      }));
    }
  }

  if (data.functionAnalysis.topConsequences.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Common Consequences:', bold: true, size: 20 })],
      spacing: { before: 120, after: 60 },
    }));
    for (const c of data.functionAnalysis.topConsequences.slice(0, 5)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `• ${c.value} (${c.percentage}%)`, size: 20 })],
        indent: { left: 360 },
        spacing: { after: 40 },
      }));
    }
  }

  // ═══ IX. HYPOTHESIZED FUNCTION ═══
  children.push(sectionHeading('IX. HYPOTHESIZED FUNCTION'));
  if (data.hypothesisStatement) {
    children.push(new Paragraph({
      children: [new TextRun({ text: data.hypothesisStatement, italics: true, size: 20 })],
      spacing: { after: 160 },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color: '4472C4' } },
      indent: { left: 200 },
    }));
  }

  // Function-specific narratives table
  const fnNarratives = [
    { label: 'Attention', value: data.attentionNarrative },
    { label: 'Escape/Avoidance', value: data.escapeNarrative },
    { label: 'Tangible/Access', value: data.tangibleNarrative },
    { label: 'Automatic Reinforcement', value: data.automaticNarrative },
  ].filter(n => n.value?.trim());

  if (fnNarratives.length > 0) {
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [headerCell('Function'), headerCell('Analysis')] }),
        ...fnNarratives.map(n =>
          new TableRow({ children: [cell(n.label, { bold: true }), cell(n.value)] })
        ),
      ],
    }));
  }

  // ═══ X. RECOMMENDED STRATEGIES ═══
  children.push(sectionHeading('X. RECOMMENDED STRATEGIES'));
  children.push(bodyText(data.recommendedStrategies || '[To be completed]'));

  // ═══ XI. RECOMMENDATIONS ═══
  children.push(sectionHeading('XI. RECOMMENDATIONS'));
  children.push(bodyText(data.recommendations || '[To be completed]'));

  // ═══ XII. SIGNATURE ═══
  children.push(new Paragraph({ text: '', spacing: { before: 480 } }));
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
  children.push(new Paragraph({
    children: [new TextRun({ text: `Date: ${data.reportDate}`, size: 20 })],
    spacing: { after: 200 },
  }));

  // Build document
  const doc = new Document({
    sections: [{
      properties: {},
      headers: data.organizationName ? {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({ text: data.organizationName, bold: true, size: 18, color: '1F3864' })],
            alignment: AlignmentType.CENTER,
          })],
        }),
      } : undefined,
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
