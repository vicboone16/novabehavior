import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Upload, FileJson, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { usePresentingProblems } from '@/hooks/useBehaviorInterventions';
import { BxDomainList } from './BxDomainList';
import { BxProblemList } from './BxProblemList';
import { BxProblemDetail } from './BxProblemDetail';
import { BxImportDialog } from './BxImportDialog';
import { AddProblemDialog } from './AddProblemDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { BxPresentingProblem } from '@/types/behaviorIntervention';

interface BxInterventionLibraryProps {
  onSelectForStudent?: (problem: BxPresentingProblem) => void;
}

export function BxInterventionLibrary({ onSelectForStudent }: BxInterventionLibraryProps) {
  const { user } = useAuth();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<BxPresentingProblem | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Student picker state
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isAddingToStudents, setIsAddingToStudents] = useState(false);
  const [problemToAdd, setProblemToAdd] = useState<BxPresentingProblem | null>(null);

  const { problems, loading, refetch } = usePresentingProblems(selectedDomain || undefined);

  // Count problems per domain
  const { problems: allProblems } = usePresentingProblems();
  const problemCounts = useMemo(() => {
    return allProblems.reduce((acc, p) => {
      acc[p.domain] = (acc[p.domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [allProblems]);

  // Load students
  useEffect(() => {
    const loadStudents = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('students')
        .select('id, name')
        .eq('is_archived', false)
        .order('name');
      setStudents(data || []);
    };
    loadStudents();
  }, [user]);

  const handleAddToStudentsClick = (problem: BxPresentingProblem) => {
    setProblemToAdd(problem);
    setSelectedStudentIds([]);
    setShowStudentPicker(true);
  };

  const handleAddToStudents = async () => {
    if (!problemToAdd || selectedStudentIds.length === 0 || !user) return;

    setIsAddingToStudents(true);
    try {
      // Store the problem link in students' background_info JSON field
      for (const studentId of selectedStudentIds) {
        const { data: student } = await supabase
          .from('students')
          .select('background_info')
          .eq('id', studentId)
          .single();
        
        const bgInfo = (student?.background_info as any) || {};
        const currentLinks = bgInfo.bx_problem_links || [];
        const newLink = {
          problem_id: problemToAdd.id,
          problem_code: problemToAdd.problem_code,
          problem_title: problemToAdd.title,
          domain: problemToAdd.domain,
          link_status: 'considering',
          added_at: new Date().toISOString(),
          added_by: user.id,
        };
        
        await supabase
          .from('students')
          .update({ 
            background_info: { 
              ...bgInfo, 
              bx_problem_links: [...currentLinks, newLink] 
            } 
          })
          .eq('id', studentId);
      }

      toast.success(`Added intervention to ${selectedStudentIds.length} student(s)`);
      setShowStudentPicker(false);
      setProblemToAdd(null);
      setSelectedStudentIds([]);
    } catch (err: any) {
      // If table doesn't exist, show a helpful message
      if (err.message?.includes('relation') || err.code === '42P01') {
        toast.error('Intervention linking is being set up. Please try again later.');
      } else {
        toast.error('Failed to add intervention: ' + err.message);
      }
    } finally {
      setIsAddingToStudents(false);
    }
  };

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
            onAddToStudent={handleAddToStudentsClick}
          />
        </Card>

        {/* Problem detail */}
        <Card className="col-span-5 overflow-hidden">
          {selectedProblem ? (
            <div className="h-full flex flex-col">
              <BxProblemDetail problem={selectedProblem} />
              <div className="p-4 border-t">
                <Button 
                  onClick={() => handleAddToStudentsClick(selectedProblem)}
                  className="w-full"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add to Student
                </Button>
              </div>
            </div>
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

      {/* Student Picker Dialog */}
      <Dialog open={showStudentPicker} onOpenChange={(open) => {
        setShowStudentPicker(open);
        if (!open) {
          setProblemToAdd(null);
          setSelectedStudentIds([]);
        }
      }}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Intervention to Students</DialogTitle>
          </DialogHeader>
          
          {problemToAdd && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="font-medium text-sm">{problemToAdd.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{problemToAdd.domain}</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {students.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No students found</p>
            ) : (
              students.map(student => (
                <label 
                  key={student.id} 
                  className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer"
                >
                  <Checkbox
                    checked={selectedStudentIds.includes(student.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedStudentIds(prev => [...prev, student.id]);
                      } else {
                        setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                      }
                    }}
                  />
                  <span className="text-sm">{student.name}</span>
                </label>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowStudentPicker(false);
                setProblemToAdd(null);
                setSelectedStudentIds([]);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={selectedStudentIds.length === 0 || isAddingToStudents}
              onClick={handleAddToStudents}
            >
              {isAddingToStudents ? 'Adding...' : `Add to ${selectedStudentIds.length} Student(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
