import { useState } from 'react';
import { 
  ThumbsUp, ThumbsDown, Minus, MessageSquare, Plus, Activity,
  User, Clock, Check, X, Settings2, PlusCircle
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
import { format } from 'date-fns';

interface TeacherFriendlyViewProps {
  student: Student;
}

type DayRating = 'good' | 'ok' | 'hard' | null;

export function TeacherFriendlyView({ student }: TeacherFriendlyViewProps) {
  const { toast } = useToast();
  const { 
    incrementFrequency, 
    getFrequencyCount, 
    addABCEntry,
    addBehaviorWithMethods,
    addCustomAntecedent,
    addCustomConsequence,
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

  const handleSaveDay = () => {
    toast({
      title: 'Day Summary Saved',
      description: `${format(new Date(), 'MMM d')}: ${dayRating || 'No rating'} day`,
    });
    setComments('');
    setDayRating(null);
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
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {student.behaviors.slice(0, 6).map((behavior) => {
              const count = getFrequencyCount(student.id, behavior.id);
              return (
                <Button
                  key={behavior.id}
                  variant="outline"
                  className="h-16 flex-col gap-1 relative"
                  onClick={() => handleBehaviorTap(behavior.id)}
                >
                  <span className="text-sm font-medium truncate max-w-full">{behavior.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {count}
                  </Badge>
                </Button>
              );
            })}
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

      {/* Save Button */}
      <Button 
        className="w-full h-14 text-lg" 
        onClick={handleSaveDay}
        disabled={!dayRating && !comments.trim()}
      >
        <Check className="w-5 h-5 mr-2" />
        Save Day Summary
      </Button>

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
    </div>
  );
}