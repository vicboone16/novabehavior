import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Footer, Header } from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import type { InsuranceReportConfig, TemplateSection } from '@/types/reportTemplates';

function buildHeader(config: InsuranceReportConfig): Header {
  const children: Paragraph[] = [];
  if (config.branding?.organizationName) {
    children.push(new Paragraph({
      children: [new TextRun({ text: config.branding.organizationName, bold: true, size: 20, color: config.branding.primaryColor?.replace('#', '') || '000000' })],
      alignment: AlignmentType.CENTER,
    }));
  }
  if (config.branding?.contactInfo) {
    const parts = [config.branding.contactInfo.phone, config.branding.contactInfo.email, config.branding.contactInfo.address].filter(Boolean);
    if (parts.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: parts.join(' | '), size: 16, color: '666666' })],
        alignment: AlignmentType.CENTER,
      }));
    }
  }
  return new Header({ children: children.length > 0 ? children : [new Paragraph('')] });
}

function buildFooter(config: InsuranceReportConfig): Footer {
  return new Footer({
    children: [new Paragraph({
      children: [new TextRun({ text: config.branding?.footerText || 'Confidential', size: 16, color: '999999' })],
      alignment: AlignmentType.CENTER,
    })],
  });
}

function buildSectionContent(section: TemplateSection, data: InsuranceReportConfig['data']): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Section heading
  paragraphs.push(new Paragraph({
    text: section.title,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  }));

  // Fields
  for (const field of section.fields) {
    const value = data.fieldValues[`${section.key}.${field.key}`] || data.fieldValues[field.key] || field.prefill || '';
    
    if (field.type === 'textarea') {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: `${field.label}:`, bold: true })],
        spacing: { before: 100, after: 50 },
      }));
      paragraphs.push(new Paragraph({
        text: value || '[To be completed]',
        spacing: { after: 100 },
      }));
    } else {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({ text: `${field.label}: `, bold: true }),
          new TextRun({ text: value || '[To be completed]' }),
        ],
        spacing: { after: 50 },
      }));
    }
  }

  return paragraphs;
}

export async function generateInsuranceReport(config: InsuranceReportConfig): Promise<void> {
  const { template, data } = config;
  
  const enabledSections = template.sections.filter(
    s => s.enabled && data.enabledSections.includes(s.key)
  );

  const allParagraphs: Paragraph[] = [];

  // Title
  const reportTypeLabel = template.report_type === 'initial_assessment' ? 'Initial Assessment Report' : 'Progress Report';
  allParagraphs.push(new Paragraph({
    text: reportTypeLabel.toUpperCase(),
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  allParagraphs.push(new Paragraph({
    children: [new TextRun({ text: template.name, bold: true, size: 28 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));

  allParagraphs.push(new Paragraph({
    children: [new TextRun({ text: data.studentName, size: 24 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }));

  allParagraphs.push(new Paragraph({
    text: `Report Period: ${data.dateRangeStart} – ${data.dateRangeEnd}`,
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }));

  // Build each enabled section
  for (const section of enabledSections) {
    allParagraphs.push(...buildSectionContent(section, data));
  }

  const doc = new Document({
    sections: [{
      properties: {},
      headers: { default: buildHeader(config) },
      footers: { default: buildFooter(config) },
      children: allParagraphs.filter(Boolean),
    }],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `${template.name.replace(/\s+/g, '_')}_${data.studentName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.docx`;
  saveAs(blob, fileName);
}

// Generic report export for the broken export components
export async function generateGenericDocxReport(options: {
  title: string;
  subtitle?: string;
  sections: Array<{ heading: string; content: string }>;
  fileName: string;
  brandingName?: string;
  footerText?: string;
}): Promise<void> {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(new Paragraph({
    text: options.title,
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  if (options.subtitle) {
    paragraphs.push(new Paragraph({
      text: options.subtitle,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }));
  }

  paragraphs.push(new Paragraph({
    text: `Generated: ${format(new Date(), 'MMMM dd, yyyy')}`,
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }));

  for (const section of options.sections) {
    paragraphs.push(new Paragraph({
      text: section.heading,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
    }));

    // Split content by newlines for proper formatting
    const lines = section.content.split('\n').filter(l => l.trim());
    for (const line of lines) {
      paragraphs.push(new Paragraph({
        text: line,
        spacing: { after: 80 },
      }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      headers: options.brandingName ? {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({ text: options.brandingName, bold: true, size: 20 })],
            alignment: AlignmentType.CENTER,
          })],
        }),
      } : undefined,
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [new TextRun({ text: options.footerText || 'Confidential', size: 16, color: '999999' })],
            alignment: AlignmentType.CENTER,
          })],
        }),
      },
      children: paragraphs,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, options.fileName);
}
