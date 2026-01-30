import { useState, useMemo } from 'react';
import { 
  Plus, Download, Filter, Pencil, Link2, BookOpen, Building2, 
  MoreHorizontal, Trash2, Pause, Play, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useStudentTargets, useDomains, useTargetActions } from '@/hooks/useCurriculum';
import { AddTargetDialog } from './AddTargetDialog';
import { ImportFromCurriculumDialog } from './ImportFromCurriculumDialog';
import { BulkImportDialog } from './BulkImportDialog';
import type { StudentTarget } from '@/types/curriculum';

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
};

export function TargetsSubTab({ studentId, studentName }: TargetsSubTabProps) {
  const { targets, loading, refetch } = useStudentTargets(studentId);
  const { domains } = useDomains();
  const { updateTarget, deleteTarget } = useTargetActions(studentId, refetch);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [editingTarget, setEditingTarget] = useState<StudentTarget | null>(null);

  const filteredTargets = useMemo(() => {
    return targets.filter(t => {
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (domainFilter !== 'all' && t.domain_id !== domainFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (sourceFilter !== 'all' && t.source_type !== sourceFilter) return false;
      return true;
    });
  }, [targets, searchQuery, statusFilter, domainFilter, priorityFilter, sourceFilter]);

  const handleStatusChange = async (targetId: string, newStatus: string) => {
    await updateTarget(targetId, { 
      status: newStatus as StudentTarget['status'],
      date_mastered: newStatus === 'mastered' ? new Date().toISOString() : null,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {targets.length} total targets
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {targets.filter(t => t.status === 'active').length} active
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Target
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowAddDialog(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Create Custom Target
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
                <BookOpen className="w-4 h-4 mr-2" />
                Import from Curriculum Library
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowBulkImportDialog(true)}>
                <Download className="w-4 h-4 mr-2" />
                Bulk Import
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
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

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                {Object.entries(PRIORITY_CONFIG).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {Object.entries(SOURCE_CONFIG).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Targets List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading targets...</div>
      ) : filteredTargets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-lg mb-2">No targets found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {targets.length === 0 
                ? 'Add skill acquisition targets from the curriculum library or create custom targets.'
                : 'No targets match the current filters.'}
            </p>
            {targets.length === 0 && (
              <Button onClick={() => setShowImportDialog(true)}>
                <BookOpen className="w-4 h-4 mr-2" />
                Import from Curriculum
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTargets.map(target => {
            const statusConfig = STATUS_CONFIG[target.status];
            const priorityConfig = PRIORITY_CONFIG[target.priority];
            const sourceConfig = SOURCE_CONFIG[target.source_type];
            const StatusIcon = statusConfig.icon;
            const SourceIcon = sourceConfig.icon;

            return (
              <Card key={target.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-medium text-sm">{target.title}</h4>
                        
                        {/* Status Badge */}
                        <Badge className={`${statusConfig.color} text-white text-xs`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>

                        {/* Source Badge */}
                        <Badge variant="outline" className={`text-xs ${sourceConfig.color}`}>
                          <SourceIcon className="w-3 h-3 mr-1" />
                          {sourceConfig.label}
                        </Badge>

                        {/* Customized indicator */}
                        {target.customized && (
                          <Badge variant="outline" className="text-xs">
                            <Pencil className="w-3 h-3 mr-1" />
                            Customized
                          </Badge>
                        )}

                        {/* Prerequisites indicator */}
                        {target.linked_prerequisite_ids.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Link2 className="w-3 h-3 mr-1" />
                            {target.linked_prerequisite_ids.length} prereqs
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {target.domain && (
                          <span className="font-medium">{target.domain.name}</span>
                        )}
                        <Badge variant="outline" className={`text-xs ${priorityConfig.color}`}>
                          {priorityConfig.label}
                        </Badge>
                        <span>{target.data_collection_type.replace('_', ' ')}</span>
                      </div>

                      {target.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {target.description}
                        </p>
                      )}

                      {target.mastery_criteria && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">Mastery:</span> {target.mastery_criteria}
                        </p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingTarget(target)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit Target
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {target.status !== 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(target.id, 'active')}>
                            <Play className="w-4 h-4 mr-2" />
                            Set Active
                          </DropdownMenuItem>
                        )}
                        {target.status !== 'paused' && target.status !== 'mastered' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(target.id, 'paused')}>
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </DropdownMenuItem>
                        )}
                        {target.status !== 'mastered' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(target.id, 'mastered')}>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Mark Mastered
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => deleteTarget(target.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <AddTargetDialog
        open={showAddDialog || !!editingTarget}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingTarget(null);
          }
        }}
        studentId={studentId}
        editingTarget={editingTarget}
        onSuccess={refetch}
      />

      <ImportFromCurriculumDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        studentId={studentId}
        existingTargetSourceIds={targets.filter(t => t.source_id).map(t => t.source_id!)}
        onSuccess={refetch}
      />

      <BulkImportDialog
        open={showBulkImportDialog}
        onOpenChange={setShowBulkImportDialog}
        studentId={studentId}
        existingTargetSourceIds={targets.filter(t => t.source_id).map(t => t.source_id!)}
        onSuccess={refetch}
      />
    </div>
  );
}
