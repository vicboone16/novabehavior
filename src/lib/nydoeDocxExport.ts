import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak,
} from 'docx';
import { saveAs } from 'file-saver';
import type { NydoeHeaderData, NydoeSection } from './nydoeTemplate';

const FONT = 'Arial';
const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function p(text: string, opts?: { bold?: boolean; size?: number; heading?: typeof HeadingLevel.HEADING_1; alignment?: typeof AlignmentType.CENTER; spacing?: { before?: number; after?: number } }) {
  const run = new TextRun({
    text,
    font: FONT,
    size: (opts?.size || 11) * 2,
    bold: opts?.bold,
  });

  return new Paragraph({
    children: [run],
    heading: opts?.heading,
    alignment: opts?.alignment,
    spacing: opts?.spacing,
  });
}

function multiLineParagraphs(text: string): Paragraph[] {
  if (!text) return [p('')];
  return text.split('\n').map(line => {
    if (line.startsWith('•') || line.startsWith('*') || line.startsWith('-')) {
      return p(line.replace(/^[•*-]\s*/, ''), { size: 11 });
    }
    return p(line, { size: 11 });
  });
}

function headerTable(header: NydoeHeaderData): Table {
  const rows = [
    ['Diagnosis:', header.diagnosis, 'Patient Name:', header.patientName],
    ['Diagnostician:', header.diagnostician, 'Parent Name:', header.parentName],
    ['Comorbid Diagnoses:', header.comorbidDiagnoses, 'Date of Birth:', header.dateOfBirth],
    ['Age:', header.age, 'Report Date:', header.reportDate],
    ['Assessor Name:', `${header.assessorName}${header.assessorCredentials ? ', ' + header.assessorCredentials : ''}`, '', ''],
  ];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1800, 2880, 1800, 2880],
    rows: rows.map(row => new TableRow({
      children: row.map((cell, i) => new TableCell({
        width: { size: i % 2 === 0 ? 1800 : 2880, type: WidthType.DXA },
        borders: cellBorders,
        margins: cellMargins,
        shading: i % 2 === 0 ? { fill: 'E8EEF4', type: ShadingType.CLEAR } : undefined,
        children: [new Paragraph({
          children: [new TextRun({ text: cell, font: FONT, size: 20, bold: i % 2 === 0 })],
        })],
      })),
    })),
  });
}

function goalTable(goals: any[]): Table | Paragraph {
  if (!goals || goals.length === 0) return p('No goals defined.');

  const headerRow = new TableRow({
    children: ['Goal Name', 'Target', 'Baseline', 'Current', 'Mastery Criteria', 'Target Date'].map(h =>
      new TableCell({
        width: { size: 1560, type: WidthType.DXA },
        borders: cellBorders,
        margins: cellMargins,
        shading: { fill: '2C5F7C', type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: h, font: FONT, size: 18, bold: true, color: 'FFFFFF' })] })],
      })
    ),
  });

  const dataRows = goals.map(g => new TableRow({
    children: [g.goalName, g.target, g.baseline, g.currentPerformance, g.masteryCriteria, g.targetMasteryDate].map(v =>
      new TableCell({
        width: { size: 1560, type: WidthType.DXA },
        borders: cellBorders,
        margins: cellMargins,
        children: [new Paragraph({ children: [new TextRun({ text: v || '', font: FONT, size: 18 })] })],
      })
    ),
  }));

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1560, 1560, 1560, 1560, 1560, 1560],
    rows: [headerRow, ...dataRows],
  });
}

export async function exportNydoeDocx(
  header: NydoeHeaderData,
  sectionsData: Record<string, string>,
  templateSections: NydoeSection[],
) {
  const children: (Paragraph | Table)[] = [];

  // Title page
  children.push(p(header.patientName ? `${header.patientName} - ${header.reportTitle}` : header.reportTitle, {
    heading: HeadingLevel.HEADING_1, bold: true, size: 16, alignment: AlignmentType.CENTER,
  }));

  if (header.agencyName) {
    children.push(p(header.agencyName, { bold: true, size: 14, alignment: AlignmentType.CENTER }));
  }

  children.push(p(header.reportSubtitle || 'Initial Assessment Summary', {
    size: 13, alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  children.push(headerTable(header));
  children.push(p('', { spacing: { after: 200 } }));

  // Group and render sections
  let currentParent = '';
  for (const section of templateSections) {
    const content = sectionsData[section.key] ?? section.content;

    // Parent section heading
    if (section.parentSection && section.parentSection !== currentParent) {
      currentParent = section.parentSection;
      children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(p(currentParent, {
        heading: HeadingLevel.HEADING_1, bold: true, size: 14,
        spacing: { before: 300, after: 200 },
      }));
    }

    // Section heading
    children.push(p(section.title, {
      bold: true, size: 12,
      spacing: { before: 200, after: 100 },
    }));

    // Content
    if (section.type === 'behavior_block') {
      try {
        const behaviors = JSON.parse(content);
        if (Array.isArray(behaviors)) {
          behaviors.forEach((b: any, i: number) => {
            children.push(p(`Behavior ${i + 1}: ${b.name}`, { bold: true, size: 12, spacing: { before: 200 } }));

            const fields = [
              ['Type of assessment:', b.assessmentType],
              ['Operational Definition:', b.operationalDefinition],
              ['Severity:', b.severity],
              ['Examples:', b.examples],
              ['Nonexamples:', b.nonexamples],
              ['Educational Impact:', b.educationalImpact],
              ['Hypothesized Function:', b.function],
              ['Antecedent Events:', b.antecedents],
              ['Onset:', b.onset],
              ['Offset:', b.offset],
              ['Measurement:', b.measurement],
              ['Baseline:', b.baseline],
            ];

            fields.forEach(([label, value]) => {
              if (value) {
                children.push(new Paragraph({
                  children: [
                    new TextRun({ text: `${label} `, font: FONT, size: 22, bold: true }),
                    new TextRun({ text: value, font: FONT, size: 22 }),
                  ],
                  spacing: { after: 60 },
                }));
              }
            });

            children.push(p('Intervention Plans', { bold: true, size: 11, spacing: { before: 100 } }));
            if (b.prevention) { children.push(p('Prevention Strategies:', { bold: true })); children.push(...multiLineParagraphs(b.prevention)); }
            if (b.replacement) { children.push(p('Replacement Strategies:', { bold: true })); children.push(...multiLineParagraphs(b.replacement)); }
            if (b.response) { children.push(p('Response Strategies:', { bold: true })); children.push(...multiLineParagraphs(b.response)); }
          });
        }
      } catch { children.push(p(content)); }
    } else if (section.type === 'goal_table') {
      try {
        const goals = JSON.parse(content);
        children.push(goalTable(goals));
      } catch { children.push(p(content)); }
    } else {
      children.push(...multiLineParagraphs(content));
    }
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: FONT, size: 22 } } },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: FONT },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, font: FONT },
          paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              new TextRun({ text: `${header.patientName || 'Client'} `, font: FONT, size: 16, bold: true }),
              new TextRun({ text: header.dateOfBirth || '', font: FONT, size: 16 }),
            ],
            alignment: AlignmentType.RIGHT,
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [new TextRun({ text: 'Confidential – NYDOE CR Report', font: FONT, size: 16, color: '999999' })],
            alignment: AlignmentType.CENTER,
          })],
        }),
      },
      children,
    }],
  });

  const buffer = await Packer.toBlob(doc);
  const fileName = `NYDOE_CR_Report_${(header.patientName || 'Client').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`;
  saveAs(buffer, fileName);
}
