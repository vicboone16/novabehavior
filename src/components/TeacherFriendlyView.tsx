import { useState } from 'react';
import { 
  ThumbsUp, ThumbsDown, Minus, MessageSquare, Plus, Activity,
  User, Clock, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  } = useDataStore();

  const [dayRating, setDayRating] = useState<DayRating>(null);
  const [comments, setComments] = useState('');
  const [selectedBehavior, setSelectedBehavior] = useState<string | null>(null);
  const [selectedAntecedent, setSelectedAntecedent] = useState<string | null>(null);
  const [selectedConsequence, setSelectedConsequence] = useState<string | null>(null);
  const [showABCQuick, setShowABCQuick] = useState(false);

  const allAntecedents = [...ANTECEDENT_OPTIONS.slice(0, 5), ...(student.customAntecedents || []).slice(0, 3)];
  const allConsequences = [...CONSEQUENCE_OPTIONS.slice(0, 5), ...(student.customConsequences || []).slice(0, 3)];

  const handleBehaviorTap = (behaviorId: string) => {
    incrementFrequency(student.id, behaviorId);
    toast({
      title: 'Recorded',
      description: 'Behavior count increased',
    });
  };

  const handleQuickABC = () => {
    if (!selectedBehavior || !selectedAntecedent || !selectedConsequence) {
      toast({
        title: 'Missing info',
        description: 'Please select behavior, antecedent, and consequence',
        variant: 'destructive',
      });
      return;
    }

    const behavior = student.behaviors.find(b => b.id === selectedBehavior);
    if (!behavior) return;

    addABCEntry({
      studentId: student.id,
      behaviorId: selectedBehavior,
      antecedent: selectedAntecedent,
      behavior: behavior.name,
      consequence: selectedConsequence,
      frequencyCount: 1,
    });

    toast({ title: 'ABC Recorded', description: 'Entry saved successfully' });
    setSelectedBehavior(null);
    setSelectedAntecedent(null);
    setSelectedConsequence(null);
    setShowABCQuick(false);
  };

  const handleSaveDay = () => {
    // In a real implementation, this would save to a daily summary
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
          <CardTitle className="text-base">Quick Behavior Counts</CardTitle>
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
            <p className="text-center text-sm text-muted-foreground py-4">
              No behaviors configured
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick ABC Entry */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Quick ABC</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowABCQuick(!showABCQuick)}
            >
              {showABCQuick ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
        {showABCQuick && (
          <CardContent className="space-y-3">
            {/* Behavior Selection */}
            <div>
              <p className="text-xs font-medium mb-2">Behavior</p>
              <div className="flex flex-wrap gap-1">
                {student.behaviors.slice(0, 4).map((b) => (
                  <Badge
                    key={b.id}
                    variant={selectedBehavior === b.id ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedBehavior(b.id)}
                  >
                    {b.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Antecedent Selection */}
            <div>
              <p className="text-xs font-medium mb-2">What happened before?</p>
              <div className="flex flex-wrap gap-1">
                {allAntecedents.map((a) => (
                  <Badge
                    key={a}
                    variant={selectedAntecedent === a ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => setSelectedAntecedent(a)}
                  >
                    {a}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Consequence Selection */}
            <div>
              <p className="text-xs font-medium mb-2">What happened after?</p>
              <div className="flex flex-wrap gap-1">
                {allConsequences.map((c) => (
                  <Badge
                    key={c}
                    variant={selectedConsequence === c ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => setSelectedConsequence(c)}
                  >
                    {c}
                  </Badge>
                ))}
              </div>
            </div>

            <Button 
              className="w-full" 
              size="sm"
              onClick={handleQuickABC}
              disabled={!selectedBehavior || !selectedAntecedent || !selectedConsequence}
            >
              <Check className="w-4 h-4 mr-1" />
              Save ABC
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
    </div>
  );
}
