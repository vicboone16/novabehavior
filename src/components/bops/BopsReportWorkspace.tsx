import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import {
  FileText, Pencil, RefreshCw, Undo2, Plus, History, Save,
  Check, Loader2, ArrowLeft, Download, ChevronDown, ChevronUp,
  Import, StickyNote, X, Lock, Settings2, AlertTriangle,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  useBopsReportWorkspace, useBopsReportMeta, useSaveBopsReportSection,
  useRevertBopsReportSection, useBopsReportSectionVersions,
  useImportIntoBopsSection, useRegenerateBopsSection, useRegenerateBopsFullReport,
  useChangeBopsReportSourceSession, useBopsSessionList,
} from '@/hooks/useBopsReports';
import { supabase } from '@/integrations/supabase/client';

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
  const [showRegenDialog, setShowRegenDialog] = useState<{ type: 'section' | 'full'; sectionKey?: string } | null>(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Find source session info
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
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                type="button"
                onClick={() => setShowSessionPicker(true)}
              >
                <Settings2 className="w-3 h-3" /> Change Session
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                type="button"
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
                    <div className="flex items-center gap-1">
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
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" type="button" onClick={() => setImportSectionId(sectionId)}>
                        <Import className="w-3 h-3" /> Import
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

      {/* Regenerate Dialog with Replace / Append / Compare */}
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
              className="w-full justify-start gap-2"
              variant="destructive"
              type="button"
              disabled={regenSection.isPending || regenFull.isPending}
              onClick={() => handleRegenerate(true)}
            >
              <RefreshCw className="w-4 h-4" /> Replace — overwrite edits with fresh content
            </Button>
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              type="button"
              disabled={regenSection.isPending || regenFull.isPending}
              onClick={() => handleRegenerate(false)}
            >
              <Plus className="w-4 h-4" /> Append — keep edits and add new content below
            </Button>
            <Button
              className="w-full justify-start gap-2"
              variant="ghost"
              type="button"
              onClick={() => setShowRegenDialog(null)}
            >
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
              Explicitly switch this report to use a different BOPS session. This will NOT automatically regenerate content.
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

      {/* Import Drawer */}
      <ImportDrawer
        open={!!importSectionId}
        onOpenChange={open => !open && setImportSectionId(null)}
        sectionId={importSectionId}
        reportId={reportId}
        studentId={studentId}
        onImport={importMut.mutate}
      />

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

// ─── Import Drawer ───
function ImportDrawer({
  open, onOpenChange, sectionId, reportId, studentId, onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string | null;
  reportId: string;
  studentId: string;
  onImport: (args: any) => void;
}) {
  const [tab, setTab] = useState('programs');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
          data = (res.data || []).map((r: any) => ({ id: r.program_id || r.id, title: r.program_name || r.title, source: 'BOPS Program', text: r.program_name }));
          break;
        }
        case 'behavior': {
          const res = await db.from('behavior_session_data').select('id, behavior_id, frequency, duration_seconds, created_at, sessions(started_at)').eq('student_id', studentId).order('created_at', { ascending: false }).limit(20);
          data = (res.data || []).map((r: any) => ({ id: r.id, title: `Behavior ${r.behavior_id?.slice(0,8)} — freq: ${r.frequency || 0}`, source: 'Behavior Data', text: `Frequency: ${r.frequency || 0}, Duration: ${r.duration_seconds || 0}s` }));
          break;
        }
        case 'placement': {
          const res = await db.from('v_student_bops_selected_placement').select('*').eq('student_id', studentId);
          data = (res.data || []).map((r: any) => ({ id: r.student_id, title: `Placement: ${r.classroom_type_name || 'Unknown'}`, source: 'Placement', text: `Fit: ${r.fit_band || 'N/A'}, Score: ${r.fit_score || 'N/A'}` }));
          break;
        }
        case 'genome': {
          const res = await db.from('v_bops_classroom_genome').select('*').limit(10);
          data = (res.data || []).map((r: any) => ({ id: r.classroom_id || r.id, title: `Classroom: ${r.classroom_name || r.id}`, source: 'Genome', text: `Volatility: ${r.volatility_score || 'N/A'}` }));
          break;
        }
        case 'notes': {
          data = [{ id: 'manual', title: 'Add manual note', source: 'Note', text: '' }];
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

  const handleInsert = (mode: string) => {
    if (!sectionId) return;
    const selectedItems = items.filter(i => selected.has(i.id));
    const text = selectedItems.map(i => `• ${i.title}: ${i.text}`).join('\n');
    onImport({
      sectionId,
      reportId,
      sourceType: tab,
      sourceRecordId: selectedItems.map(i => i.id).join(','),
      insertedText: text,
      importMode: mode,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[480px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Import className="w-4 h-4" /> Import into Section
          </SheetTitle>
          <SheetDescription>Select content to insert into the active report section.</SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="w-full flex-wrap h-auto gap-1">
            <TabsTrigger value="programs" className="text-xs">Programs</TabsTrigger>
            <TabsTrigger value="behavior" className="text-xs">Behavior Data</TabsTrigger>
            <TabsTrigger value="placement" className="text-xs">Placement</TabsTrigger>
            <TabsTrigger value="genome" className="text-xs">Genome</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-3">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No items found</p>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selected.has(item.id) ? 'border-primary bg-primary/5' : 'hover:bg-accent/30'}`}
                    onClick={() => toggleSelect(item.id)}
                  >
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={selected.has(item.id)} readOnly className="rounded" />
                      <span className="text-sm font-medium">{item.title}</span>
                      <Badge variant="secondary" className="text-[10px] ml-auto">{item.source}</Badge>
                    </div>
                    {item.text && <p className="text-xs text-muted-foreground mt-1 ml-6">{item.text}</p>}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Tabs>

        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button size="sm" disabled={selected.size === 0} type="button" onClick={() => handleInsert('append')}>
            Append to Section
          </Button>
          <Button size="sm" variant="outline" disabled={selected.size === 0} type="button" onClick={() => handleInsert('bullet_list')}>
            Insert as Bullets
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => onOpenChange(false)}>Cancel</Button>
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
