import { useState, useMemo, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Edit3, ArrowRightLeft, Plus, Filter,
  Target, Shield, BookOpen, Zap, FileText, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useNovaRecommendations,
  useGenerateNovaRecommendations,
  useUpdateNovaRecommendation,
  useAddCustomRecommendation,
  NovaGeneratedRecommendation,
} from '@/hooks/useNovaAssessments';

interface Props {
  sessionId: string;
  studentId: string;
  assessmentCode: string;
  settingType?: string;
}

const TYPE_ICONS: Record<string, any> = {
  iep_goal: Target,
  aba_goal: Shield,
  objective: BookOpen,
  bip_strategy: Zap,
  accommodation: FileText,
  reinforcement: CheckCircle2,
  teaching_strategy: BookOpen,
};

const TYPE_LABELS: Record<string, string> = {
  iep_goal: 'IEP Goal',
  aba_goal: 'ABA Goal',
  objective: 'Objective',
  bip_strategy: 'BIP Strategy',
  accommodation: 'Accommodation',
  reinforcement: 'Reinforcement',
  teaching_strategy: 'Teaching Strategy',
};

const STATUS_COLORS: Record<string, string> = {
  suggested: 'bg-muted text-muted-foreground',
  accepted: 'bg-primary/10 text-primary',
  edited: 'bg-accent/50 text-accent-foreground',
  rejected: 'bg-destructive/10 text-destructive',
  replaced: 'bg-muted text-muted-foreground line-through',
  manual: 'bg-primary/10 text-primary',
};

export function NovaRecommendationPanel({ sessionId, studentId, assessmentCode, settingType = 'school' }: Props) {
  const { data: recommendations, isLoading } = useNovaRecommendations(sessionId);
  const generateRecs = useGenerateNovaRecommendations();
  const updateRec = useUpdateNovaRecommendation();
  const addCustom = useAddCustomRecommendation();

  const [filter, setFilter] = useState<string>('all');
  const [editingRec, setEditingRec] = useState<NovaGeneratedRecommendation | null>(null);
  const [editText, setEditText] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newRec, setNewRec] = useState({ title: '', text: '', type: 'aba_goal', setting: settingType });

  const filtered = useMemo(() => {
    if (!recommendations) return [];
    if (filter === 'all') return recommendations;
    if (filter === 'accepted') return recommendations.filter(r => ['accepted', 'edited', 'manual'].includes(r.status));
    if (filter === 'needs_review') return recommendations.filter(r => r.status === 'suggested');
    return recommendations.filter(r => r.recommendation_type === filter);
  }, [recommendations, filter]);

  const handleGenerate = useCallback(() => {
    generateRecs.mutate({ sessionId, settingType });
  }, [generateRecs, sessionId, settingType]);

  const handleAccept = useCallback((rec: NovaGeneratedRecommendation) => {
    updateRec.mutate({ id: rec.id, sessionId, updates: { status: 'accepted' } });
  }, [updateRec, sessionId]);

  const handleReject = useCallback((rec: NovaGeneratedRecommendation) => {
    updateRec.mutate({ id: rec.id, sessionId, updates: { status: 'rejected' } });
  }, [updateRec, sessionId]);

  const handleStartEdit = useCallback((rec: NovaGeneratedRecommendation) => {
    setEditingRec(rec);
    setEditText(rec.generated_text);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingRec) return;
    updateRec.mutate({
      id: editingRec.id,
      sessionId,
      updates: { generated_text: editText, status: 'edited' },
    });
    setEditingRec(null);
  }, [editingRec, editText, updateRec, sessionId]);

  const handleConvert = useCallback((rec: NovaGeneratedRecommendation, toType: string) => {
    updateRec.mutate({
      id: rec.id,
      sessionId,
      updates: {
        recommendation_type: toType,
        converted_from: rec.recommendation_type,
        status: rec.status === 'suggested' ? 'suggested' : rec.status,
      },
    });
  }, [updateRec, sessionId]);

  const handleAddCustom = useCallback(() => {
    addCustom.mutate({
      studentId,
      sessionId,
      assessmentCode,
      recommendationType: newRec.type,
      settingType: newRec.setting,
      title: newRec.title,
      text: newRec.text,
    });
    setAddDialogOpen(false);
    setNewRec({ title: '', text: '', type: 'aba_goal', setting: settingType });
  }, [addCustom, studentId, sessionId, assessmentCode, newRec, settingType]);

  const counts = useMemo(() => {
    if (!recommendations) return { total: 0, accepted: 0, suggested: 0 };
    return {
      total: recommendations.length,
      accepted: recommendations.filter(r => ['accepted', 'edited', 'manual'].includes(r.status)).length,
      suggested: recommendations.filter(r => r.status === 'suggested').length,
    };
  }, [recommendations]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />
              Recommendations
            </CardTitle>
            <CardDescription className="text-xs">
              {counts.accepted} accepted • {counts.suggested} pending review • {counts.total} total
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={handleGenerate}
              disabled={generateRecs.isPending}
            >
              {generateRecs.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
              Generate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Custom
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex gap-1 flex-wrap">
          {['all', 'accepted', 'needs_review', 'iep_goal', 'aba_goal', 'bip_strategy', 'accommodation'].map(f => (
            <Badge
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              className="text-[10px] cursor-pointer"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'needs_review' ? 'Needs Review' : TYPE_LABELS[f] || f.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>

        {/* Recommendation Cards */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No recommendations yet. Click Generate to create suggestions from assessment results.
          </p>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2 pr-2">
              {filtered.map(rec => {
                const Icon = TYPE_ICONS[rec.recommendation_type] || Target;
                return (
                  <div
                    key={rec.id}
                    className={`p-3 rounded-lg border space-y-2 ${
                      rec.status === 'rejected' ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">{rec.title}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge variant="outline" className="text-[10px]">
                          {TYPE_LABELS[rec.recommendation_type] || rec.recommendation_type}
                        </Badge>
                        <Badge className={`text-[10px] ${STATUS_COLORS[rec.status] || ''}`}>
                          {rec.status}
                        </Badge>
                      </div>
                    </div>

                    <p className={`text-xs leading-relaxed ${rec.status === 'replaced' ? 'line-through' : ''}`}>
                      {rec.generated_text}
                    </p>

                    {rec.rationale_text && (
                      <p className="text-[10px] text-muted-foreground italic">
                        Rationale: {rec.rationale_text}
                      </p>
                    )}

                    {rec.converted_from && (
                      <p className="text-[10px] text-muted-foreground">
                        Converted from: {TYPE_LABELS[rec.converted_from] || rec.converted_from}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-1 flex-wrap">
                      {rec.status === 'suggested' && (
                        <>
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleAccept(rec)}>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Accept
                          </Button>
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleReject(rec)}>
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {rec.status !== 'rejected' && (
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleStartEdit(rec)}>
                          <Edit3 className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      )}
                      {rec.recommendation_type === 'aba_goal' && rec.status !== 'rejected' && (
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleConvert(rec, 'iep_goal')}>
                          <ArrowRightLeft className="w-3 h-3 mr-1" /> → IEP
                        </Button>
                      )}
                      {rec.recommendation_type === 'iep_goal' && rec.status !== 'rejected' && (
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleConvert(rec, 'aba_goal')}>
                          <ArrowRightLeft className="w-3 h-3 mr-1" /> → ABA
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingRec} onOpenChange={open => !open && setEditingRec(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Recommendation</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={5}
            className="text-sm"
          />
          {editingRec?.original_text && editingRec.original_text !== editText && (
            <p className="text-[10px] text-muted-foreground">
              Original: {editingRec.original_text}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingRec(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Add Custom Recommendation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title"
              value={newRec.title}
              onChange={e => setNewRec(p => ({ ...p, title: e.target.value }))}
              className="text-sm"
            />
            <Textarea
              placeholder="Recommendation text..."
              value={newRec.text}
              onChange={e => setNewRec(p => ({ ...p, text: e.target.value }))}
              rows={4}
              className="text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={newRec.type} onValueChange={v => setNewRec(p => ({ ...p, type: v }))}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aba_goal">ABA Goal</SelectItem>
                  <SelectItem value="iep_goal">IEP Goal</SelectItem>
                  <SelectItem value="objective">Objective</SelectItem>
                  <SelectItem value="bip_strategy">BIP Strategy</SelectItem>
                  <SelectItem value="accommodation">Accommodation</SelectItem>
                  <SelectItem value="teaching_strategy">Teaching Strategy</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newRec.setting} onValueChange={v => setNewRec(p => ({ ...p, setting: v }))}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="aba">ABA</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddCustom} disabled={!newRec.title || !newRec.text}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
