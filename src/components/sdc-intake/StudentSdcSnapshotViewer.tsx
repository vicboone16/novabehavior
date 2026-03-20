import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText, Download, Save, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } from 'docx';
import { saveAs } from 'file-saver';

interface Props {
  studentId: string;
  studentName: string;
}

const SNAPSHOT_SECTIONS = [
  { key: 'strengths_interests', label: 'Strengths & Interests' },
  { key: 'areas_of_need', label: 'Areas of Need' },
  { key: 'strategies', label: 'Strategies & Recommendations' },
];

interface SnapshotDraft {
  id: string;
  generated_json: Record<string, string> | null;
  edited_json: Record<string, string> | null;
  updated_at: string;
  title: string;
}

export function StudentSdcSnapshotViewer({ studentId, studentName }: Props) {
  const [drafts, setDrafts] = useState<SnapshotDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDraft, setActiveDraft] = useState<SnapshotDraft | null>(null);
  const [editedSections, setEditedSections] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    loadDrafts();
  }, [studentId]);

  const loadDrafts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('report_drafts')
        .select('id, generated_json, edited_json, updated_at, title')
        .eq('student_id', studentId)
        .eq('report_slug', 'sdc_snapshot')
        .in('generation_status', ['completed', 'edited'])
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map(d => ({
        ...d,
        generated_json: d.generated_json as Record<string, string> | null,
        edited_json: d.edited_json as Record<string, string> | null,
      }));
      setDrafts(mapped);
      if (mapped.length > 0 && !activeDraft) {
        setActiveDraft(mapped[0]);
        setEditedSections(mapped[0].edited_json || mapped[0].generated_json || {});
      }
    } catch (err: any) {
      console.error('Failed to load SDC snapshots:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSectionContent = (key: string): string => {
    if (editedSections[key] !== undefined) return editedSections[key];
    if (activeDraft?.edited_json?.[key]) return activeDraft.edited_json[key];
    if (activeDraft?.generated_json?.[key]) return activeDraft.generated_json[key];
    return '';
  };

  const handleEdit = (key: string, value: string) => {
    setEditedSections(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!activeDraft) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('report_drafts')
        .update({ edited_json: editedSections, generation_status: 'edited' })
        .eq('id', activeDraft.id);
      if (error) throw error;
      toast.success('SDC Snapshot saved');
    } catch (err: any) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const exportPdf = async () => {
    if (!activeDraft) return;
    setExporting('pdf');
    try {
      const doc = new jsPDF({ unit: 'in', format: 'letter' });
      const margin = 1;
      const pageW = 8.5 - 2 * margin;
      let y = margin;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('SDC BEHAVIOR SNAPSHOT', margin, y);
      y += 0.3;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Student: ${studentName}`, margin, y);
      y += 0.2;
      doc.text(`Date: ${new Date(activeDraft.updated_at).toLocaleDateString()}`, margin, y);
      y += 0.4;

      for (const section of SNAPSHOT_SECTIONS) {
        const content = getSectionContent(section.key);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(section.label.toUpperCase(), margin, y);
        y += 0.25;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(content || '(No content)', pageW);
        for (const line of lines) {
          if (y > 10) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += 0.18;
        }
        y += 0.25;
      }

      doc.save(`SDC_Snapshot_${studentName.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF exported');
    } catch (err: any) {
      toast.error('PDF export failed');
    } finally {
      setExporting(null);
    }
  };

  const exportDocx = async () => {
    if (!activeDraft) return;
    setExporting('docx');
    try {
      const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
      const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

      const rows: TableRow[] = [];
      // Header row
      rows.push(new TableRow({
        children: [
          new TableCell({
            width: { size: 2400, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: 'D5E8F0', type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Section', bold: true, font: 'Arial', size: 20 })] })],
          }),
          new TableCell({
            width: { size: 6960, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: 'D5E8F0', type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [new TextRun({ text: 'Content', bold: true, font: 'Arial', size: 20 })] })],
          }),
        ],
      }));

      for (const section of SNAPSHOT_SECTIONS) {
        const content = getSectionContent(section.key) || '(No content)';
        rows.push(new TableRow({
          children: [
            new TableCell({
              width: { size: 2400, type: WidthType.DXA },
              borders: cellBorders,
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun({ text: section.label, bold: true, font: 'Arial', size: 20 })] })],
            }),
            new TableCell({
              width: { size: 6960, type: WidthType.DXA },
              borders: cellBorders,
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: content.split('\n').map(line =>
                new Paragraph({ children: [new TextRun({ text: line, font: 'Arial', size: 20 })] })
              ),
            }),
          ],
        }));
      }

      const wordDoc = new Document({
        sections: [{
          properties: {
            page: {
              size: { width: 12240, height: 15840 },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children: [
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun({ text: 'SDC BEHAVIOR SNAPSHOT', bold: true, font: 'Arial', size: 28 })],
            }),
            new Paragraph({
              children: [new TextRun({ text: `Student: ${studentName}`, font: 'Arial', size: 22 })],
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [new TextRun({ text: `Date: ${new Date(activeDraft.updated_at).toLocaleDateString()}`, font: 'Arial', size: 22 })],
            }),
            new Table({
              width: { size: 9360, type: WidthType.DXA },
              columnWidths: [2400, 6960],
              rows,
            }),
          ],
        }],
      });

      const buffer = await Packer.toBuffer(wordDoc);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      saveAs(blob, `SDC_Snapshot_${studentName.replace(/\s+/g, '_')}.docx`);
      toast.success('Word document exported');
    } catch (err: any) {
      toast.error('DOCX export failed');
    } finally {
      setExporting(null);
    }
  };

  // Don't render if no SDC snapshots exist
  if (loading) return null;
  if (drafts.length === 0) return null;

  const hasEdits = Object.keys(editedSections).length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              SDC Behavior Snapshot
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Generated from SDC intake forms • {new Date(activeDraft?.updated_at || '').toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {drafts.length > 1 && (
              <Badge variant="secondary" className="text-xs">{drafts.length} versions</Badge>
            )}
            <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving || !hasEdits}>
              <Save className="w-3.5 h-3.5 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf} disabled={!!exporting}>
              {exporting === 'pdf' ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportDocx} disabled={!!exporting}>
              {exporting === 'docx' ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}
              DOCX
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={SNAPSHOT_SECTIONS.map(s => s.key)} className="space-y-2">
          {SNAPSHOT_SECTIONS.map(section => {
            const content = getSectionContent(section.key);
            const isEmpty = !content || content.trim() === '';

            return (
              <AccordionItem key={section.key} value={section.key} className="border rounded-lg px-3">
                <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    {section.label}
                    {isEmpty && <Badge variant="outline" className="text-xs text-muted-foreground">Empty</Badge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Textarea
                    value={content}
                    onChange={e => handleEdit(section.key, e.target.value)}
                    placeholder={`Enter ${section.label.toLowerCase()}...`}
                    rows={5}
                    className="text-sm leading-relaxed"
                  />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
