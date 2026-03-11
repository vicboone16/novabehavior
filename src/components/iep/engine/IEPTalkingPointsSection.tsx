import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, GripVertical, MessageSquare } from 'lucide-react';

interface Props {
  talkingPoints: any[];
  meetingSessionId: string;
  onAdd: (category: string, text: string) => void;
}

const CATEGORIES = ['strengths', 'concerns', 'goals', 'behavior', 'supports', 'services', 'parent_friendly'];
const CAT_COLORS: Record<string, string> = {
  strengths: 'bg-success/10 text-success border-success/30',
  concerns: 'bg-warning/10 text-warning border-warning/30',
  goals: 'bg-primary/10 text-primary border-primary/30',
  behavior: 'bg-destructive/10 text-destructive border-destructive/30',
  supports: 'bg-accent/10 text-accent border-accent/30',
  services: 'bg-secondary text-secondary-foreground',
  parent_friendly: 'bg-info/10 text-info border-info/30',
};

export function IEPTalkingPointsSection({ talkingPoints, meetingSessionId, onAdd }: Props) {
  const [newText, setNewText] = useState('');
  const [newCat, setNewCat] = useState('strengths');
  const [showForm, setShowForm] = useState(false);

  const grouped: Record<string, any[]> = {};
  talkingPoints.forEach(tp => {
    const cat = tp.point_category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(tp);
  });

  const handleAdd = () => {
    if (!newText.trim()) return;
    onAdd(newCat, newText.trim());
    setNewText('');
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {talkingPoints.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No talking points yet. Seed defaults or add your own.
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, points]) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={`text-[10px] ${CAT_COLORS[cat] || ''}`}>
                {cat.replace(/_/g, ' ')}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{points.length} points</span>
            </div>
            <div className="space-y-1.5">
              {points.map(tp => (
                <Card key={tp.id} className="hover:border-primary/20 transition-colors">
                  <CardContent className="p-2.5 flex items-start gap-2">
                    <GripVertical className="w-3 h-3 text-muted-foreground/40 mt-0.5 shrink-0" />
                    <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-[11px] text-foreground">{tp.point_text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add Point */}
      {showForm ? (
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex gap-2">
              <Select value={newCat} onValueChange={setNewCat}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c} className="text-xs">{c.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={newText} onChange={e => setNewText(e.target.value)} placeholder="Type talking point..." className="h-8 text-xs flex-1" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!newText.trim()}>Add</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowForm(true)}>
          <Plus className="w-3 h-3" /> Add Talking Point
        </Button>
      )}
    </div>
  );
}
