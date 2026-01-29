import { useState } from 'react';
import { 
  ThumbsUp, ThumbsDown, Minus, MessageSquare, Plus,
  User, Clock, Check, X, Settings2, PlusCircle, Save, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useDataStore } from '@/store/dataStore';
import { Student, ANTECEDENT_OPTIONS, CONSEQUENCE_OPTIONS } from '@/types/behavior';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface TeacherFriendlyViewProps {
  student: Student;
}

type DayRating = 'good' | 'ok' | 'hard' | null;

interface RecordedEntry {
  behaviorId: string;
  behaviorName: string;
  count: number;
  durationSeconds?: number;
  timestamp: Date;
}

export function TeacherFriendlyView({ student }: TeacherFriendlyViewProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    incrementFrequency, 
    getFrequencyCount, 
    addABCEntry,
    addBehaviorWithMethods,
    addCustomAntecedent,
    addCustomConsequence,
    addHistoricalFrequency,
    addHistoricalDuration,
  } = useDataStore();

  const [dayRating, setDayRating] = useState<DayRating>(null);
  const [comments, setComments] = useState('');
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  const [selectedAntecedent, setSelectedAntecedent] = useState<string | null>(null);
  const [selectedConsequence, setSelectedConsequence] = useState<string | null>(null);
  const [showABCQuick, setShowABCQuick] = useState(false);
  const [showAddBehavior, setShowAddBehavior] = useState(false);
  const [newBehaviorName, setNewBehaviorName] = useState('');
  const [showAddAntecedent, setShowAddAntecedent] = useState(false);
  const [showAddConsequence, setShowAddConsequence] = useState(false);
  const [newAntecedent, setNewAntecedent] = useState('');
  const [newConsequence, setNewConsequence] = useState('');
  
  // Pre-selected behaviors for Quick ABC (up to 3)
  const [preselectedBehaviorIds, setPreselectedBehaviorIds] = useState<string[]>([]);
  const [showBehaviorSettings, setShowBehaviorSettings] = useState(false);
  
  // Duration entry state
  const [showDurationEntry, setShowDurationEntry] = useState(false);
  const [selectedDurationBehavior, setSelectedDurationBehavior] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  
  // Record Now tracking
  const [recordedEntries, setRecordedEntries] = useState<RecordedEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const allAntecedents = [...ANTECEDENT_OPTIONS, ...(student.customAntecedents || [])];
  const allConsequences = [...CONSEQUENCE_OPTIONS, ...(student.customConsequences || [])];
  
  // Get preselected behaviors or default to first 3
  const quickABCBehaviors = preselectedBehaviorIds.length > 0 
    ? student.behaviors.filter(b => preselectedBehaviorIds.includes(b.id))
    : student.behaviors.slice(0, 3);

  const handleBehaviorTap = (behaviorId: string) => {
    incrementFrequency(student.id, behaviorId);
    toast({
      title: 'Recorded',
      description: 'Behavior count increased',
    });
  };

  const toggleBehaviorSelection = (behaviorId: string) => {
    setSelectedBehaviors(prev => {
      if (prev.includes(behaviorId)) {
        return prev.filter(id => id !== behaviorId);
      }
      if (prev.length >= 3) {
        toast({
          title: 'Maximum 3 behaviors',
          description: 'You can only select up to 3 behaviors at once',
          variant: 'destructive',
        });
        return prev;
      }
      return [...prev, behaviorId];
    });
  };

  const togglePreselectedBehavior = (behaviorId: string) => {
    setPreselectedBehaviorIds(prev => {
      if (prev.includes(behaviorId)) {
        return prev.filter(id => id !== behaviorId);
      }
      if (prev.length >= 3) {
        toast({
          title: 'Maximum 3 behaviors',
          description: 'You can only preselect up to 3 behaviors',
          variant: 'destructive',
        });
        return prev;
      }
      return [...prev, behaviorId];
    });
  };

  const handleQuickABC = () => {
    if (selectedBehaviors.length === 0 || !selectedAntecedent || !selectedConsequence) {
      toast({
        title: 'Missing info',
        description: 'Please select at least one behavior, antecedent, and consequence',
        variant: 'destructive',
      });
      return;
    }

    // Record ABC for each selected behavior
    selectedBehaviors.forEach(behaviorId => {
      const behavior = student.behaviors.find(b => b.id === behaviorId);
      if (!behavior) return;

      addABCEntry({
        studentId: student.id,
        behaviorId: behaviorId,
        antecedent: selectedAntecedent,
        behavior: behavior.name,
        consequence: selectedConsequence,
        frequencyCount: 1,
      });
    });

    toast({ 
      title: 'ABC Recorded', 
      description: `${selectedBehaviors.length} behavior(s) saved successfully` 
    });
    setSelectedBehaviors([]);
    setSelectedAntecedent(null);
    setSelectedConsequence(null);
    setShowABCQuick(false);
  };

  const handleAddBehavior = () => {
    if (!newBehaviorName.trim()) return;
    
    addBehaviorWithMethods(student.id, newBehaviorName.trim(), ['frequency', 'abc']);
    toast({
      title: 'Behavior Added',
      description: `"${newBehaviorName}" has been added`,
    });
    setNewBehaviorName('');
    setShowAddBehavior(false);
  };

  const handleAddNewAntecedent = () => {
    if (!newAntecedent.trim()) return;
    addCustomAntecedent(student.id, newAntecedent.trim());
    setSelectedAntecedent(newAntecedent.trim());
    setNewAntecedent('');
    setShowAddAntecedent(false);
    toast({ title: 'Antecedent Added' });
  };

  const handleAddNewConsequence = () => {
    if (!newConsequence.trim()) return;
    addCustomConsequence(student.id, newConsequence.trim());
    setSelectedConsequence(newConsequence.trim());
    setNewConsequence('');
    setShowAddConsequence(false);
    toast({ title: 'Consequence Added' });
  };

  const handleSaveDay = async () => {
    if (!user) return;
    
    try {
      // Upsert to daily_summaries
      const { error } = await supabase
        .from('daily_summaries')
        .upsert({
          student_id: student.id,
          user_id: user.id,
          summary_date: format(new Date(), 'yyyy-MM-dd'),
          day_rating: dayRating,
          comments: comments.trim() || null,
        }, {
          onConflict: 'student_id,user_id,summary_date'
        });
      
      if (error) throw error;
      
      toast({
        title: 'Day Summary Saved',
        description: `${format(new Date(), 'MMM d')}: ${dayRating || 'No rating'} day`,
      });
      setComments('');
      setDayRating(null);
    } catch (error) {
      console.error('Error saving day summary:', error);
      toast({
        title: 'Error saving summary',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  // Record Now - save current behavior data immediately with timestamp
  const handleRecordNow = async () => {
    setIsRecording(true);
    const now = new Date();
    const entries: RecordedEntry[] = [];
    
    try {
      // Record frequency data for each behavior
      for (const behavior of student.behaviors) {
        const count = getFrequencyCount(student.id, behavior.id);
        if (count > 0) {
          // Add to historical frequency with timestamp
          addHistoricalFrequency({
            studentId: student.id,
            behaviorId: behavior.id,
            count,
            timestamp: now,
          });
          
          entries.push({
            behaviorId: behavior.id,
            behaviorName: behavior.name,
            count,
            timestamp: now,
          });
        }
      }
      
      setRecordedEntries(prev => [...entries, ...prev]);
      
      toast({
        title: 'Data Recorded',
        description: `${entries.length} behavior(s) saved at ${format(now, 'h:mm a')}`,
      });
    } catch (error) {
      console.error('Error recording data:', error);
      toast({
        title: 'Error recording',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsRecording(false);
    }
  };

  // Handle duration entry
  const handleOpenDurationEntry = (behaviorId: string) => {
    setSelectedDurationBehavior(behaviorId);
    setDurationMinutes('');
    setDurationSeconds('');
    setShowDurationEntry(true);
  };

  const handleSaveDuration = () => {
    if (!selectedDurationBehavior) return;
    
    const mins = parseInt(durationMinutes) || 0;
    const secs = parseInt(durationSeconds) || 0;
    const totalSeconds = mins * 60 + secs;
    
    if (totalSeconds <= 0) {
      toast({
        title: 'Invalid duration',
        description: 'Please enter a duration greater than 0',
        variant: 'destructive',
      });
      return;
    }
    
    const behavior = student.behaviors.find(b => b.id === selectedDurationBehavior);
    const now = new Date();
    
    // Add historical duration
    addHistoricalDuration({
      studentId: student.id,
      behaviorId: selectedDurationBehavior,
      durationSeconds: totalSeconds,
      timestamp: now,
    });
    
    setRecordedEntries(prev => [{
      behaviorId: selectedDurationBehavior,
      behaviorName: behavior?.name || 'Unknown',
      count: 0,
      durationSeconds: totalSeconds,
      timestamp: now,
    }, ...prev]);
    
    toast({
      title: 'Duration Recorded',
      description: `${behavior?.name}: ${mins}m ${secs}s at ${format(now, 'h:mm a')}`,
    });
    
    setShowDurationEntry(false);
    setSelectedDurationBehavior(null);
    setDurationMinutes('');
    setDurationSeconds('');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getDayRatingColor = (rating: DayRating) => {
    switch (rating) {
      case 'good': return 'bg-green-500 hover:bg-green-600 text-white';
      case 'ok': return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      case 'hard': return 'bg-red-500 hover:bg-red-600 text-white';
      default: return '';
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Student Header */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${student.color}20` }}
            >
              <User className="w-6 h-6" style={{ color: student.color }} />
            </div>
            <div>
              <h2 className="text-lg font-bold">{student.name}</h2>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Rating - Large Touch Targets */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-center">How was today?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={dayRating === 'good' ? 'default' : 'outline'}
              className={`h-20 flex-col gap-1 ${dayRating === 'good' ? getDayRatingColor('good') : ''}`}
              onClick={() => setDayRating('good')}
            >
              <ThumbsUp className="w-8 h-8" />
              <span className="text-xs">Good Day</span>
            </Button>
            <Button
              variant={dayRating === 'ok' ? 'default' : 'outline'}
              className={`h-20 flex-col gap-1 ${dayRating === 'ok' ? getDayRatingColor('ok') : ''}`}
              onClick={() => setDayRating('ok')}
            >
              <Minus className="w-8 h-8" />
              <span className="text-xs">OK Day</span>
            </Button>
            <Button
              variant={dayRating === 'hard' ? 'default' : 'outline'}
              className={`h-20 flex-col gap-1 ${dayRating === 'hard' ? getDayRatingColor('hard') : ''}`}
              onClick={() => setDayRating('hard')}
            >
              <ThumbsDown className="w-8 h-8" />
              <span className="text-xs">Hard Day</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Frequency Taps - Big Buttons */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Quick Behavior Counts</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddBehavior(true)}
            >
              <PlusCircle className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {student.behaviors.slice(0, 6).map((behavior) => {
              const count = getFrequencyCount(student.id, behavior.id);
              const supportsDuration = behavior.methods?.includes('duration');
              return (
                <div key={behavior.id} className="relative">
                  <Button
                    variant="outline"
                    className="w-full h-16 flex-col gap-1"
                    onClick={() => handleBehaviorTap(behavior.id)}
                  >
                    <span className="text-sm font-medium truncate max-w-full">{behavior.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </Button>
                  {supportsDuration && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute -top-1 -right-1 h-6 w-6 p-0 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDurationEntry(behavior.id);
                      }}
                      title="Add duration"
                    >
                      <Timer className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Duration Entry Section */}
          <div className="pt-2 border-t">
            <p className="text-xs font-medium mb-2 flex items-center gap-1">
              <Timer className="w-3 h-3" />
              Record Duration
            </p>
            <div className="flex flex-wrap gap-1">
              {student.behaviors.slice(0, 6).map((behavior) => (
                <Badge
                  key={behavior.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => handleOpenDurationEntry(behavior.id)}
                >
                  {behavior.name}
                </Badge>
              ))}
            </div>
          </div>
          
          {student.behaviors.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">
                No behaviors configured
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddBehavior(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Behavior
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick ABC Entry */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Quick ABC</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBehaviorSettings(true)}
                title="Configure preselected behaviors"
              >
                <Settings2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowABCQuick(!showABCQuick)}
              >
                {showABCQuick ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        {showABCQuick && (
          <CardContent className="space-y-3">
            {/* Behavior Selection - Multi-select up to 3 */}
            <div>
              <p className="text-xs font-medium mb-2">
                Behavior(s) <span className="text-muted-foreground">(select up to 3)</span>
              </p>
              <div className="flex flex-wrap gap-1">
                {quickABCBehaviors.map((b) => (
                  <Badge
                    key={b.id}
                    variant={selectedBehaviors.includes(b.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleBehaviorSelection(b.id)}
                  >
                    {b.name}
                    {selectedBehaviors.includes(b.id) && <Check className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
              {selectedBehaviors.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedBehaviors.length} selected
                </p>
              )}
            </div>

            {/* Antecedent Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium">What happened before?</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowAddAntecedent(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {allAntecedents.map((a, idx) => (
                  <Badge
                    key={`${a}-${idx}`}
                    variant={selectedAntecedent === a ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => setSelectedAntecedent(a)}
                  >
                    {a}
                    {(student.customAntecedents || []).includes(a) && ' ★'}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Consequence Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium">What happened after?</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowAddConsequence(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {allConsequences.map((c, idx) => (
                  <Badge
                    key={`${c}-${idx}`}
                    variant={selectedConsequence === c ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => setSelectedConsequence(c)}
                  >
                    {c}
                    {(student.customConsequences || []).includes(c) && ' ★'}
                  </Badge>
                ))}
              </div>
            </div>

            <Button 
              className="w-full" 
              size="sm"
              onClick={handleQuickABC}
              disabled={selectedBehaviors.length === 0 || !selectedAntecedent || !selectedConsequence}
            >
              <Check className="w-4 h-4 mr-1" />
              Save ABC ({selectedBehaviors.length} behavior{selectedBehaviors.length !== 1 ? 's' : ''})
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any notes about today..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="text-base"
          />
        </CardContent>
      </Card>

      {/* Recently Recorded Entries */}
      {recordedEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recently Recorded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {recordedEntries.slice(0, 5).map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1">
                  <span className="font-medium truncate flex-1">{entry.behaviorName}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {entry.durationSeconds ? (
                      <span>{formatDuration(entry.durationSeconds)}</span>
                    ) : (
                      <span>×{entry.count}</span>
                    )}
                    <span className="text-xs">{format(entry.timestamp, 'h:mm a')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline"
          className="h-14 text-base" 
          onClick={handleRecordNow}
          disabled={isRecording || student.behaviors.every(b => getFrequencyCount(student.id, b.id) === 0)}
        >
          <Save className="w-5 h-5 mr-2" />
          Record Now
        </Button>
        <Button 
          className="h-14 text-base" 
          onClick={handleSaveDay}
          disabled={!dayRating && !comments.trim()}
        >
          <Check className="w-5 h-5 mr-2" />
          Save Day
        </Button>
      </div>

      {/* Add Behavior Dialog */}
      <Dialog open={showAddBehavior} onOpenChange={setShowAddBehavior}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Add New Behavior</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Behavior Name</Label>
              <Input
                value={newBehaviorName}
                onChange={(e) => setNewBehaviorName(e.target.value)}
                placeholder="Enter behavior name..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddBehavior()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBehavior(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBehavior} disabled={!newBehaviorName.trim()}>
              Add Behavior
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Antecedent Dialog */}
      <Dialog open={showAddAntecedent} onOpenChange={setShowAddAntecedent}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Add Custom Antecedent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Antecedent</Label>
              <Input
                value={newAntecedent}
                onChange={(e) => setNewAntecedent(e.target.value)}
                placeholder="What happened before..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewAntecedent()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAntecedent(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNewAntecedent} disabled={!newAntecedent.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Consequence Dialog */}
      <Dialog open={showAddConsequence} onOpenChange={setShowAddConsequence}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Add Custom Consequence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Consequence</Label>
              <Input
                value={newConsequence}
                onChange={(e) => setNewConsequence(e.target.value)}
                placeholder="What happened after..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewConsequence()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddConsequence(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNewConsequence} disabled={!newConsequence.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Behavior Settings Dialog */}
      <Dialog open={showBehaviorSettings} onOpenChange={setShowBehaviorSettings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Quick ABC Behaviors</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select up to 3 behaviors to show in Quick ABC. If none selected, first 3 behaviors will be shown.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {student.behaviors.map((b) => (
                <div key={b.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`preset-${b.id}`}
                    checked={preselectedBehaviorIds.includes(b.id)}
                    onCheckedChange={() => togglePreselectedBehavior(b.id)}
                    disabled={!preselectedBehaviorIds.includes(b.id) && preselectedBehaviorIds.length >= 3}
                  />
                  <Label 
                    htmlFor={`preset-${b.id}`} 
                    className="text-sm cursor-pointer flex-1"
                  >
                    {b.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreselectedBehaviorIds([])}>
              Reset
            </Button>
            <Button onClick={() => setShowBehaviorSettings(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duration Entry Dialog */}
      <Dialog open={showDurationEntry} onOpenChange={setShowDurationEntry}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Record Duration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedDurationBehavior && 
                student.behaviors.find(b => b.id === selectedDurationBehavior)?.name
              }
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Minutes</Label>
                <Input
                  type="number"
                  min="0"
                  max="999"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="0"
                  className="text-center text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label>Seconds</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                  placeholder="0"
                  className="text-center text-lg"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Recorded at {format(new Date(), 'h:mm a')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDurationEntry(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDuration}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}