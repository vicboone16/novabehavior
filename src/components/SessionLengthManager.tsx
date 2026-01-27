import { useState } from 'react';
import { Clock, Settings, User, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/dataStore';

export function SessionLengthManager() {
  const { 
    students,
    sessionLengthMinutes,
    sessionLengthOverrides,
    setSessionLength,
    setSessionLengthOverride,
    removeSessionLengthOverride,
    selectedStudentIds
  } = useDataStore();

  const [open, setOpen] = useState(false);
  const [newOverrideStudentId, setNewOverrideStudentId] = useState<string>('');
  const [newOverrideBehaviorId, setNewOverrideBehaviorId] = useState<string>('');
  const [newOverrideMinutes, setNewOverrideMinutes] = useState(60);

  const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));

  const handleAddOverride = () => {
    if (newOverrideStudentId && newOverrideMinutes > 0) {
      setSessionLengthOverride({
        studentId: newOverrideStudentId || undefined,
        behaviorId: newOverrideBehaviorId || undefined,
        lengthMinutes: newOverrideMinutes,
      });
      setNewOverrideStudentId('');
      setNewOverrideBehaviorId('');
    }
  };

  const selectedStudentForOverride = students.find(s => s.id === newOverrideStudentId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Clock className="w-4 h-4" />
          {sessionLengthMinutes}m
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Session Length Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Default Session Length */}
          <div className="space-y-2">
            <Label>Default Session Length (minutes)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={sessionLengthMinutes}
                onChange={(e) => setSessionLength(Math.max(1, parseInt(e.target.value) || 60))}
                className="w-24"
                min={1}
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Used to calculate hourly rates for frequency data
            </p>
          </div>

          {/* Overrides */}
          <div className="space-y-2">
            <Label>Per-Student/Behavior Overrides</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Set custom session lengths for students who weren't observed for the full session
            </p>

            {/* Existing Overrides */}
            {sessionLengthOverrides.length > 0 && (
              <div className="space-y-1 mb-3">
                {sessionLengthOverrides.map((override, idx) => {
                  const student = students.find(s => s.id === override.studentId);
                  const behavior = student?.behaviors.find(b => b.id === override.behaviorId);
                  return (
                    <div key={idx} className="flex items-center justify-between bg-secondary/50 rounded p-2">
                      <div className="flex items-center gap-2 text-sm">
                        {student && (
                          <Badge variant="outline" className="gap-1">
                            <User className="w-3 h-3" />
                            {student.name}
                          </Badge>
                        )}
                        {behavior && (
                          <Badge variant="outline" className="gap-1">
                            <Target className="w-3 h-3" />
                            {behavior.name}
                          </Badge>
                        )}
                        <span className="font-medium">{override.lengthMinutes}m</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeSessionLengthOverride(override.studentId, override.behaviorId)}
                      >
                        ×
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add New Override */}
            <div className="border rounded-lg p-3 space-y-2 bg-secondary/30">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Student</Label>
                  <Select value={newOverrideStudentId} onValueChange={setNewOverrideStudentId}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedStudents.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Behavior (optional)</Label>
                  <Select 
                    value={newOverrideBehaviorId || "all"} 
                    onValueChange={(v) => setNewOverrideBehaviorId(v === "all" ? "" : v)}
                    disabled={!newOverrideStudentId}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All behaviors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All behaviors</SelectItem>
                      {selectedStudentForOverride?.behaviors.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={newOverrideMinutes}
                  onChange={(e) => setNewOverrideMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 h-8"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">minutes</span>
                <Button 
                  size="sm" 
                  onClick={handleAddOverride}
                  disabled={!newOverrideStudentId}
                  className="ml-auto"
                >
                  Add Override
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
