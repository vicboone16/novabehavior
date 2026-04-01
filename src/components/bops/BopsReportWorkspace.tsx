import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import {
  FileText, Pencil, RefreshCw, Undo2, Plus, History, Save,
  Check, Loader2, ArrowLeft, Download, ChevronDown, ChevronUp,
  Import, StickyNote, X, Lock, Settings2, AlertTriangle,
  Star, BarChart3, Table2, FileDown, FileType, Copy,
  ListChecks, Type, Image, Clipboard, Brain, Shield,
  Activity, BookOpen, MessageSquare, Paperclip, Grid3X3, Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  useBopsReportWorkspace, useBopsReportMeta, useSaveBopsReportSection,
  useRevertBopsReportSection, useBopsReportSectionVersions,
  useImportIntoBopsSection, useRegenerateBopsSection, useRegenerateBopsFullReport,
  useChangeBopsReportSourceSession, useBopsSessionList,
} from '@/hooks/useBopsReports';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

interface Props {
  reportId: string;
  studentId: string;
  studentName: string;
  onBack: () => void;
}

const entryModeLabel: Record<string, string> = {
  full_assessment: 'Full Assessment',
  manual_scores: 'Manual Entry',
};

// ─── Import Source Configuration ───
const IMPORT_SOURCES = [
  { key: 'programs', label: 'Programs', icon: BookOpen },
  { key: 'targets', label: 'Targets', icon: ListChecks },
  { key: 'behavior', label: 'Behavior Data', icon: Activity },
  { key: 'abc', label: 'ABC / Interval', icon: Grid3X3 },
  { key: 'assessments', label: 'Assessments', icon: Brain },
  { key: 'reports', label: 'Reports / Text', icon: FileText },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'graphs', label: 'Graphs / Charts', icon: BarChart3 },
  { key: 'placement', label: 'Placement / CFI', icon: Shield },
  { key: 'genome', label: 'Classroom Genome', icon: Grid3X3 },
  { key: 'attachments', label: 'Attachments', icon: Paperclip },
] as const;

// ─── Section-specific suggested import sources ───
const SECTION_SOURCE_MAP: Record<string, string[]> = {
  behavioral_overview: ['behavior', 'abc', 'graphs', 'notes'],
  interventions: ['programs', 'targets', 'assessments'],
  placement: ['placement', 'genome'],
  classroom_analysis: ['genome', 'placement', 'graphs'],
  social_profile: ['assessments', 'behavior', 'notes'],
  executive_functioning: ['assessments', 'behavior', 'notes'],
  archetype_profile: ['assessments', 'notes'],
  skill_profile: ['assessments', 'targets', 'programs'],
  recommendations: ['programs', 'targets', 'assessments', 'notes'],
};

// ─── Insert Mode Options ───
const INSERT_MODES = [
  { key: 'append', label: 'Append to Section', icon: Plus },
  { key: 'bullet_list', label: 'Insert as Bullet List', icon: ListChecks },
  { key: 'paragraph', label: 'Insert as Paragraph', icon: Type },
  { key: 'table', label: 'Insert as Table', icon: Table2 },
  { key: 'figure', label: 'Insert as Figure with Caption', icon: Image },
  { key: 'replace', label: 'Replace Selected Text', icon: Copy },
] as const;

export function BopsReportWorkspace({ reportId, studentId, studentName, onBack }: Props) {
  const { data: sections, isLoading } = useBopsReportWorkspace(reportId);
  const { data: reportMeta } = useBopsReportMeta(reportId);
  const { data: sessionList } = useBopsSessionList(studentId);
  const saveMut = useSaveBopsReportSection();
  const revertMut = useRevertBopsReportSection();
  const importMut = useImportIntoBopsSection();
  const regenSection = useRegenerateBopsSection();
  const regenFull = useRegenerateBopsFullReport();
  const changeSession = useChangeBopsReportSourceSession();

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [revertTarget, setRevertTarget] = useState<string | null>(null);
  const [versionsSectionId, setVersionsSectionId] = useState<string | null>(null);
  const [importSectionId, setImportSectionId] = useState<string | null>(null);
  const [importSectionKey, setImportSectionKey] = useState<string | null>(null);
  const [showRegenDialog, setShowRegenDialog] = useState<{ type: 'section' | 'full'; sectionKey?: string } | null>(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [noteDrawerSectionId, setNoteDrawerSectionId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [exporting, setExporting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const sourceSession = sessionList?.find((s: any) => s.session_id === reportMeta?.source_session_id);

  // Auto-save with debounce
  const autoSave = useCallback((sectionId: string, text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus('saving');
    debounceRef.current = setTimeout(() => {
      saveMut.mutate(
        { sectionId, reportId, editedText: text, changeSummary: 'Auto-save' },
        { onSuccess: () => setSaveStatus('saved'), onError: () => setSaveStatus('idle') }
      );
    }, 1500);
  }, [saveMut, reportId]);

  const handleEditChange = (text: string) => {
    setEditText(text);
    if (editingSectionId) autoSave(editingSectionId, text);
  };

  const startEdit = (section: any) => {
    setEditingSectionId(section.section_id || section.id);
    setEditText(section.edited_text || section.generated_text || '');
    setSaveStatus('idle');
  };

  const finishEdit = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (editingSectionId && editText) {
      saveMut.mutate({
        sectionId: editingSectionId,
        reportId,
        editedText: editText,
        changeSummary: 'Manual save',
      });
    }
    setEditingSectionId(null);
    setSaveStatus('idle');
  };

  const handleRevert = () => {
    if (!revertTarget) return;
    revertMut.mutate({ sectionId: revertTarget, reportId });
    setRevertTarget(null);
  };

  const handleRegenerate = (replaceExisting: boolean) => {
    if (!showRegenDialog) return;
    if (showRegenDialog.type === 'section' && showRegenDialog.sectionKey) {
      regenSection.mutate({ reportId, sectionKey: showRegenDialog.sectionKey, replaceExisting });
    } else {
      regenFull.mutate({ reportId, replaceExisting });
    }
    setShowRegenDialog(null);
  };

  const handleChangeSession = (sessionId: string) => {
    changeSession.mutate({ reportId, sessionId });
    setShowSessionPicker(false);
  };

  const handleAddNote = (sectionId: string) => {
    if (!noteText.trim()) return;
    importMut.mutate({
      sectionId,
      reportId,
      sourceType: 'manual_note',
      sourceRecordId: 'manual',
      insertedText: noteText.trim(),
      importMode: 'append',
    });
    setNoteText('');
    setNoteDrawerSectionId(null);
  };

  // ─── Non-destructive Export ───
  const handleExport = async (format: 'docx' | 'pdf' | 'text') => {
    setExporting(true);
    try {
      const allSections = sections || [];
      const textContent = allSections
        .map((s: any) => `## ${s.section_title}\n\n${s.edited_text || s.generated_text || '(No content)'}`)
        .join('\n\n---\n\n');

      if (format === 'text') {
        const blob = new Blob(
          [`# BOPS Report — ${studentName}\n\nGenerated: ${new Date().toLocaleDateString()}\n\n${textContent}`],
          { type: 'text/plain' }
        );
        downloadBlob(blob, `BOPS_Report_${studentName.replace(/\s/g, '_')}.txt`);
        toast.success('Text export downloaded');
      } else if (format === 'docx') {
        try {
          const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
          const children: any[] = [
            new Paragraph({
              heading: HeadingLevel.TITLE,
              children: [new TextRun({ text: `BOPS Behavioral Intelligence Report`, bold: true })],
            }),
            new Paragraph({
              children: [new TextRun({ text: `Student: ${studentName}  •  Date: ${new Date().toLocaleDateString()}`, italics: true })],
              spacing: { after: 300 },
            }),
          ];
          allSections.forEach((s: any) => {
            children.push(
              new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun({ text: s.section_title, bold: true })],
                spacing: { before: 400 },
              }),
            );
            const content = s.edited_text || s.generated_text || '';
            content.split('\n').forEach((line: string) => {
              children.push(new Paragraph({ children: [new TextRun(line)] }));
            });
          });
          const doc = new Document({
            sections: [{ properties: { page: { size: { width: 12240, height: 15840 } } }, children }],
          });
          const buffer = await Packer.toBlob(doc);
          downloadBlob(buffer, `BOPS_Report_${studentName.replace(/\s/g, '_')}.docx`);
          toast.success('Word document downloaded');
        } catch {
          toast.error('DOCX generation failed — try text export');
        }
      } else {
        // PDF fallback: use text export
        const blob = new Blob(
          [`BOPS Report — ${studentName}\n\n${textContent}`],
          { type: 'text/plain' }
        );
        downloadBlob(blob, `BOPS_Report_${studentName.replace(/\s/g, '_')}.txt`);
        toast.success('Report exported as text (PDF requires server-side generation)');
      }
    } finally {
      setExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openImport = (section: any) => {
    setImportSectionId(section.section_id || section.id);
    setImportSectionKey(section.section_key || section.section_title?.toLowerCase().replace(/[^a-z_]/g, '_') || null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" type="button" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              BOPS Report — {studentName}
            </h2>
            <p className="text-xs text-muted-foreground">
              Editable workspace • {sections?.length || 0} sections
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving…
            </Badge>
          )}
          {saveStatus === 'saved' && (
            <Badge variant="secondary" className="gap-1 text-xs text-green-700">
              <Check className="w-3 h-3" /> Saved
            </Badge>
          )}
          <Badge variant="outline">Draft</Badge>

          {/* Export Dropdown — non-destructive, stays in workspace */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1" disabled={exporting}>
                {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Export without leaving workspace</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('docx')} className="gap-2">
                <FileType className="w-4 h-4" /> Export to Word (.docx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2">
                <FileDown className="w-4 h-4" /> Export to PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('text')} className="gap-2">
                <Clipboard className="w-4 h-4" /> Export Text Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Session Context Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Lock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Source Session:</span>
              {sourceSession ? (
                <>
                  <span className="text-sm text-foreground">
                    {sourceSession.assessment_date
                      ? format(new Date(sourceSession.assessment_date + 'T00:00:00'), 'MMM d, yyyy')
                      : '—'}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {entryModeLabel[sourceSession.entry_mode] || sourceSession.entry_mode || 'Assessment'}
                  </Badge>
                  {sourceSession.calculated_training_name && (
                    <Badge variant="secondary" className="text-xs">{sourceSession.calculated_training_name}</Badge>
                  )}
                  {sourceSession.is_active_session && (
                    <Badge className="text-xs bg-primary text-primary-foreground gap-1">
                      <Star className="w-3 h-3" /> Active Session
                    </Badge>
                  )}
                </>
              ) : reportMeta?.source_session_id ? (
                <span className="text-xs text-muted-foreground">Session {reportMeta.source_session_id.slice(0, 8)}…</span>
              ) : (
                <span className="text-xs text-muted-foreground">No source session linked</span>
              )}
              <Badge variant="outline" className="text-xs gap-1 border-primary/30">
                <Lock className="w-3 h-3" /> Locked to Session
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm" variant="outline" className="h-7 text-xs gap-1" type="button"
                onClick={() => setShowSessionPicker(true)}
              >
                <Settings2 className="w-3 h-3" /> Change Session
              </Button>
              <Button
                size="sm" variant="outline" className="h-7 text-xs gap-1" type="button"
                disabled={regenFull.isPending}
                onClick={() => setShowRegenDialog({ type: 'full' })}
              >
                {regenFull.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Regenerate All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-4 pr-4">
          {(sections || []).map((section: any) => {
            const sectionId = section.section_id || section.id;
            const isEditing = editingSectionId === sectionId;
            const displayText = section.edited_text || section.generated_text || '';

            return (
              <Card key={sectionId} className={isEditing ? 'ring-2 ring-primary/40' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      {section.section_title}
                      {section.is_edited && (
                        <Badge variant="secondary" className="text-[10px]">Edited</Badge>
                      )}
                    </CardTitle>
                    {/* Section Action Bar */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {!isEditing ? (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" type="button" onClick={() => startEdit(section)}>
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" type="button" onClick={finishEdit}>
                          <Check className="w-3 h-3" /> Done
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="sm" className="h-7 text-xs gap-1" type="button"
                        disabled={regenSection.isPending}
                        onClick={() => setShowRegenDialog({ type: 'section', sectionKey: section.section_key || section.section_title })}
                      >
                        <RefreshCw className="w-3 h-3" /> Regen
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" type="button" onClick={() => openImport(section)}>
                        <Import className="w-3 h-3" /> Import
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" type="button"
                        onClick={() => { setNoteDrawerSectionId(sectionId); setNoteText(''); }}>
                        <StickyNote className="w-3 h-3" /> Note
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" type="button" onClick={() => setVersionsSectionId(sectionId)}>
                        <History className="w-3 h-3" />
                      </Button>
                      {section.is_edited && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" type="button" onClick={() => setRevertTarget(sectionId)}>
                          <Undo2 className="w-3 h-3" /> Revert
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editText}
                      onChange={e => handleEditChange(e.target.value)}
                      className="min-h-[120px] text-sm"
                      autoFocus
                    />
                  ) : (
                    <div className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">
                      {displayText || <span className="text-muted-foreground italic">No content yet</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Regenerate Dialog */}
      <Dialog open={!!showRegenDialog} onOpenChange={o => !o && setShowRegenDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Regenerate {showRegenDialog?.type === 'full' ? 'Entire Report' : 'Section'}
            </DialogTitle>
            <DialogDescription>
              This will regenerate content from the report's source session. Choose how to handle existing edits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button
              className="w-full justify-start gap-2" variant="destructive" type="button"
              disabled={regenSection.isPending || regenFull.isPending}
              onClick={() => handleRegenerate(true)}
            >
              <RefreshCw className="w-4 h-4" /> Replace — overwrite edits with fresh content
            </Button>
            <Button
              className="w-full justify-start gap-2" variant="outline" type="button"
              disabled={regenSection.isPending || regenFull.isPending}
              onClick={() => handleRegenerate(false)}
            >
              <Plus className="w-4 h-4" /> Append — keep edits and add new content below
            </Button>
            <Button className="w-full justify-start gap-2" variant="ghost" type="button" onClick={() => setShowRegenDialog(null)}>
              <X className="w-4 h-4" /> Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Picker Dialog */}
      <Dialog open={showSessionPicker} onOpenChange={setShowSessionPicker}>
        <DialogContent className="max-w-lg max-h-[70vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Change Source Session
            </DialogTitle>
            <DialogDescription>
              Switch this report to a different BOPS session. This will NOT automatically regenerate content.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            {sessionList && sessionList.length > 0 ? (
              <div className="space-y-2">
                {sessionList.map((s: any) => {
                  const isCurrent = s.session_id === reportMeta?.source_session_id;
                  return (
                    <div
                      key={s.session_id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${isCurrent ? 'border-primary bg-primary/5' : 'hover:bg-accent/30'}`}
                      onClick={() => !isCurrent && handleChangeSession(s.session_id)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {s.assessment_date
                            ? format(new Date(s.assessment_date + 'T00:00:00'), 'MMM d, yyyy')
                            : '—'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {entryModeLabel[s.entry_mode] || s.entry_mode || 'Assessment'}
                        </Badge>
                        {s.is_active_session && (
                          <Badge className="text-xs bg-primary text-primary-foreground gap-1">
                            <Star className="w-3 h-3" /> Active
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge variant="secondary" className="text-xs">Current Source</Badge>
                        )}
                      </div>
                      {s.calculated_training_name && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {s.calculated_training_name}
                          {s.calculated_clinical_name ? ` • ${s.calculated_clinical_name}` : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No sessions available</p>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setShowSessionPicker(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Import Drawer */}
      <ImportDrawer
        open={!!importSectionId}
        onOpenChange={open => { if (!open) { setImportSectionId(null); setImportSectionKey(null); } }}
        sectionId={importSectionId}
        sectionKey={importSectionKey}
        reportId={reportId}
        studentId={studentId}
        onImport={importMut.mutate}
      />

      {/* Add Note Drawer */}
      <Sheet open={!!noteDrawerSectionId} onOpenChange={open => !open && setNoteDrawerSectionId(null)}>
        <SheetContent className="w-[380px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <StickyNote className="w-4 h-4" /> Add Note
            </SheetTitle>
            <SheetDescription>Add a manual note to this section.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Type your note here..."
              className="min-h-[120px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => noteDrawerSectionId && handleAddNote(noteDrawerSectionId)} disabled={!noteText.trim()}>
                Add Note
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setNoteDrawerSectionId(null)}>Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Version History Dialog */}
      <VersionHistoryDialog
        sectionId={versionsSectionId}
        open={!!versionsSectionId}
        onOpenChange={open => !open && setVersionsSectionId(null)}
      />

      {/* Revert Confirmation */}
      <ConfirmDialog
        open={!!revertTarget}
        onOpenChange={open => !open && setRevertTarget(null)}
        title="Revert to Generated"
        description="This will replace your edits with the original generated content. A version will be saved in history."
        confirmLabel="Revert"
        onConfirm={handleRevert}
        variant="destructive"
      />
    </div>
  );
}

// ─── Enhanced Import Drawer with all data sources ───
function ImportDrawer({
  open, onOpenChange, sectionId, sectionKey, reportId, studentId, onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string | null;
  sectionKey: string | null;
  reportId: string;
  studentId: string;
  onImport: (args: any) => void;
}) {
  const [tab, setTab] = useState('programs');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [insertMode, setInsertMode] = useState<string>('append');

  // Get suggested sources for this section
  const suggestedSources = sectionKey ? SECTION_SOURCE_MAP[sectionKey] || [] : [];

  useEffect(() => {
    if (!open || !studentId) return;
    setSelected(new Set());
    fetchItems(tab);
  }, [open, tab, studentId]);

  const fetchItems = async (source: string) => {
    setLoading(true);
    try {
      let data: any[] = [];
      switch (source) {
        case 'programs': {
          const res = await db.from('v_student_bops_program_bank_summary').select('*').eq('student_id', studentId);
          data = (res.data || []).map((r: any) => ({
            id: r.program_id || r.id || crypto.randomUUID(),
            title: r.program_name || r.title || 'Program',
            source: 'BOPS Program',
            text: r.program_description || r.program_name || '',
            preview: r.program_name,
          }));
          break;
        }
        case 'targets': {
          const res = await db.from('skill_targets').select('id, target_name, status, current_phase, domain').eq('student_id', studentId).order('created_at', { ascending: false }).limit(30);
          data = (res.data || []).map((r: any) => ({
            id: r.id,
            title: r.target_name,
            source: 'Skill Target',
            text: `Status: ${r.status || 'active'} • Phase: ${r.current_phase || 'N/A'} • Domain: ${r.domain || 'N/A'}`,
            preview: r.target_name,
          }));
          break;
        }
        case 'behavior': {
          const res = await db.from('behavior_session_data').select('id, behavior_id, frequency, duration_seconds, created_at').eq('student_id', studentId).order('created_at', { ascending: false }).limit(20);
          data = (res.data || []).map((r: any) => ({
            id: r.id,
            title: `Behavior ${r.behavior_id?.slice(0, 8)} — freq: ${r.frequency || 0}`,
            source: 'Behavior Data',
            text: `Frequency: ${r.frequency || 0}, Duration: ${r.duration_seconds || 0}s`,
            preview: `freq: ${r.frequency || 0}, dur: ${r.duration_seconds || 0}s`,
          }));
          break;
        }
        case 'abc': {
          const res = await db.from('abc_logs').select('id, antecedent, behavior, consequence, logged_at').eq('client_id', studentId).order('logged_at', { ascending: false }).limit(20);
          data = (res.data || []).map((r: any) => ({
            id: r.id,
            title: `ABC: ${(r.behavior || '').slice(0, 40)}`,
            source: 'ABC Log',
            text: `A: ${r.antecedent || 'N/A'}\nB: ${r.behavior || 'N/A'}\nC: ${r.consequence || 'N/A'}`,
            preview: `${r.antecedent?.slice(0, 30)} → ${r.behavior?.slice(0, 30)}`,
          }));
          break;
        }
        case 'assessments': {
          // Pull from Nova assessments
          const res = await db.from('v_nova_assessment_report').select('*').eq('student_id', studentId).order('administration_date', { ascending: false }).limit(10);
          data = (res.data || []).map((r: any) => ({
            id: r.session_id,
            title: `${r.assessment_name || 'Assessment'} — ${r.administration_date || ''}`,
            source: r.assessment_code || 'Assessment',
            text: r.domain_results ? JSON.stringify(r.domain_results).slice(0, 200) : 'No scored results',
            preview: `${r.assessment_code} ${r.administration_date}`,
          }));
          // Also pull BOPS sessions
          const bres = await db.from('v_student_bops_session_history').select('*').eq('student_id', studentId).order('assessment_date', { ascending: false }).limit(10);
          const bopsItems = (bres.data || []).map((r: any) => ({
            id: r.session_id,
            title: `BOPS Session — ${r.assessment_date || ''}`,
            source: 'BOPS',
            text: `${r.calculated_training_name || ''} ${r.entry_mode || ''}`,
            preview: `BOPS ${r.assessment_date}`,
          }));
          data = [...data, ...bopsItems];
          break;
        }
        case 'reports': {
          const res = await db.from('v_bops_reports').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(10);
          data = (res.data || []).map((r: any) => ({
            id: r.id || r.report_id,
            title: `Report: ${r.title || 'Untitled'} — ${r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy') : ''}`,
            source: 'Prior Report',
            text: r.status || 'draft',
            preview: r.title,
          }));
          break;
        }
        case 'notes': {
          data = [{ id: 'manual_note', title: 'Add a manual note', source: 'Note', text: '', preview: 'Type your own note' }];
          break;
        }
        case 'graphs': {
          data = [
            { id: 'behavior_trend', title: 'Behavior Trend Graph', source: 'Chart', text: 'Frequency/duration trends over time', preview: 'behavior trend' },
            { id: 'interval_occurrence', title: 'Interval Occurrence Graph', source: 'Chart', text: 'Time-sampling analysis', preview: 'interval occurrence' },
            { id: 'placement_fit', title: 'Placement Fit Chart', source: 'Chart', text: 'CFI placement analysis', preview: 'placement fit' },
            { id: 'classroom_volatility', title: 'Classroom Volatility Chart', source: 'Chart', text: 'Genome-based volatility', preview: 'volatility chart' },
          ];
          break;
        }
        case 'placement': {
          const res = await db.from('v_student_bops_selected_placement').select('*').eq('student_id', studentId);
          data = (res.data || []).map((r: any) => ({
            id: r.student_id,
            title: `Placement: ${r.classroom_type_name || 'Unknown'}`,
            source: 'Placement / CFI',
            text: `Fit: ${r.fit_band || 'N/A'}, Score: ${r.fit_score || 'N/A'}`,
            preview: `${r.classroom_type_name} — ${r.fit_band}`,
          }));
          break;
        }
        case 'genome': {
          const res = await db.from('v_bops_classroom_genome').select('*').limit(10);
          data = (res.data || []).map((r: any) => ({
            id: r.classroom_id || r.id || crypto.randomUUID(),
            title: `Classroom: ${r.classroom_name || 'Unknown'}`,
            source: 'Genome',
            text: `Volatility: ${r.volatility_score || 'N/A'}`,
            preview: r.classroom_name,
          }));
          break;
        }
        case 'attachments': {
          data = [{ id: 'upload_placeholder', title: 'Upload attachment (coming soon)', source: 'Attachment', text: 'File upload support will be available in a future update', preview: '' }];
          break;
        }
      }
      setItems(data);
    } catch (err) {
      console.error('[ImportDrawer] fetch error:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleInsert = () => {
    if (!sectionId) return;
    const selectedItems = items.filter(i => selected.has(i.id));
    let text = '';

    switch (insertMode) {
      case 'bullet_list':
        text = selectedItems.map(i => `• ${i.title}: ${i.text}`).join('\n');
        break;
      case 'table':
        text = '| Item | Details |\n|---|---|\n' + selectedItems.map(i => `| ${i.title} | ${i.text} |`).join('\n');
        break;
      case 'figure':
        text = selectedItems.map(i => `[Figure: ${i.title}]\n${i.text}\nCaption: ${i.preview || i.title}`).join('\n\n');
        break;
      case 'paragraph':
        text = selectedItems.map(i => `${i.title}. ${i.text}`).join('\n\n');
        break;
      default:
        text = selectedItems.map(i => `${i.title}: ${i.text}`).join('\n');
    }

    onImport({
      sectionId,
      reportId,
      sourceType: tab,
      sourceRecordId: selectedItems.map(i => i.id).join(','),
      insertedText: text,
      importMode: insertMode,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Import className="w-4 h-4" /> Import into Section
          </SheetTitle>
          <SheetDescription>Select content to insert. The report stays open.</SheetDescription>
        </SheetHeader>

        {/* Suggested sources hint */}
        {suggestedSources.length > 0 && (
          <div className="mt-2 flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground">Suggested:</span>
            {suggestedSources.map(s => {
              const src = IMPORT_SOURCES.find(is => is.key === s);
              return src ? (
                <Badge
                  key={s}
                  variant={tab === s ? 'default' : 'outline'}
                  className="text-[10px] cursor-pointer"
                  onClick={() => setTab(s)}
                >
                  {src.label}
                </Badge>
              ) : null;
            })}
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="mt-3 flex-1 flex flex-col min-h-0">
          <TabsList className="w-full flex-wrap h-auto gap-1 justify-start">
            {IMPORT_SOURCES.map(src => (
              <TabsTrigger key={src.key} value={src.key} className="text-[10px] gap-1 px-2 py-1">
                <src.icon className="w-3 h-3" />
                {src.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="flex-1 mt-3 min-h-0" style={{ maxHeight: '340px' }}>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No items found</p>
            ) : (
              <div className="space-y-2 pr-2">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selected.has(item.id) ? 'border-primary bg-primary/5' : 'hover:bg-accent/30'}`}
                    onClick={() => toggleSelect(item.id)}
                  >
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={selected.has(item.id)} readOnly className="rounded" />
                      <span className="text-sm font-medium text-foreground">{item.title}</span>
                      <Badge variant="secondary" className="text-[10px] ml-auto">{item.source}</Badge>
                    </div>
                    {item.text && <p className="text-xs text-muted-foreground mt-1 ml-6 line-clamp-2">{item.text}</p>}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Tabs>

        {/* Insert Mode + Actions */}
        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Insert as:</span>
            <Select value={insertMode} onValueChange={setInsertMode}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INSERT_MODES.map(m => (
                  <SelectItem key={m.key} value={m.key} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={selected.size === 0} type="button" onClick={handleInsert}>
              Insert ({selected.size})
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Version History Dialog ───
function VersionHistoryDialog({
  sectionId, open, onOpenChange,
}: {
  sectionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: versions, isLoading } = useBopsReportSectionVersions(sectionId || undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-4 h-4" /> Section Version History
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh]">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
          ) : (versions || []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No version history yet</p>
          ) : (
            <div className="space-y-3">
              {(versions || []).map((v: any) => (
                <div key={v.id} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">v{v.version_number}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{v.version_type}</Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {v.created_at ? format(new Date(v.created_at), 'MMM d, yyyy h:mm a') : ''}
                    </span>
                  </div>
                  {v.change_summary && <p className="text-xs text-muted-foreground mb-1">{v.change_summary}</p>}
                  <p className="text-xs whitespace-pre-wrap line-clamp-4">{v.content_text}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
