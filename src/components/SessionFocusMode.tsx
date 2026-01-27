import { useState } from 'react';
import { Focus, Check, X, ChevronDown, Eye, EyeOff, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataStore } from '@/store/dataStore';
import { DataCollectionMethod, METHOD_LABELS } from '@/types/behavior';

const ALL_METHODS: DataCollectionMethod[] = ['frequency', 'duration', 'interval', 'abc'];

export function SessionFocusMode() {
  const { 
    students, 
    selectedStudentIds,
    sessionFocus,
    setSessionFocusEnabled,
    toggleSessionBehavior,
    isSessionBehaviorActive,
    setSessionBehaviorMethods,
    getSessionBehaviorMethods,
    activateAllBehaviors,
    deactivateAllBehaviors,
  } = useDataStore();

  const [open, setOpen] = useState(false);
  const [expandedStudents, setExpandedStudents] = useState<string[]>([]);

  const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));

  const toggleStudentExpanded = (studentId: string) => {
    setExpandedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleMethodForBehavior = (studentId: string, behaviorId: string, method: DataCollectionMethod) => {
    const currentMethods = getSessionBehaviorMethods(studentId, behaviorId);
    const newMethods = currentMethods.includes(method)
      ? currentMethods.filter(m => m !== method)
      : [...currentMethods, method];
    
    if (newMethods.length > 0) {
      setSessionBehaviorMethods(studentId, behaviorId, newMethods);
    }
  };

  const getActiveCount = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return { active: 0, total: 0 };
    const active = student.behaviors.filter(b => isSessionBehaviorActive(studentId, b.id)).length;
    return { active, total: student.behaviors.length };
  };

  const getTotalActiveCount = () => {
    let active = 0;
    let total = 0;
    selectedStudents.forEach(s => {
      const counts = getActiveCount(s.id);
      active += counts.active;
      total += counts.total;
    });
    return { active, total };
  };

  const getMethodColor = (method: DataCollectionMethod) => {
    switch (method) {
      case 'frequency': return 'bg-info text-info-foreground';
      case 'duration': return 'bg-warning text-warning-foreground';
      case 'interval': return 'bg-accent text-accent-foreground';
      case 'abc': return 'bg-antecedent text-antecedent-foreground';
      default: return 'bg-secondary';
    }
  };

  const totalCounts = getTotalActiveCount();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={sessionFocus.enabled ? "default" : "outline"} 
          size="sm" 
          className="gap-2"
        >
          <Focus className="w-4 h-4" />
          Focus Mode
          {sessionFocus.enabled && (
            <Badge variant="secondary" className="ml-1 bg-background/20 text-xs">
              {totalCounts.active}/{totalCounts.total}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Focus className="w-5 h-5 text-primary" />
            Session Focus Mode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between bg-secondary/30 rounded-lg p-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Enable Focus Mode</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, only selected behaviors will be shown during the session
              </p>
            </div>
            <Switch
              checked={sessionFocus.enabled}
              onCheckedChange={setSessionFocusEnabled}
            />
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={activateAllBehaviors} className="flex-1">
              <Eye className="w-4 h-4 mr-1" />
              Show All
            </Button>
            <Button variant="outline" size="sm" onClick={deactivateAllBehaviors} className="flex-1">
              <EyeOff className="w-4 h-4 mr-1" />
              Hide All
            </Button>
          </div>

          {/* Behavior Selection by Student */}
          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-4">
              {selectedStudents.map(student => {
                const counts = getActiveCount(student.id);
                const isExpanded = expandedStudents.includes(student.id);
                
                return (
                  <Collapsible key={student.id} open={isExpanded}>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <button
                          onClick={() => toggleStudentExpanded(student.id)}
                          className="w-full flex items-center justify-between p-3 bg-secondary/20 hover:bg-secondary/40 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: student.color }}
                            />
                            <span className="font-medium">{student.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {counts.active}/{counts.total} active
                            </Badge>
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="p-3 space-y-2 border-t border-border">
                          {student.behaviors.map(behavior => {
                            const isActive = isSessionBehaviorActive(student.id, behavior.id);
                            const activeMethods = getSessionBehaviorMethods(student.id, behavior.id);
                            const availableMethods = behavior.methods || [behavior.type];
                            
                            return (
                              <div 
                                key={behavior.id}
                                className={`rounded-lg p-3 transition-colors ${
                                  isActive ? 'bg-secondary/30' : 'bg-muted/30 opacity-60'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={isActive}
                                      onCheckedChange={() => toggleSessionBehavior(student.id, behavior.id)}
                                    />
                                    <Label className="font-medium text-sm cursor-pointer">
                                      {behavior.name}
                                    </Label>
                                  </div>
                                  {!isActive && (
                                    <Badge variant="outline" className="text-xs text-muted-foreground">
                                      Hidden
                                    </Badge>
                                  )}
                                </div>
                                
                                {isActive && (
                                  <div className="flex flex-wrap gap-1.5 ml-6">
                                    <span className="text-xs text-muted-foreground mr-1">Methods:</span>
                                    {availableMethods.map(method => {
                                      const isMethodActive = activeMethods.includes(method);
                                      return (
                                        <button
                                          key={method}
                                          onClick={() => toggleMethodForBehavior(student.id, behavior.id, method)}
                                          className={`
                                            px-2 py-0.5 text-xs rounded transition-all
                                            ${isMethodActive 
                                              ? getMethodColor(method)
                                              : 'bg-muted text-muted-foreground line-through'}
                                          `}
                                        >
                                          {METHOD_LABELS[method]}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {student.behaviors.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              No behaviors configured
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}

              {selectedStudents.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Select students first to configure focus mode
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Summary */}
          {sessionFocus.enabled && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2">
                <Focus className="w-4 h-4 text-primary" />
                <span className="font-medium">Focus Mode Active</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Showing {totalCounts.active} of {totalCounts.total} behaviors. 
                Hidden behaviors won't appear in student cards during this session.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
