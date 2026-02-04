import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, UserPlus, BookOpen, Loader2, Brain, ChevronRight } from 'lucide-react';
import { usePresentingProblems } from '@/hooks/useBehaviorInterventions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { BxPresentingProblem } from '@/types/behaviorIntervention';

interface BehaviorInterventionsPickerProps {
  /** Pre-select a specific student (useful when used within a student profile) */
  preSelectedStudentId?: string;
  /** Compact mode for embedding in other dialogs */
  compact?: boolean;
  /** Hide the header */
  hideHeader?: boolean;
  /** Callback when intervention is added to students */
  onAddToStudents?: (problemId: string, studentIds: string[]) => void;
}

export function BehaviorInterventionsPicker({
  preSelectedStudentId,
  compact = false,
  hideHeader = false,
  onAddToStudents,
}: BehaviorInterventionsPickerProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);

  // Student picker state
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isAddingToStudents, setIsAddingToStudents] = useState(false);
  const [problemToAdd, setProblemToAdd] = useState<BxPresentingProblem | null>(null);

  const { problems, loading } = usePresentingProblems(selectedDomain || undefined);

  // Domains for filtering
  const domains = [
    { id: 'academic', label: 'Academic Performance' },
    { id: 'emotional', label: 'Emotional/Physical Well-Being' },
    { id: 'social', label: 'Social Interaction/Communication' },
    { id: 'behavior', label: 'Behavior/Compliance' },
    { id: 'transitions', label: 'Transitions/Change Tolerance' },
    { id: 'safety', label: 'Safety/High Risk' },
  ];

  // Filter problems by search
  const filteredProblems = useMemo(() => {
    if (!searchQuery.trim()) return problems;
    const q = searchQuery.toLowerCase();
    return problems.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.problem_code.toLowerCase().includes(q) ||
        p.definition?.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q)
    );
  }, [problems, searchQuery]);

  // Group by domain
  const groupedProblems = useMemo(() => {
    return filteredProblems.reduce((acc, p) => {
      if (!acc[p.domain]) acc[p.domain] = [];
      acc[p.domain].push(p);
      return acc;
    }, {} as Record<string, BxPresentingProblem[]>);
  }, [filteredProblems]);

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
    if (preSelectedStudentId) {
      // Auto-select the pre-selected student
      setSelectedStudentIds([preSelectedStudentId]);
    } else {
      setSelectedStudentIds([]);
    }
    setShowStudentPicker(true);
  };

  const handleAddToStudents = async () => {
    if (!problemToAdd || selectedStudentIds.length === 0 || !user) return;

    setIsAddingToStudents(true);
    try {
      for (const studentId of selectedStudentIds) {
        const { data: student } = await supabase
          .from('students')
          .select('background_info')
          .eq('id', studentId)
          .single();

        const bgInfo = (student?.background_info as any) || {};
        const currentLinks = bgInfo.bx_problem_links || [];
        
        // Check if already linked
        if (currentLinks.some((l: any) => l.problem_id === problemToAdd.id)) {
          continue; // Skip already linked
        }

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
              bx_problem_links: [...currentLinks, newLink],
            },
          })
          .eq('id', studentId);
      }

      toast.success(`Added intervention to ${selectedStudentIds.length} student(s)`);
      onAddToStudents?.(problemToAdd.id, selectedStudentIds);
      setShowStudentPicker(false);
      setProblemToAdd(null);
      setSelectedStudentIds([]);
    } catch (err: any) {
      toast.error('Failed to add intervention: ' + err.message);
    } finally {
      setIsAddingToStudents(false);
    }
  };

  const cardClass = compact ? '' : 'border rounded-lg';

  return (
    <div className={`space-y-4 ${compact ? '' : 'p-4'}`}>
      {!hideHeader && (
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Behavior Interventions</h3>
          <Badge variant="secondary" className="ml-auto">
            {problems.length} interventions
          </Badge>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search interventions by name, code, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Domain filter chips */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={selectedDomain === null ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedDomain(null)}
        >
          All Domains
        </Badge>
        {domains.map((d) => (
          <Badge
            key={d.id}
            variant={selectedDomain === d.id ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedDomain(selectedDomain === d.id ? null : d.id)}
          >
            {d.label}
          </Badge>
        ))}
      </div>

      {/* Problem list */}
      <ScrollArea className={compact ? 'h-[300px]' : 'h-[400px]'}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No interventions found matching your search.</p>
          </div>
        ) : (
          <div className="space-y-4 pr-4">
            {Object.entries(groupedProblems).map(([domain, probs]) => (
              <div key={domain}>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                  {domain} ({probs.length})
                </h4>
                <div className="space-y-2">
                  {probs.map((problem) => (
                    <div
                      key={problem.id}
                      className="p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() =>
                            setExpandedProblem(
                              expandedProblem === problem.id ? null : problem.id
                            )
                          }
                        >
                          <div className="flex items-center gap-2">
                            <ChevronRight
                              className={`w-4 h-4 transition-transform ${
                                expandedProblem === problem.id ? 'rotate-90' : ''
                              }`}
                            />
                            <Badge variant="outline" className="text-xs">
                              {problem.problem_code}
                            </Badge>
                            <span className="font-medium text-sm">{problem.title}</span>
                          </div>
                          {expandedProblem === problem.id && problem.definition && (
                            <p className="text-xs text-muted-foreground mt-2 ml-6 line-clamp-3">
                              {problem.definition}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddToStudentsClick(problem)}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Student Picker Dialog */}
      <Dialog
        open={showStudentPicker}
        onOpenChange={(open) => {
          setShowStudentPicker(open);
          if (!open) {
            setProblemToAdd(null);
            setSelectedStudentIds([]);
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Intervention to Students</DialogTitle>
          </DialogHeader>

          {problemToAdd && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="font-medium text-sm">{problemToAdd.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {problemToAdd.problem_code} • {problemToAdd.domain}
              </p>
            </div>
          )}

          <ScrollArea className="h-[300px]">
            <div className="space-y-2 pr-4">
              {students.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No students found</p>
              ) : (
                students.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedStudentIds.includes(student.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStudentIds((prev) => [...prev, student.id]);
                        } else {
                          setSelectedStudentIds((prev) =>
                            prev.filter((id) => id !== student.id)
                          );
                        }
                      }}
                    />
                    <span className="text-sm">{student.name}</span>
                  </label>
                ))
              )}
            </div>
          </ScrollArea>

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
              {isAddingToStudents
                ? 'Adding...'
                : `Add to ${selectedStudentIds.length} Student(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
