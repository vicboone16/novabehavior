import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Package, Brain, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSdcIntake, type FormInstance, type ReportDraft } from '@/hooks/useSdcIntake';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  LevelFormat, AlignmentType, PageBreak,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';

interface Props {
  packageInstanceId: string;
  formInstances: FormInstance[];
  reportDrafts: ReportDraft[];
  studentName: string;
  studentId: string;
}

// ─── helpers ───────────────────────────────────────────────────────────

/** Walk schema sections/fields in order, yield { sectionLabel, fieldLabel, displayValue } */
function* walkSchemaResponses(
  fi: FormInstance,
  responseData: Record<string, any>,
): Generator<{ type: 'section'; label: string } | { type: 'field'; label: string; value: string }> {
  const sections: any[] = fi.form_definition?.schema_json?.sections || [];
  for (const section of sections) {
    yield { type: 'section', label: section.label };
    for (const field of section.fields || []) {
      // skip conditional fields that shouldn't show
      if (field.show_if) {
        const { field: dep, equals } = field.show_if;
        if (responseData[dep] !== equals) continue;
      }
      const raw = responseData[field.key];
      if (raw === undefined || raw === null || raw === '') continue;
      if (Array.isArray(raw) && raw.length === 0) continue;

      const display = resolveDisplayValue(raw, field);
      if (!display) continue;
      yield { type: 'field', label: field.label || formatLabel(field.key), value: display };
    }
  }
}

function resolveDisplayValue(val: any, field: any): string {
  if (val === null || val === undefined || val === '') return '';
  if (!field?.options) {
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  }
  if (Array.isArray(val)) {
    return val
      .map(v => {
        const opt = field.options.find((o: any) => String(o.value) === String(v));
        return opt ? opt.label : String(v);
      })
      .join(', ');
  }
  const opt = field.options.find((o: any) => String(o.value) === String(val));
  return opt ? opt.label : String(val);
}

function formatLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function metadataLines(fi: FormInstance, studentName: string): string[] {
  const lines: string[] = [];
  lines.push(`Student: ${studentName}`);
  if (fi.respondent_name) lines.push(`Respondent: ${fi.respondent_name}${fi.respondent_role ? ` (${fi.respondent_role})` : ''}`);
  if (fi.submitted_at) lines.push(`Submitted: ${new Date(fi.submitted_at).toLocaleDateString()}`);
  lines.push(`Status: ${fi.status}`);
  return lines;
}

// ─── PDF builder helpers ───────────────────────────────────────────────

function addFormToPdf(
  doc: jsPDF,
  fi: FormInstance,
  responseData: Record<string, any>,
  studentName: string,
  startY: number,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  let y = startY;

  const ensureSpace = (need: number) => {
    if (y + need > 275) { doc.addPage(); y = 20; }
  };

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(fi.form_definition?.name || 'Form', 14, y);
  y += 7;

  // Metadata
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  for (const line of metadataLines(fi, studentName)) {
    doc.text(line, 14, y); y += 4.5;
  }
  doc.setTextColor(0, 0, 0);
  y += 4;

  // Walk schema
  for (const item of walkSchemaResponses(fi, responseData)) {
    if (item.type === 'section') {
      ensureSpace(12);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 80, 140);
      doc.text(item.label, 14, y);
      doc.setTextColor(0, 0, 0);
      y += 2;
      doc.setDrawColor(200, 210, 230);
      doc.line(14, y, pageW - 14, y);
      y += 5;
    } else {
      ensureSpace(10);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(item.label, 14, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(item.value, pageW - 28);
      doc.text(lines, 18, y);
      y += lines.length * 4 + 3;
    }
  }
  return y;
}

// ─── DOCX builder helpers ──────────────────────────────────────────────

const BULLETS_REF = 'sdcBullets';

function buildDocxNumbering() {
  return {
    config: [
      {
        reference: BULLETS_REF,
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  };
}

function formToDocxChildren(
  fi: FormInstance,
  responseData: Record<string, any>,
  studentName: string,
  pageBreak: boolean,
): any[] {
  const children: any[] = [];

  // Title
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: pageBreak,
    children: [new TextRun({ text: fi.form_definition?.name || 'Form', bold: true, font: 'Arial' })],
  }));

  // Metadata
  for (const line of metadataLines(fi, studentName)) {
    children.push(new Paragraph({
      children: [new TextRun({ text: line, size: 20, color: '666666', font: 'Arial' })],
    }));
  }
  children.push(new Paragraph({ children: [] }));

  // Walk schema
  for (const item of walkSchemaResponses(fi, responseData)) {
    if (item.type === 'section') {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: item.label, bold: true, font: 'Arial', color: '324F8C' })],
      }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: item.label, bold: true, size: 21, font: 'Arial' })],
      }));
      // Split multiselect comma lists into bullets if they contain commas
      if (item.value.includes(', ') && item.value.length > 50) {
        for (const bullet of item.value.split(', ')) {
          children.push(new Paragraph({
            numbering: { reference: BULLETS_REF, level: 0 },
            children: [new TextRun({ text: bullet, size: 21, font: 'Arial' })],
          }));
        }
      } else {
        for (const para of item.value.split('\n')) {
          if (para.trim()) {
            children.push(new Paragraph({
              children: [new TextRun({ text: para, size: 21, font: 'Arial' })],
              spacing: { after: 60 },
            }));
          }
        }
      }
      children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
    }
  }
  return children;
}

function snapshotDocxChildren(
  content: Record<string, string>,
  studentName: string,
  createdAt: string,
  pageBreak: boolean,
): any[] {
  const children: any[] = [];
  const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
  const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
  const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

  // Title
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    pageBreakBefore: pageBreak,
    spacing: { after: 200 },
    children: [new TextRun({ text: 'SDC Snapshots', bold: true, underline: {}, size: 28, font: 'Arial' })],
  }));

  const sections = [
    { key: 'strengths_interests', label: 'Strengths/Interests' },
    { key: 'areas_of_need', label: 'Areas of Need' },
    { key: 'strategies', label: 'Strategies' },
  ];

  // Build table rows
  const tableRows: TableRow[] = [];

  // Header row with student name
  tableRows.push(new TableRow({
    children: [
      new TableCell({
        columnSpan: 2,
        borders: cellBorders,
        margins: cellMargins,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: studentName, bold: true, size: 24, font: 'Arial' })],
        })],
      }),
    ],
  }));

  for (const section of sections) {
    const text = content[section.key] || 'Not generated yet.';
    const bulletItems = text.split('\n').filter(l => l.trim());
    const contentChildren: Paragraph[] = [];

    // If areas_of_need, first line is bold summary
    if (section.key === 'areas_of_need' && bulletItems.length > 0) {
      const firstLine = bulletItems[0].replace(/^[-•]\s*/, '').trim();
      if (firstLine) {
        contentChildren.push(new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: firstLine, bold: true, size: 22, font: 'Arial' })],
        }));
      }
      for (let i = 1; i < bulletItems.length; i++) {
        const line = bulletItems[i].replace(/^[-•]\s*/, '').trim();
        if (line) {
          contentChildren.push(new Paragraph({
            numbering: { reference: BULLETS_REF, level: 0 },
            children: [new TextRun({ text: line, size: 22, font: 'Arial' })],
          }));
        }
      }
    } else {
      for (const item of bulletItems) {
        const line = item.replace(/^[-•]\s*/, '').trim();
        if (line) {
          contentChildren.push(new Paragraph({
            numbering: { reference: BULLETS_REF, level: 0 },
            children: [new TextRun({ text: line, size: 22, font: 'Arial' })],
          }));
        }
      }
    }

    if (contentChildren.length === 0) {
      contentChildren.push(new Paragraph({ children: [new TextRun({ text: 'Not generated yet.', size: 22, font: 'Arial', italics: true })] }));
    }

    tableRows.push(new TableRow({
      children: [
        new TableCell({
          borders: cellBorders,
          margins: cellMargins,
          width: { size: 2800, type: WidthType.DXA },
          children: [new Paragraph({
            children: [new TextRun({ text: section.label, size: 22, font: 'Arial' })],
          })],
        }),
        new TableCell({
          borders: cellBorders,
          margins: cellMargins,
          width: { size: 6560, type: WidthType.DXA },
          children: contentChildren,
        }),
      ],
    }));
  }

  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2800, 6560],
    rows: tableRows,
  }));

  return children;
}

function addSnapshotToPdf(
  doc: jsPDF,
  content: Record<string, string>,
  studentName: string,
  createdAt: string,
): void {
  doc.addPage();
  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title centered and underlined
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const title = 'SDC Snapshots';
  const titleW = doc.getStringUnitWidth(title) * 14 / doc.internal.scaleFactor;
  const titleX = (pageW - titleW) / 2;
  doc.text(title, titleX, y);
  doc.setDrawColor(0, 0, 0);
  doc.line(titleX, y + 1, titleX + titleW, y + 1);
  y += 12;

  // Table layout matching reference
  const leftCol = 14;
  const divider = 65;
  const rightCol = divider + 2;
  const rightEdge = pageW - 14;
  const rightW = rightEdge - rightCol;

  const sections = [
    { key: 'strengths_interests', label: 'Strengths/Interests' },
    { key: 'areas_of_need', label: 'Areas of Need' },
    { key: 'strategies', label: 'Strategies' },
  ];

  // Student name header row
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(leftCol, y, rightEdge - leftCol, 8);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const nameText = studentName;
  const nameW = doc.getStringUnitWidth(nameText) * 11 / doc.internal.scaleFactor;
  doc.text(nameText, (pageW - nameW) / 2, y + 5.5);
  y += 8;

  for (const section of sections) {
    const text = content[section.key] || 'Not generated yet.';
    const bulletItems = text.split('\n').filter(l => l.trim()).map(l => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean);

    // Calculate row height
    let contentLines: string[] = [];
    for (const item of bulletItems) {
      const wrapped = doc.splitTextToSize(`-   ${item}`, rightW - 4);
      contentLines.push(...wrapped);
    }
    if (contentLines.length === 0) contentLines = ['Not generated yet.'];
    const rowH = Math.max(contentLines.length * 4.5 + 6, 14);

    // Check page break
    if (y + rowH > 275) { doc.addPage(); y = 20; }

    // Draw cell borders
    doc.rect(leftCol, y, divider - leftCol, rowH);
    doc.rect(divider, y, rightEdge - divider, rowH);

    // Label
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(section.label, leftCol + 2, y + 5);

    // Content bullets
    doc.setFontSize(10);
    let cy = y + 5;
    for (const item of bulletItems) {
      const wrapped = doc.splitTextToSize(`-   ${item}`, rightW - 4);
      for (const line of wrapped) {
        if (cy > 275) { doc.addPage(); cy = 20; }
        doc.text(line, rightCol + 2, cy);
        cy += 4.5;
      }
    }
    y += rowH;
  }
}

// ─── Component ─────────────────────────────────────────────────────────

export function SdcExportActions({ packageInstanceId, formInstances, reportDrafts, studentName, studentId }: Props) {
  const intake = useSdcIntake();
  const [exporting, setExporting] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const completedForms = formInstances.filter(fi => fi.status === 'submitted');
  const latestDraft = reportDrafts.length > 0 ? reportDrafts[0] : null;

  const getFormResponseData = async (formInstanceId: string) => {
    const resp = await intake.fetchFormResponse(formInstanceId);
    return (resp?.response_json || {}) as Record<string, any>;
  };

  const getSnapshotContent = (): Record<string, string> | null => {
    if (!latestDraft) return null;
    return (latestDraft.edited_json || latestDraft.generated_json) as Record<string, string> | null;
  };

  // ── Individual form PDF ──
  const exportFormPdf = async (fi: FormInstance) => {
    setExporting(`form-pdf-${fi.id}`);
    try {
      const responseData = await getFormResponseData(fi.id);
      const doc = new jsPDF();
      addFormToPdf(doc, fi, responseData, studentName, 20);
      const fileName = `${studentName.replace(/\s+/g, '_')}_${fi.form_definition?.slug || 'form'}.pdf`;
      doc.save(fileName);
      await intake.logFormExport({ formInstanceId: fi.id, exportScope: 'individual', exportFormat: 'pdf', fileName });
      toast.success('PDF export created.');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally { setExporting(null); }
  };

  // ── Individual form Word ──
  const exportFormDocx = async (fi: FormInstance) => {
    setExporting(`form-docx-${fi.id}`);
    try {
      const responseData = await getFormResponseData(fi.id);
      const children = formToDocxChildren(fi, responseData, studentName, false);
      const doc = new Document({
        numbering: buildDocxNumbering(),
        sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }],
      });
      const buf = await Packer.toBlob(doc);
      const fileName = `${studentName.replace(/\s+/g, '_')}_${fi.form_definition?.slug || 'form'}.docx`;
      saveAs(buf, fileName);
      await intake.logFormExport({ formInstanceId: fi.id, exportScope: 'individual', exportFormat: 'docx', fileName });
      toast.success('Word export created.');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally { setExporting(null); }
  };

  // ── Bundle PDF ──
  const exportBundlePdf = async () => {
    setExporting('bundle-pdf');
    try {
      const doc = new jsPDF();
      // Cover
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('SDC Behavior Intake Package', 14, 40);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Student: ${studentName}`, 14, 52);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 60);
      doc.setFontSize(10);
      doc.text(`Completed Forms: ${completedForms.length}`, 14, 74);

      for (const fi of completedForms) {
        doc.addPage();
        const responseData = await getFormResponseData(fi.id);
        addFormToPdf(doc, fi, responseData, studentName, 20);
      }

      const fileName = `${studentName.replace(/\s+/g, '_')}_SDC_Forms_Bundle.pdf`;
      doc.save(fileName);
      await intake.logFormExport({ packageInstanceId, exportScope: 'package_bundle', exportFormat: 'pdf', fileName });
      toast.success('PDF export created.');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally { setExporting(null); }
  };

  // ── Bundle Word ──
  const exportBundleDocx = async () => {
    setExporting('bundle-docx');
    try {
      const allChildren: any[] = [];

      // Cover
      allChildren.push(new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun({ text: 'SDC Behavior Intake Package', bold: true, font: 'Arial' })],
      }));
      allChildren.push(new Paragraph({ children: [new TextRun({ text: `Student: ${studentName}`, size: 26, font: 'Arial' })] }));
      allChildren.push(new Paragraph({ children: [new TextRun({ text: `Date: ${new Date().toLocaleDateString()}`, size: 22, color: '666666', font: 'Arial' })] }));
      allChildren.push(new Paragraph({ children: [new TextRun({ text: `Completed Forms: ${completedForms.length}`, size: 22, font: 'Arial' })] }));

      for (const fi of completedForms) {
        const responseData = await getFormResponseData(fi.id);
        allChildren.push(...formToDocxChildren(fi, responseData, studentName, true));
      }

      const doc = new Document({
        numbering: buildDocxNumbering(),
        sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children: allChildren }],
      });
      const buf = await Packer.toBlob(doc);
      const fileName = `${studentName.replace(/\s+/g, '_')}_SDC_Forms_Bundle.docx`;
      saveAs(buf, fileName);
      await intake.logFormExport({ packageInstanceId, exportScope: 'package_bundle', exportFormat: 'docx', fileName });
      toast.success('Word export created.');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally { setExporting(null); }
  };

  // ── Snapshot PDF ──
  const exportSnapshotPdf = async () => {
    if (!latestDraft) return;
    setExporting('snapshot-pdf');
    try {
      const content = getSnapshotContent();
      if (!content) throw new Error('No snapshot content');
      const doc = new jsPDF();
      // Use addSnapshotToPdf but on the first page — slight hack: remove the addPage call
      const pageW = doc.internal.pageSize.getWidth();
      let y = 20;

      // Title centered and underlined
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const title = 'SDC Snapshots';
      const titleW = doc.getStringUnitWidth(title) * 14 / doc.internal.scaleFactor;
      const titleX = (pageW - titleW) / 2;
      doc.text(title, titleX, y);
      doc.setDrawColor(0, 0, 0);
      doc.line(titleX, y + 1, titleX + titleW, y + 1);
      y += 12;

      const leftCol = 14;
      const divider = 65;
      const rightCol = divider + 2;
      const rightEdge = pageW - 14;
      const rightW = rightEdge - rightCol;

      const sections = [
        { key: 'strengths_interests', label: 'Strengths/Interests' },
        { key: 'areas_of_need', label: 'Areas of Need' },
        { key: 'strategies', label: 'Strategies' },
      ];

      // Student name header row
      doc.setLineWidth(0.3);
      doc.rect(leftCol, y, rightEdge - leftCol, 8);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      const nameW = doc.getStringUnitWidth(studentName) * 11 / doc.internal.scaleFactor;
      doc.text(studentName, (pageW - nameW) / 2, y + 5.5);
      y += 8;

      for (const section of sections) {
        const text = content[section.key] || 'Not generated yet.';
        const bulletItems = text.split('\n').filter(l => l.trim()).map(l => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
        let contentLines: string[] = [];
        for (const item of bulletItems) {
          const wrapped = doc.splitTextToSize(`-   ${item}`, rightW - 4);
          contentLines.push(...wrapped);
        }
        if (contentLines.length === 0) contentLines = ['Not generated yet.'];
        const rowH = Math.max(contentLines.length * 4.5 + 6, 14);

        if (y + rowH > 275) { doc.addPage(); y = 20; }

        doc.rect(leftCol, y, divider - leftCol, rowH);
        doc.rect(divider, y, rightEdge - divider, rowH);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(section.label, leftCol + 2, y + 5);

        let cy = y + 5;
        for (const item of bulletItems) {
          const wrapped = doc.splitTextToSize(`-   ${item}`, rightW - 4);
          for (const line of wrapped) {
            doc.text(line, rightCol + 2, cy);
            cy += 4.5;
          }
        }
        y += rowH;
      }

      const fileName = `${studentName.replace(/\s+/g, '_')}_SDC_Snapshot.pdf`;
      doc.save(fileName);
      await intake.logReportExport({ reportDraftId: latestDraft.id, exportFormat: 'pdf', fileName });
      toast.success('PDF export created.');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally { setExporting(null); }
  };

  // ── Snapshot Word ──
  const exportSnapshotDocx = async () => {
    if (!latestDraft) return;
    setExporting('snapshot-docx');
    try {
      const content = getSnapshotContent();
      if (!content) throw new Error('No snapshot content');
      const children = snapshotDocxChildren(content, studentName, latestDraft.created_at, false);
      const doc = new Document({
        numbering: buildDocxNumbering(),
        sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }],
      });
      const buf = await Packer.toBlob(doc);
      const fileName = `${studentName.replace(/\s+/g, '_')}_SDC_Snapshot.docx`;
      saveAs(buf, fileName);
      await intake.logReportExport({ reportDraftId: latestDraft.id, exportFormat: 'docx', fileName });
      toast.success('Word export created.');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally { setExporting(null); }
  };

  // ── Full Packet PDF ──
  const exportFullPacketPdf = async () => {
    setExporting('full-pdf');
    try {
      const doc = new jsPDF();
      // Cover page
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('SDC Behavior Intake Package', 14, 40);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(`Student: ${studentName}`, 14, 55);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 65);
      doc.setFontSize(10);
      doc.text(`Completed Forms: ${completedForms.length}`, 14, 80);
      doc.text(`Snapshot: ${latestDraft ? 'Included' : 'Not generated'}`, 14, 88);

      for (const fi of completedForms) {
        doc.addPage();
        const responseData = await getFormResponseData(fi.id);
        addFormToPdf(doc, fi, responseData, studentName, 20);
      }

      if (latestDraft) {
        const content = getSnapshotContent();
        if (content) addSnapshotToPdf(doc, content, studentName, latestDraft.created_at);
      }

      const fileName = `${studentName.replace(/\s+/g, '_')}_SDC_Full_Packet.pdf`;
      doc.save(fileName);
      await intake.logFormExport({ packageInstanceId, exportScope: 'full_packet', exportFormat: 'pdf', fileName });
      toast.success('Full intake packet export created.');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally { setExporting(null); }
  };

  // ── Full Packet Word ──
  const exportFullPacketDocx = async () => {
    setExporting('full-docx');
    try {
      const allChildren: any[] = [];

      // Cover
      allChildren.push(new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun({ text: 'SDC Behavior Intake Package', bold: true, font: 'Arial' })],
      }));
      allChildren.push(new Paragraph({ children: [new TextRun({ text: `Student: ${studentName}`, size: 28, font: 'Arial' })] }));
      allChildren.push(new Paragraph({ children: [new TextRun({ text: `Date: ${new Date().toLocaleDateString()}`, size: 24, color: '666666', font: 'Arial' })] }));
      allChildren.push(new Paragraph({ children: [] }));

      for (const fi of completedForms) {
        const responseData = await getFormResponseData(fi.id);
        allChildren.push(...formToDocxChildren(fi, responseData, studentName, true));
      }

      if (latestDraft) {
        const content = getSnapshotContent();
        if (content) allChildren.push(...snapshotDocxChildren(content, studentName, latestDraft.created_at, true));
      }

      const doc = new Document({
        numbering: buildDocxNumbering(),
        sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children: allChildren }],
      });
      const buf = await Packer.toBlob(doc);
      const fileName = `${studentName.replace(/\s+/g, '_')}_SDC_Full_Packet.docx`;
      saveAs(buf, fileName);
      await intake.logFormExport({ packageInstanceId, exportScope: 'full_packet', exportFormat: 'docx', fileName });
      toast.success('Full intake packet export created.');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally { setExporting(null); }
  };

  // ── Save to student documents ──
  const saveToDocuments = async (format: 'pdf' | 'docx') => {
    if (!latestDraft) return;
    setSaving(format);
    try {
      const content = getSnapshotContent();
      if (!content) throw new Error('No snapshot content');
      const fileName = `${studentName.replace(/\s+/g, '_')}_SDC_Snapshot.${format}`;
      let blob: Blob;

      if (format === 'pdf') {
        const doc = new jsPDF();
        // Reuse the table-format snapshot on first page
        addSnapshotToPdfFirstPage(doc, content, studentName);
        blob = doc.output('blob');
      } else {
        const children = snapshotDocxChildren(content, studentName, latestDraft.created_at, false);
        const doc = new Document({
          numbering: buildDocxNumbering(),
          sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }],
        });
        blob = await Packer.toBlob(doc);
      }

      const filePath = `documents/${studentId}/${Date.now()}_${fileName}`;
      const { error } = await supabase.storage.from('student-documents').upload(filePath, blob, {
        contentType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      if (error) throw error;
      toast.success(`Snapshot saved to student documents`);
    } catch (err: any) {
      toast.error('Save failed: ' + err.message);
    } finally { setSaving(null); }
  };

  const isExporting = exporting !== null;
  const isSaving = saving !== null;
  const ExBtn = ({ id, label, onClick, disabled }: { id: string; label: string; onClick: () => void; disabled?: boolean }) => (
    <Button size="sm" variant="outline" onClick={onClick} disabled={isExporting || isSaving || disabled}>
      {exporting === id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
      {label}
    </Button>
  );

  return (
    <div className="space-y-4">
      {/* Individual Form Exports */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Individual Form Exports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {completedForms.length === 0 ? (
            <p className="text-xs text-muted-foreground">No completed forms to export yet.</p>
          ) : (
            completedForms.map(fi => (
              <div key={fi.id} className="flex items-center justify-between p-2 rounded border">
                <span className="text-sm">{fi.form_definition?.name}</span>
                <div className="flex gap-1">
                  <ExBtn id={`form-pdf-${fi.id}`} label="PDF" onClick={() => exportFormPdf(fi)} />
                  <ExBtn id={`form-docx-${fi.id}`} label="Word" onClick={() => exportFormDocx(fi)} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Bundle Export */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            Package Bundle Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <ExBtn id="bundle-pdf" label="Forms Bundle PDF" onClick={exportBundlePdf} disabled={completedForms.length === 0} />
            <ExBtn id="bundle-docx" label="Forms Bundle Word" onClick={exportBundleDocx} disabled={completedForms.length === 0} />
          </div>
        </CardContent>
      </Card>

      {/* Snapshot Export */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4" />
            SDC Snapshot Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!latestDraft ? (
            <p className="text-xs text-muted-foreground">Generate an SDC Snapshot first.</p>
          ) : (
            <div className="flex gap-2">
              <ExBtn id="snapshot-pdf" label="Snapshot PDF" onClick={exportSnapshotPdf} />
              <ExBtn id="snapshot-docx" label="Snapshot Word" onClick={exportSnapshotDocx} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Packet Export */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Full Intake Packet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            Export all completed forms plus the SDC Snapshot in one document.
          </p>
          <div className="flex gap-2">
            <ExBtn id="full-pdf" label="Full Packet PDF" onClick={exportFullPacketPdf} disabled={completedForms.length === 0} />
            <ExBtn id="full-docx" label="Full Packet Word" onClick={exportFullPacketDocx} disabled={completedForms.length === 0} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
