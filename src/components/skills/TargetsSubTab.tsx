import { useState, useMemo } from 'react';
import {
  Plus, Download, Filter, Pencil, Link2, BookOpen, Building2,
  MoreHorizontal, Trash2, Pause, Play, CheckCircle2, AlertTriangle,
  ListChecks, FolderTree, Activity, Shield, ChevronDown, ChevronRight, ArrowRight,
  Target as TargetIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStudentTargets, useDomains, useTargetActions } from '@/hooks/useCurriculum';
import { useSkillPrograms } from '@/hooks/useSkillPrograms';
import { AddTargetDialog } from './AddTargetDialog';
import { AddProgramDialog } from './AddProgramDialog';
import { ImportFromCurriculumDialog } from './ImportFromCurriculumDialog';
import { BulkImportDialog } from './BulkImportDialog';
import { ProgramHierarchyView } from './ProgramHierarchyView';
import { SessionTargetPicker } from './SessionTargetPicker';
import { SkillSessionRunner } from './SkillSessionRunner';
import { BopsProgramsSection } from '@/components/programming/BopsProgramsSection';
import { useSessionTargetCollection } from '@/hooks/useSessionTargetCollection';
import type { StudentTarget } from '@/types/curriculum';
import type { SkillProgram } from '@/types/skillPrograms';

interface TargetsSubTabProps {
  studentId: string;
  studentName: string;
}

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-blue-500', icon: Play },
  paused: { label: 'Paused', color: 'bg-yellow-500', icon: Pause },
  mastered: { label: 'Mastered', color: 'bg-green-500', icon: CheckCircle2 },
  discontinued: { label: 'Discontinued', color: 'bg-gray-500', icon: AlertTriangle },
};

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'text-red-600 border-red-300' },
  medium: { label: 'Medium', color: 'text-yellow-600 border-yellow-300' },
  low: { label: 'Low', color: 'text-gray-600 border-gray-300' },
};

const SOURCE_CONFIG = {
  curriculum: { label: 'Curriculum', icon: BookOpen, color: 'bg-purple-100 text-purple-700' },
  org_template: { label: 'Org Goal', icon: Building2, color: 'bg-blue-100 text-blue-700' },
  custom: { label: 'Custom', icon: Pencil, color: 'bg-gray-100 text-gray-700' },
  behavior: { label: 'Behavior', icon: Activity, color: 'bg-red-100 text-red-700' },
  bops: { label: 'BOPS', icon: Shield, color: 'bg-blue-100 text-blue-700' },
};

const FALLBACK_SOURCE = { label: 'Other', icon: Link2, color: 'bg-muted text-muted-foreground' };
const FALLBACK_PRIORITY = { label: 'Medium', color: 'text-muted-foreground border-border' };
const FALLBACK_STATUS = { label: 'Unknown', color: 'bg-muted', icon: AlertTriangle };

export function TargetsSubTab({ studentId, studentName }: TargetsSubTabProps) {
  const { targets, loading: targetsLoading, refetch: refetchTargets } = useStudentTargets(studentId);
  const { programs, loading: programsLoading, refetch: refetchPrograms } = useSkillPrograms(studentId);
  const { domains } = useDomains();
  const { updateTarget, deleteTarget } = useTargetActions(studentId, refetchTargets);

  const [view, setView] = useState<'programs' | 'legacy'>('programs');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showProgramDialog, setShowProgramDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [editingTarget, setEditingTarget] = useState<StudentTarget | null>(null);
  const [editingProgram, setEditingProgram] = useState<SkillProgram | null>(null);
  const [expandedTargetId, setExpandedTargetId] = useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);

  const sessionCollection = useSessionTargetCollection(studentId);

  const filteredTargets = useMemo(() => {
    return targets.filter(t => {
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (domainFilter !== 'all' && t.domain_id !== domainFilter) return false;
      return true;
    });
  }, [targets, searchQuery, statusFilter, domainFilter]);

  const handleStatusChange = async (targetId: string, newStatus: string) => {
    await updateTarget(targetId, {
      status: newStatus as StudentTarget['status'],
      date_mastered: newStatus === 'mastered' ? new Date().toISOString() : null,
    });
  };

  const loading = targetsLoading || programsLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={view} onValueChange={v => v && setView(v as any)} className="h-8">
            <ToggleGroupItem value="programs" className="text-xs h-7 px-3 gap-1">
              <FolderTree className="w-3 h-3" /> Programs
            </ToggleGroupItem>
            <ToggleGroupItem value="legacy" className="text-xs h-7 px-3 gap-1">
              <ListChecks className="w-3 h-3" /> Individual Targets
            </ToggleGroupItem>
          </ToggleGroup>
          <Badge variant="outline" className="text-xs">
            {programs.length} programs
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {targets.length} individual targets
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowProgramDialog(true)}>
                <FolderTree className="w-4 h-4 mr-2" />
                New Program + Targets
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowAddDialog(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Create Individual Target
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
                <BookOpen className="w-4 h-4 mr-2" />
                Import from Curriculum
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowBulkImportDialog(true)}>
                <Download className="w-4 h-4 mr-2" />
                Bulk Import
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {view === 'programs' && (
        loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading programs...</div>
        ) : (
          <div className="space-y-4">
            <BopsProgramsSection
              studentId={studentId}
              onAllocated={() => {
                refetchPrograms();
                refetchTargets();
              }}
            />
            <ProgramHierarchyView
              programs={programs}
              domains={domains}
              studentId={studentId}
              onRefetch={refetchPrograms}
              onEditProgram={(p) => {
                setEditingProgram(p);
                setShowProgramDialog(true);
              }}
            />
          </div>
        )
      )}

      {view === 'legacy' && (
        <>
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-3">
                <Input
                  placeholder="Search targets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={domainFilter} onValueChange={setDomainFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Domain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Domains</SelectItem>
                    {domains.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {targetsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading targets...</div>
          ) : filteredTargets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-medium text-lg mb-2">No targets found</h3>
                <p className="text-sm text-muted-foreground">
                  {targets.length === 0
                    ? 'Add skill acquisition targets from the curriculum library or send BOPS targets here from the Programs section.'
                    : 'No targets match the current filters.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredTargets.map(target => {
                const statusConfig = STATUS_CONFIG[target.status as keyof typeof STATUS_CONFIG] || FALLBACK_STATUS;
                const priorityConfig = PRIORITY_CONFIG[target.priority as keyof typeof PRIORITY_CONFIG] || FALLBACK_PRIORITY;
                const sourceConfig = SOURCE_CONFIG[target.source_type as keyof typeof SOURCE_CONFIG] || FALLBACK_SOURCE;
                const StatusIcon = statusConfig.icon;
                const SourceIcon = sourceConfig.icon;
                const dataTypeLabel = typeof target.data_collection_type === 'string'
                  ? target.data_collection_type.replace(/_/g, ' ')
                  : 'unspecified';

                return (
                  <Card key={target.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-3">
                      <div
                        className="flex items-start justify-between gap-3 cursor-pointer"
                        onClick={() => setExpandedTargetId(expandedTargetId === target.id ? null : target.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {expandedTargetId === target.id
                              ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                              : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                            <h4 className="font-medium text-sm">{target.title}</h4>
                            <Badge className={`${statusConfig.color} text-white text-xs`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${sourceConfig.color}`}>
                              <SourceIcon className="w-3 h-3 mr-1" />
                              {sourceConfig.label}
                            </Badge>
                            {target.customized && (
                              <Badge variant="outline" className="text-xs">
                                <Pencil className="w-3 h-3 mr-1" /> Customized
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground ml-6">
                            {target.domain && <span className="font-medium">{target.domain.name}</span>}
                            <Badge variant="outline" className={`text-xs ${priorityConfig.color}`}>
                              {priorityConfig.label}
                            </Badge>
                            <span>{dataTypeLabel}</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingTarget(target)}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit Target
                            </DropdownMenuItem>
                            {programs.length > 0 && (
                              <DropdownMenuItem onClick={() => setMoveTargetId(target.id)}>
                                <ArrowRight className="w-4 h-4 mr-2" /> Move to Program
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {target.status !== 'active' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(target.id, 'active')}>
                                <Play className="w-4 h-4 mr-2" /> Set Active
                              </DropdownMenuItem>
                            )}
                            {target.status !== 'paused' && target.status !== 'mastered' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(target.id, 'paused')}>
                                <Pause className="w-4 h-4 mr-2" /> Pause
                              </DropdownMenuItem>
                            )}
                            {target.status !== 'mastered' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(target.id, 'mastered')}>
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Mastered
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteTarget(target.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Expanded details */}
                      {expandedTargetId === target.id && (
                        <div className="mt-3 ml-6 p-3 bg-muted/40 rounded-lg border border-border/50 space-y-2 text-xs">
                          {target.description && (
                            <div>
                              <span className="font-semibold text-foreground">Operational Definition:</span>
                              <p className="text-muted-foreground mt-0.5">{target.description}</p>
                            </div>
                          )}
                          {target.mastery_criteria && (
                            <div>
                              <span className="font-semibold text-foreground">Mastery Criteria:</span>
                              <p className="text-muted-foreground mt-0.5">{target.mastery_criteria}</p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-4">
                            {target.domain && (
                              <div>
                                <span className="font-semibold text-foreground">Domain:</span>{' '}
                                <span className="text-muted-foreground">{target.domain.name}</span>
                              </div>
                            )}
                            <div>
                              <span className="font-semibold text-foreground">Data Collection:</span>{' '}
                              <span className="text-muted-foreground">{dataTypeLabel}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-foreground">Source:</span>{' '}
                              <span className="text-muted-foreground">{sourceConfig.label}</span>
                            </div>
                          </div>
                          {programs.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs mt-2"
                              onClick={() => setMoveTargetId(target.id)}
                            >
                              <ArrowRight className="w-3 h-3 mr-1" /> Move to Program
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <AddTargetDialog
        open={showAddDialog || !!editingTarget}
        onOpenChange={(open) => {
          if (!open) { setShowAddDialog(false); setEditingTarget(null); }
        }}
        studentId={studentId}
        editingTarget={editingTarget}
        onSuccess={refetchTargets}
      />

      <AddProgramDialog
        open={showProgramDialog}
        onOpenChange={(open) => {
          if (!open) { setShowProgramDialog(false); setEditingProgram(null); }
        }}
        studentId={studentId}
        editingProgram={editingProgram}
        onSuccess={refetchPrograms}
      />

      <ImportFromCurriculumDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        studentId={studentId}
        existingTargetSourceIds={targets.filter(t => t.source_id).map(t => t.source_id!)}
        onSuccess={refetchTargets}
      />

      <BulkImportDialog
        open={showBulkImportDialog}
        onOpenChange={setShowBulkImportDialog}
        studentId={studentId}
        existingTargetSourceIds={targets.filter(t => t.source_id).map(t => t.source_id!)}
        onSuccess={refetchTargets}
      />

      {/* Move individual target to a program */}
      {moveTargetId && (
        <Dialog open={!!moveTargetId} onOpenChange={(o) => !o && setMoveTargetId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Move Target to Program</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Target:</span>{' '}
                <span className="font-medium">{targets.find(t => t.id === moveTargetId)?.title}</span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Destination Program</label>
                <Select onValueChange={async (programId) => {
                  const { supabase } = await import('@/integrations/supabase/client');
                  const { toast } = await import('sonner');
                  const { error } = await supabase
                    .from('skill_targets')
                    .insert({
                      program_id: programId,
                      name: targets.find(t => t.id === moveTargetId)?.title || 'Target',
                      operational_definition: targets.find(t => t.id === moveTargetId)?.description || null,
                      mastery_criteria: targets.find(t => t.id === moveTargetId)?.mastery_criteria || null,
                      display_order: 0,
                    });
                  if (error) {
                    toast.error('Failed to move target');
                  } else {
                    toast.success('Target added to program');
                    setMoveTargetId(null);
                    refetchPrograms();
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a program..." />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.domain?.name ? `${p.domain.name} › ` : ''}{p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
