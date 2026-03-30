import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import {
  FileText, Pencil, RefreshCw, Undo2, Plus, History, Save,
  Check, Loader2, ArrowLeft, Download, ChevronDown, ChevronUp,
  Import, StickyNote, X,
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useBopsReportWorkspace, useSaveBopsReportSection,
  useRevertBopsReportSection, useBopsReportSectionVersions,
  useImportIntoBopsSection,
} from '@/hooks/useBopsReports';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

interface Props {
  reportId: string;
  studentId: string;
  studentName: string;
  onBack: () => void;
}

export function BopsReportWorkspace({ reportId, studentId, studentName, onBack }: Props) {
  const { data: sections, isLoading } = useBopsReportWorkspace(reportId);
  const saveMut = useSaveBopsReportSection();
  const revertMut = useRevertBopsReportSection();
  const importMut = useImportIntoBopsSection();

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [revertTarget, setRevertTarget] = useState<string | null>(null);
  const [versionsSectionId, setVersionsSectionId] = useState<string | null>(null);
  const [importSectionId, setImportSectionId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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
          <Button variant="ghost" size="sm" onClick={onBack}>
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

      {/* Sections */}
      <ScrollArea className="h-[calc(100vh-240px)]">
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
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => startEdit(section)}>
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={finishEdit}>
                          <Check className="w-3 h-3" /> Done
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setImportSectionId(sectionId)}>
                        <Import className="w-3 h-3" /> Import
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setVersionsSectionId(sectionId)}>
                        <History className="w-3 h-3" />
                      </Button>
                      {section.is_edited && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={() => setRevertTarget(sectionId)}>
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
          <Button size="sm" disabled={selected.size === 0} onClick={() => handleInsert('append')}>
            Append to Section
          </Button>
          <Button size="sm" variant="outline" disabled={selected.size === 0} onClick={() => handleInsert('bullet_list')}>
            Insert as Bullets
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}