import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Upload, FileJson } from 'lucide-react';
import { usePresentingProblems } from '@/hooks/useBehaviorInterventions';
import { BxDomainList } from './BxDomainList';
import { BxProblemList } from './BxProblemList';
import { BxProblemDetail } from './BxProblemDetail';
import { BxImportDialog } from './BxImportDialog';
import { AddProblemDialog } from './AddProblemDialog';
import type { BxPresentingProblem } from '@/types/behaviorIntervention';

interface BxInterventionLibraryProps {
  onSelectForStudent?: (problem: BxPresentingProblem) => void;
}

export function BxInterventionLibrary({ onSelectForStudent }: BxInterventionLibraryProps) {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<BxPresentingProblem | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { problems, loading, refetch } = usePresentingProblems(selectedDomain || undefined);

  // Count problems per domain
  const { problems: allProblems } = usePresentingProblems();
  const problemCounts = useMemo(() => {
    return allProblems.reduce((acc, p) => {
      acc[p.domain] = (acc[p.domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [allProblems]);

  return (
    <div className="h-full flex flex-col">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Intervention Library</h2>
          <p className="text-sm text-muted-foreground">
            Browse presenting problems, objectives, and strategies
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Problem
          </Button>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Domain list (TOC) */}
        <Card className="col-span-3 overflow-hidden">
          <BxDomainList
            selectedDomain={selectedDomain}
            onSelectDomain={setSelectedDomain}
            problemCounts={problemCounts}
          />
        </Card>

        {/* Problem list */}
        <Card className="col-span-4 overflow-hidden">
          <BxProblemList
            problems={problems}
            loading={loading}
            selectedProblem={selectedProblem}
            onSelectProblem={setSelectedProblem}
          />
        </Card>

        {/* Problem detail */}
        <Card className="col-span-5 overflow-hidden">
          {selectedProblem ? (
            <BxProblemDetail problem={selectedProblem} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
              <FileJson className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-center">
                Select a presenting problem to view its details, objectives, and strategies.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Dialogs */}
      <BxImportDialog 
        open={showImportDialog} 
        onOpenChange={setShowImportDialog}
        onSuccess={refetch}
      />
      <AddProblemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={refetch}
      />
    </div>
  );
}
