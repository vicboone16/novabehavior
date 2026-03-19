import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Package, Brain, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSdcIntake, type FormInstance, type ReportDraft } from '@/hooks/useSdcIntake';
import jsPDF from 'jspdf';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  LevelFormat, AlignmentType, PageBreak,
} from 'docx';
import { saveAs } from 'file-saver';

interface Props {
  packageInstanceId: string;
  formInstances: FormInstance[];
  reportDrafts: ReportDraft[];
  studentName: string;
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

  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: pageBreak,
    children: [new TextRun({ text: 'SDC Behavior Snapshot', bold: true, font: 'Arial' })],
  }));
  children.push(new Paragraph({ children: [new TextRun({ text: `Student: ${studentName}`, size: 22, font: 'Arial' })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: `Generated: ${new Date(createdAt).toLocaleDateString()}`, size: 20, color: '666666', font: 'Arial' })] }));
  children.push(new Paragraph({ children: [] }));

  const sections = [
    { key: 'strengths_interests', label: 'Strengths & Interests' },
    { key: 'areas_of_need', label: 'Areas of Need' },
    { key: 'strategies', label: 'Strategies & Recommendations' },
  ];

  for (const section of sections) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 80 },
      children: [new TextRun({ text: section.label.toUpperCase(), bold: true, font: 'Arial', color: '324F8C' })],
    }));
    const text = content[section.key] || 'Not generated yet.';
    for (const para of text.split('\n')) {
      if (para.trim()) {
        children.push(new Paragraph({
          children: [new TextRun({ text: para, size: 22, font: 'Arial' })],
          spacing: { after: 100 },
        }));
      }
    }
  }
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

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SDC Behavior Snapshot', 14, y); y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Student: ${studentName}`, 14, y); y += 5;
  doc.text(`Generated: ${new Date(createdAt).toLocaleDateString()}`, 14, y); y += 10;
  doc.setTextColor(0, 0, 0);

  const sections = [
    { key: 'strengths_interests', label: 'STRENGTHS & INTERESTS' },
    { key: 'areas_of_need', label: 'AREAS OF NEED' },
    { key: 'strategies', label: 'STRATEGIES & RECOMMENDATIONS' },
  ];

  for (const section of sections) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 80, 140);
    doc.text(section.label, 14, y); y += 2;
    doc.setDrawColor(200, 210, 230);
    doc.line(14, y, pageW - 14, y); y += 5;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const text = content[section.key] || 'Not generated yet.';
    const lines = doc.splitTextToSize(text, pageW - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 8;
  }
}

// ─── Component ─────────────────────────────────────────────────────────

export function SdcExportActions({ packageInstanceId, formInstances, reportDrafts, studentName }: Props) {
  const intake = useSdcIntake();
  const [exporting, setExporting] = useState<string | null>(null);

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
      // Write directly on first page (no addPage for first)
      const pageW = doc.internal.pageSize.getWidth();
      let y = 20;
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('SDC Behavior Snapshot', 14, y); y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Student: ${studentName}`, 14, y); y += 5;
      doc.text(`Generated: ${new Date(latestDraft.created_at).toLocaleDateString()}`, 14, y); y += 10;
      doc.setTextColor(0, 0, 0);

      for (const section of [
        { key: 'strengths_interests', label: 'STRENGTHS & INTERESTS' },
        { key: 'areas_of_need', label: 'AREAS OF NEED' },
        { key: 'strategies', label: 'STRATEGIES & RECOMMENDATIONS' },
      ]) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 80, 140);
        doc.text(section.label, 14, y); y += 2;
        doc.setDrawColor(200, 210, 230);
        doc.line(14, y, pageW - 14, y); y += 5;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const text = content[section.key] || 'Not generated yet.';
        const lines = doc.splitTextToSize(text, pageW - 28);
        doc.text(lines, 14, y);
        y += lines.length * 4.5 + 8;
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
      toast.success('Full packet PDF exported');
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
      toast.success('Full packet Word exported');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally { setExporting(null); }
  };

  const isExporting = exporting !== null;
  const ExBtn = ({ id, label, onClick, disabled }: { id: string; label: string; onClick: () => void; disabled?: boolean }) => (
    <Button size="sm" variant="outline" onClick={onClick} disabled={isExporting || disabled}>
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
