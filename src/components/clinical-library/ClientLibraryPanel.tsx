import { useState } from 'react';
import { Plus, X, BookOpen, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  useClientLibraryAssignments,
  useAssignLibrary,
  useRemoveLibraryAssignment,
  useClientGoalDrafts,
  useUpdateGoalDraftStatus,
} from '@/hooks/useClientLibrary';
import { useLibraryRegistry } from '@/hooks/useLibraryRegistry';

interface Props {
  clientId: string;
}

export function ClientLibraryPanel({ clientId }: Props) {
  const { data: assignments = [], isLoading: loadingAssign } = useClientLibraryAssignments(clientId);
  const { data: drafts = [], isLoading: loadingDrafts } = useClientGoalDrafts(clientId);
  const { data: libraries = [] } = useLibraryRegistry();
  const assignLibrary = useAssignLibrary();
  const removeAssignment = useRemoveLibraryAssignment();
  const updateDraftStatus = useUpdateGoalDraftStatus();
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedLibKey, setSelectedLibKey] = useState('');
  const [tab, setTab] = useState('assignments');

  const assignedKeys = new Set(assignments.map(a => a.library_key));
  const available = libraries.filter(l => !assignedKeys.has(l.library_key));
  const libraryName = (key: string) => libraries.find(l => l.library_key === key)?.library_name ?? key;

  const handleAssign = () => {
    if (!selectedLibKey) return;
    assignLibrary.mutate({ clientId, libraryKey: selectedLibKey });
    setShowAssignDialog(false);
    setSelectedLibKey('');
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList className="h-9">
            <TabsTrigger value="assignments" className="text-xs gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Libraries ({assignments.length})
            </TabsTrigger>
            <TabsTrigger value="drafts" className="text-xs gap-1">
              <FileText className="w-3.5 h-3.5" /> Goal Drafts ({drafts.filter(d => d.status === 'draft').length})
            </TabsTrigger>
          </TabsList>
          {tab === 'assignments' && (
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowAssignDialog(true)}>
              <Plus className="w-3.5 h-3.5" /> Assign Library
            </Button>
          )}
        </div>

        <TabsContent value="assignments" className="mt-4">
          {loadingAssign ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : assignments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No libraries assigned yet</p>
                <Button variant="outline" size="sm" className="mt-3 gap-1.5 text-xs" onClick={() => setShowAssignDialog(true)}>
                  <Plus className="w-3.5 h-3.5" /> Assign First Library
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {assignments.map(a => (
                <Card key={a.id} className="group">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{libraryName(a.library_key)}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="secondary" className="text-[9px]">{a.status}</Badge>
                        {a.notes && <Badge variant="outline" className="text-[9px]">{a.notes}</Badge>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={() => removeAssignment.mutate({ id: a.id, clientId })}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drafts" className="mt-4">
          {loadingDrafts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : drafts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No goal drafts yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Browse the Goal Library and click "Add to Draft Goals" to create drafts
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {drafts.map(d => (
                <Card key={d.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{d.draft_goal_title}</p>
                        {d.draft_goal_text && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{d.draft_goal_text}</p>
                        )}
                        <div className="flex gap-1 mt-1.5">
                          {d.source_library_key && (
                            <Badge variant="outline" className="text-[9px]">{libraryName(d.source_library_key)}</Badge>
                          )}
                          {d.domain_key && (
                            <Badge variant="secondary" className="text-[9px]">{d.domain_key.replace(/_/g, ' ')}</Badge>
                          )}
                          <Badge
                            variant={d.status === 'draft' ? 'secondary' : d.status === 'approved' ? 'default' : 'outline'}
                            className="text-[9px]"
                          >
                            {d.status}
                          </Badge>
                        </div>
                      </div>
                      {d.status === 'draft' && (
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px]"
                            onClick={() => updateDraftStatus.mutate({ id: d.id, clientId, status: 'approved' })}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px]"
                            onClick={() => updateDraftStatus.mutate({ id: d.id, clientId, status: 'dismissed' })}
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Assign Library Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Library</DialogTitle>
          </DialogHeader>
          <Select value={selectedLibKey} onValueChange={setSelectedLibKey}>
            <SelectTrigger>
              <SelectValue placeholder="Select a library..." />
            </SelectTrigger>
            <SelectContent>
              {available.map(l => (
                <SelectItem key={l.library_key} value={l.library_key}>{l.library_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!selectedLibKey}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
