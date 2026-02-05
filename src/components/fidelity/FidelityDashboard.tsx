import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ClipboardCheck, Plus, TrendingUp, TrendingDown, Minus, 
  AlertTriangle, Calendar, User, Trash2, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { useTreatmentFidelity } from '@/hooks/useTreatmentFidelity';
import { FidelityCheckForm } from './FidelityCheckForm';
import { FidelityTemplateBuilder } from './FidelityTemplateBuilder';
import type { TreatmentFidelityCheck } from '@/types/treatmentFidelity';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FidelityDashboardProps {
  studentId: string;
  studentName?: string;
}

export function FidelityDashboard({ studentId, studentName }: FidelityDashboardProps) {
  const { checks, templates, stats, loading, createCheck, deleteCheck, createTemplate } = useTreatmentFidelity(studentId);
  const [showForm, setShowForm] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [deleteCheckId, setDeleteCheckId] = useState<string | null>(null);

  const getPercentageColor = (pct: number) => {
    if (pct >= 90) return 'text-primary';
    if (pct >= 80) return 'text-primary/80';
    if (pct >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 80) return 'bg-primary';
    if (pct >= 70) return 'bg-warning';
    return 'bg-destructive';
  };

  const handleDelete = async () => {
    if (deleteCheckId) {
      await deleteCheck(deleteCheckId);
      setDeleteCheckId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Treatment Fidelity
            </CardTitle>
            <CardDescription>
              Track BIP implementation adherence
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowTemplateBuilder(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Check
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Summary */}
          {stats && (
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className={`text-2xl font-bold ${getPercentageColor(stats.averagePercentage)}`}>
                  {stats.averagePercentage}%
                </p>
                <p className="text-xs text-muted-foreground">Average Fidelity</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold">{stats.totalChecks}</p>
                <p className="text-xs text-muted-foreground">Total Checks</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1">
                  {stats.trend === 'up' && <TrendingUp className="h-5 w-5 text-primary" />}
                  {stats.trend === 'down' && <TrendingDown className="h-5 w-5 text-destructive" />}
                  {stats.trend === 'stable' && <Minus className="h-5 w-5 text-muted-foreground" />}
                  <span className="text-lg font-medium capitalize">{stats.trend}</span>
                </div>
                <p className="text-xs text-muted-foreground">Trend</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                {stats.belowThresholdCount > 0 ? (
                  <div className="flex items-center justify-center gap-1 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-2xl font-bold">{stats.belowThresholdCount}</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-primary">0</p>
                )}
                <p className="text-xs text-muted-foreground">Below 80%</p>
              </div>
            </div>
          )}

          {/* Recent Checks */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Recent Checks</h4>
            
            {checks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No fidelity checks recorded yet</p>
                <p className="text-sm">Add your first check to start tracking implementation fidelity</p>
              </div>
            ) : (
              <div className="space-y-2">
                {checks.slice(0, 10).map((check) => (
                  <FidelityCheckCard 
                    key={check.id} 
                    check={check} 
                    onDelete={() => setDeleteCheckId(check.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* New Check Form */}
      <FidelityCheckForm
        open={showForm}
        onOpenChange={setShowForm}
        studentId={studentId}
        templates={templates}
        onSubmit={createCheck}
      />

      {/* Template Builder */}
      <FidelityTemplateBuilder
        open={showTemplateBuilder}
        onOpenChange={setShowTemplateBuilder}
        studentId={studentId}
        templates={templates}
        onCreateTemplate={createTemplate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCheckId} onOpenChange={() => setDeleteCheckId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fidelity Check?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the fidelity check record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FidelityCheckCard({ check, onDelete }: { check: TreatmentFidelityCheck; onDelete: () => void }) {
  const pct = check.fidelity_percentage || 0;
  const observerName = check.observer?.display_name || 
    `${check.observer?.first_name || ''} ${check.observer?.last_name || ''}`.trim() || 
    'Unknown';

  return (
    <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">
            {format(new Date(check.check_date), 'MMM d, yyyy')}
          </span>
          {check.setting && (
            <Badge variant="outline" className="text-xs">{check.setting}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>Observer: {observerName}</span>
          <span>•</span>
          <span>{check.items_implemented}/{check.items_total} items</span>
        </div>
      </div>
      
      <div className="w-32">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-bold ${
            pct >= 80 ? 'text-primary' : pct >= 70 ? 'text-warning' : 'text-destructive'
          }`}>
            {pct}%
          </span>
        </div>
        <Progress 
          value={pct} 
          className="h-2"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
