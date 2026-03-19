import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Package, Brain, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSdcIntake, type FormInstance, type ReportDraft } from '@/hooks/useSdcIntake';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

interface Props {
  packageInstanceId: string;
  formInstances: FormInstance[];
  reportDrafts: ReportDraft[];
  studentName: string;
}

export function SdcExportActions({ packageInstanceId, formInstances, reportDrafts, studentName }: Props) {
  const intake = useSdcIntake();
  const [exporting, setExporting] = useState<string | null>(null);

  const completedForms = formInstances.filter(fi => fi.status === 'submitted');
  const latestDraft = reportDrafts.length > 0 ? reportDrafts[0] : null;

  const getFormResponseData = async (formInstanceId: string) => {
    const resp = await intake.fetchFormResponse(formInstanceId);
    return resp?.response_json || {};
  };

  const formatLabel = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const formatValue = (val: any): string => {
    if (Array.isArray(val)) return val.map(v => formatLabel(String(v))).join(', ');
    if (val === null || val === undefined) return '';
    return String(val);
  };

  // ---- PDF Export ----
  const exportFormPdf = async (fi: FormInstance) => {
    setExporting(`form-pdf-${fi.id}`);
    try {
      const responseData = await getFormResponseData(fi.id);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(16);
      doc.text(fi.form_definition?.name || 'Form', 14, y);
      y += 8;
      doc.setFontSize(10);
      doc.text(`Student: ${studentName}`, 14, y);
      y += 5;
      if (fi.respondent_name) {
        doc.text(`Respondent: ${fi.respondent_name} (${fi.respondent_role || 'N/A'})`, 14, y);
        y += 5;
      }
      if (fi.submitted_at) {
        doc.text(`Submitted: ${new Date(fi.submitted_at).toLocaleDateString()}`, 14, y);
        y += 5;
      }
      y += 5;

      // Print responses
      doc.setFontSize(10);
      for (const [key, val] of Object.entries(responseData)) {
        const fv = formatValue(val);
        if (!fv) continue;
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        const label = formatLabel(key);
        doc.text(label, 14, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(fv, pageWidth - 28);
        doc.text(lines, 14, y);
        y += lines.length * 5 + 3;
      }

      const fileName = `${studentName.replace(/\s+/g, '_')}_${fi.form_definition?.slug || 'form'}.pdf`;
      doc.save(fileName);
      await intake.logFormExport({
        formInstanceId: fi.id,
        exportScope: 'individual',
        exportFormat: 'pdf',
        fileName,
      });
      toast.success('PDF exported');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  const exportFormDocx = async (fi: FormInstance) => {
    setExporting(`form-docx-${fi.id}`);
    try {
      const responseData = await getFormResponseData(fi.id);
      const children: any[] = [];

      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: fi.form_definition?.name || 'Form', bold: true })],
      }));
      children.push(new Paragraph({ children: [new TextRun({ text: `Student: ${studentName}`, size: 22 })] }));
      if (fi.respondent_name) {
        children.push(new Paragraph({ children: [new TextRun({ text: `Respondent: ${fi.respondent_name} (${fi.respondent_role || 'N/A'})`, size: 22 })] }));
      }
      if (fi.submitted_at) {
        children.push(new Paragraph({ children: [new TextRun({ text: `Submitted: ${new Date(fi.submitted_at).toLocaleDateString()}`, size: 22 })] }));
      }
      children.push(new Paragraph({ children: [] }));

      for (const [key, val] of Object.entries(responseData)) {
        const fv = formatValue(val);
        if (!fv) continue;
        children.push(new Paragraph({
          children: [new TextRun({ text: formatLabel(key), bold: true, size: 22 })],
        }));
        children.push(new Paragraph({
          children: [new TextRun({ text: fv, size: 22 })],
          spacing: { after: 120 },
        }));
      }

      const doc = new Document({
        sections: [{ properties: { page: { size: { width: 12240, height: 15840 } } }, children }],
      });
      const buf = await Packer.toBlob(doc);
      const fileName = `${studentName.replace(/\s+/g, '_')}_${fi.form_definition?.slug || 'form'}.docx`;
      saveAs(buf, fileName);
      await intake.logFormExport({
        formInstanceId: fi.id,
        exportScope: 'individual',
        exportFormat: 'docx',
        fileName,
      });
      toast.success('Word document exported');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  // ---- Bundle exports ----
  const exportBundlePdf = async () => {
    setExporting('bundle-pdf');
    try {
      const doc = new jsPDF();
      let firstPage = true;

      for (const fi of completedForms) {
        if (!firstPage) doc.addPage();
        firstPage = false;
        const responseData = await getFormResponseData(fi.id);
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 20;

        doc.setFontSize(14);
        doc.text(fi.form_definition?.name || 'Form', 14, y);
        y += 8;
        doc.setFontSize(10);
        doc.text(`Student: ${studentName}`, 14, y);
        y += 10;

        for (const [key, val] of Object.entries(responseData)) {
          const fv = formatValue(val);
          if (!fv) continue;
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFont('helvetica', 'bold');
          doc.text(formatLabel(key), 14, y);
          y += 5;
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(fv, pageWidth - 28);
          doc.text(lines, 14, y);
          y += lines.length * 5 + 3;
        }
      }

      const fileName = `${studentName.replace(/\s+/g, '_')}_SDC_Forms_Bundle.pdf`;
      doc.save(fileName);
      await intake.logFormExport({
        packageInstanceId,
        exportScope: 'package_bundle',
        exportFormat: 'pdf',
        fileName,
      });
      toast.success('Forms bundle PDF exported');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  // ---- Snapshot export ----
  const getSnapshotContent = () => {
    if (!latestDraft) return null;
    const content = (latestDraft.edited_json || latestDraft.generated_json) as Record<string, string> | null;
    return content;
  };

  const exportSnapshotPdf = async () => {
    if (!latestDraft) return;
    setExporting('snapshot-pdf');
    try {
      const content = getSnapshotContent();
      if (!content) throw new Error('No snapshot content');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(18);
      doc.text('SDC Behavior Snapshot', 14, y);
      y += 8;
      doc.setFontSize(11);
      doc.text(`Student: ${studentName}`, 14, y);
      y += 5;
      doc.text(`Generated: ${new Date(latestDraft.created_at).toLocaleDateString()}`, 14, y);
      y += 12;

      const sections = [
        { key: 'strengths_interests', label: 'STRENGTHS & INTERESTS' },
        { key: 'areas_of_need', label: 'AREAS OF NEED' },
        { key: 'strategies', label: 'STRATEGIES & RECOMMENDATIONS' },
      ];

      for (const section of sections) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(section.label, 14, y);
        y += 7;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const text = content[section.key] || 'Not generated yet.';
        const lines = doc.splitTextToSize(text, pageWidth - 28);
        doc.text(lines, 14, y);
        y += lines.length * 5 + 8;
      }

      const fileName = `${studentName.replace(/\s+/g, '_')}_SDC_Snapshot.pdf`;
      doc.save(fileName);
      await intake.logReportExport({
        reportDraftId: latestDraft.id,
        exportFormat: 'pdf',
        fileName,
      });
      toast.success('Snapshot PDF exported');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  const exportSnapshotDocx = async () => {
    if (!latestDraft) return;
    setExporting('snapshot-docx');
    try {
      const content = getSnapshotContent();
      if (!content) throw new Error('No snapshot content');

      const children: any[] = [];
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: 'SDC BEHAVIOR SNAPSHOT', bold: true })],
      }));
      children.push(new Paragraph({ children: [new TextRun({ text: `Student: ${studentName}`, size: 24 })] }));
      children.push(new Paragraph({ children: [new TextRun({ text: `Generated: ${new Date(latestDraft.created_at).toLocaleDateString()}`, size: 22, color: '666666' })] }));
      children.push(new Paragraph({ children: [] }));

      const sections = [
        { key: 'strengths_interests', label: 'STRENGTHS & INTERESTS' },
        { key: 'areas_of_need', label: 'AREAS OF NEED' },
        { key: 'strategies', label: 'STRATEGIES & RECOMMENDATIONS' },
      ];

      for (const section of sections) {
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: section.label, bold: true })],
          spacing: { before: 240 },
        }));
        const text = content[section.key] || 'Not generated yet.';
        // Split by paragraph
        text.split('\n').forEach((para: string) => {
          if (para.trim()) {
            children.push(new Paragraph({
              children: [new TextRun({ text: para, size: 22 })],
              spacing: { after: 120 },
            }));
          }
        });
      }

      const doc = new Document({
        sections: [{ properties: { page: { size: { width: 12240, height: 15840 } } }, children }],
      });
      const buf = await Packer.toBlob(doc);
      const fileName = `${studentName.replace(/\s+/g, '_')}_SDC_Snapshot.docx`;
      saveAs(buf, fileName);
      await intake.logReportExport({
        reportDraftId: latestDraft.id,
        exportFormat: 'docx',
        fileName,
      });
      toast.success('Snapshot Word exported');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  // ---- Full packet ----
  const exportFullPacketPdf = async () => {
    setExporting('full-pdf');
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Cover page
      doc.setFontSize(22);
      doc.text('SDC Behavior Intake Package', 14, 40);
      doc.setFontSize(14);
      doc.text(`Student: ${studentName}`, 14, 55);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 65);
      doc.setFontSize(10);
      doc.text(`Completed Forms: ${completedForms.length}`, 14, 80);
      doc.text(`Snapshot: ${latestDraft ? 'Generated' : 'Not generated'}`, 14, 88);

      // Forms
      for (const fi of completedForms) {
        doc.addPage();
        const responseData = await getFormResponseData(fi.id);
        let y = 20;
        doc.setFontSize(14);
        doc.text(fi.form_definition?.name || 'Form', 14, y);
        y += 10;
        doc.setFontSize(10);

        for (const [key, val] of Object.entries(responseData)) {
          const fv = formatValue(val);
          if (!fv) continue;
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFont('helvetica', 'bold');
          doc.text(formatLabel(key), 14, y);
          y += 5;
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(fv, pageWidth - 28);
          doc.text(lines, 14, y);
          y += lines.length * 5 + 3;
        }
      }

      // Snapshot
      if (latestDraft) {
        const content = getSnapshotContent();
        if (content) {
          doc.addPage();
          let y = 20;
          doc.setFontSize(16);
          doc.text('SDC BEHAVIOR SNAPSHOT', 14, y);
          y += 12;

          for (const section of [
            { key: 'strengths_interests', label: 'STRENGTHS & INTERESTS' },
            { key: 'areas_of_need', label: 'AREAS OF NEED' },
            { key: 'strategies', label: 'STRATEGIES & RECOMMENDATIONS' },
          ]) {
            if (y > 250) { doc.addPage(); y = 20; }
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(section.label, 14, y);
            y += 7;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const text = content[section.key] || '';
            const lines = doc.splitTextToSize(text, pageWidth - 28);
            doc.text(lines, 14, y);
            y += lines.length * 5 + 8;
          }
        }
      }

      const fileName = `${studentName.replace(/\s+/g, '_')}_SDC_Full_Packet.pdf`;
      doc.save(fileName);
      await intake.logFormExport({
        packageInstanceId,
        exportScope: 'full_packet',
        exportFormat: 'pdf',
        fileName,
      });
      toast.success('Full packet PDF exported');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  const exportFullPacketDocx = async () => {
    setExporting('full-docx');
    try {
      const children: any[] = [];

      // Cover
      children.push(new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun({ text: 'SDC Behavior Intake Package', bold: true })],
      }));
      children.push(new Paragraph({ children: [new TextRun({ text: `Student: ${studentName}`, size: 28 })] }));
      children.push(new Paragraph({ children: [new TextRun({ text: `Date: ${new Date().toLocaleDateString()}`, size: 24, color: '666666' })] }));
      children.push(new Paragraph({ children: [] }));

      // Forms
      for (const fi of completedForms) {
        const responseData = await getFormResponseData(fi.id);
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: fi.form_definition?.name || 'Form', bold: true })],
          pageBreakBefore: true,
        }));

        for (const [key, val] of Object.entries(responseData)) {
          const fv = formatValue(val);
          if (!fv) continue;
          children.push(new Paragraph({
            children: [new TextRun({ text: formatLabel(key), bold: true, size: 22 })],
          }));
          children.push(new Paragraph({
            children: [new TextRun({ text: fv, size: 22 })],
            spacing: { after: 120 },
          }));
        }
      }

      // Snapshot
      if (latestDraft) {
        const content = getSnapshotContent();
        if (content) {
          children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: 'SDC BEHAVIOR SNAPSHOT', bold: true })],
            pageBreakBefore: true,
          }));

          for (const section of [
            { key: 'strengths_interests', label: 'STRENGTHS & INTERESTS' },
            { key: 'areas_of_need', label: 'AREAS OF NEED' },
            { key: 'strategies', label: 'STRATEGIES & RECOMMENDATIONS' },
          ]) {
            children.push(new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun({ text: section.label, bold: true })],
              spacing: { before: 240 },
            }));
            const text = content[section.key] || '';
            text.split('\n').forEach((para: string) => {
              if (para.trim()) {
                children.push(new Paragraph({
                  children: [new TextRun({ text: para, size: 22 })],
                  spacing: { after: 120 },
                }));
              }
            });
          }
        }
      }

      const doc = new Document({
        sections: [{ properties: { page: { size: { width: 12240, height: 15840 } } }, children }],
      });
      const buf = await Packer.toBlob(doc);
      const fileName = `${studentName.replace(/\s+/g, '_')}_SDC_Full_Packet.docx`;
      saveAs(buf, fileName);
      await intake.logFormExport({
        packageInstanceId,
        exportScope: 'full_packet',
        exportFormat: 'docx',
        fileName,
      });
      toast.success('Full packet Word exported');
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  const isExporting = exporting !== null;

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
                  <Button size="sm" variant="outline" onClick={() => exportFormPdf(fi)} disabled={isExporting}>
                    {exporting === `form-pdf-${fi.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
                    PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportFormDocx(fi)} disabled={isExporting}>
                    {exporting === `form-docx-${fi.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
                    Word
                  </Button>
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
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportBundlePdf} disabled={isExporting || completedForms.length === 0}>
              {exporting === 'bundle-pdf' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
              Forms Bundle PDF
            </Button>
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
        <CardContent className="space-y-2">
          {!latestDraft ? (
            <p className="text-xs text-muted-foreground">Generate an SDC Snapshot first.</p>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportSnapshotPdf} disabled={isExporting}>
                {exporting === 'snapshot-pdf' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
                Snapshot PDF
              </Button>
              <Button variant="outline" onClick={exportSnapshotDocx} disabled={isExporting}>
                {exporting === 'snapshot-docx' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
                Snapshot Word
              </Button>
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
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground mb-2">
            Export all completed forms plus the SDC Snapshot in one document.
          </p>
          <div className="flex gap-2">
            <Button onClick={exportFullPacketPdf} disabled={isExporting || completedForms.length === 0}>
              {exporting === 'full-pdf' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
              Full Packet PDF
            </Button>
            <Button onClick={exportFullPacketDocx} disabled={isExporting || completedForms.length === 0}>
              {exporting === 'full-docx' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
              Full Packet Word
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
