import { useState, useEffect } from 'react';
import { Plus, Copy, Archive, Edit, Eye, MoreHorizontal, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useBehaviorLab } from '@/hooks/useBehaviorLab';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { DIFFICULTY_LEVELS, STAGES, SKILL_TAG_OPTIONS, DIFFICULTY_COLORS, STAGE_LABELS } from '@/types/behaviorLab';
import type { GameContent } from '@/types/behaviorLab';
import { toast } from 'sonner';

const SKILL_TAG_LABELS: Record<string, string> = {
  function_identification: 'Function ID',
  reinforcement_concepts: 'Reinforcement',
  replacement_skills: 'Replacement Skills',
  consequence_analysis: 'Consequences',
  antecedent_strategies: 'Antecedents',
  data_interpretation: 'Data Reading',
};

export function BehaviorLabAdmin() {
  const { games, loading, fetchAllGames, createGame, updateGame, duplicateGame } = useBehaviorLab();
  const { currentAgency } = useAgencyContext();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [stage, setStage] = useState('identify');
  const [estSeconds, setEstSeconds] = useState('120');
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [scope, setScope] = useState('system');
  const [contentJson, setContentJson] = useState('{\n  "scenarios": [],\n  "questions": []\n}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllGames();
  }, [fetchAllGames]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDifficulty('beginner');
    setStage('identify');
    setEstSeconds('120');
    setSkillTags([]);
    setScope('system');
    setContentJson('{\n  "scenarios": [],\n  "questions": []\n}');
    setJsonError(null);
  };

  const openEdit = (gameId: string) => {
    const game = games.find(g => g.game_id === gameId);
    if (!game) return;
    setTitle(game.title);
    setDescription(game.description || '');
    setDifficulty(game.difficulty);
    setStage(game.stage);
    setEstSeconds(String(game.est_seconds));
    setSkillTags(game.skill_tags);
    setScope(game.scope);
    try {
      setContentJson(JSON.stringify(game.content, null, 2));
    } catch {
      setContentJson('{}');
    }
    setJsonError(null);
    setShowEdit(gameId);
  };

  const validateJson = (json: string): GameContent | null => {
    try {
      const parsed = JSON.parse(json);
      setJsonError(null);
      return parsed;
    } catch (e: any) {
      setJsonError(e.message);
      return null;
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) { toast.error('Title required'); return; }
    const content = validateJson(contentJson);
    if (!content) return;

    await createGame({
      title,
      description: description || null,
      difficulty,
      stage,
      est_seconds: parseInt(estSeconds) || 120,
      skill_tags: skillTags,
      scope,
      agency_id: scope === 'agency' ? currentAgency?.id || null : null,
      status: 'draft',
      content,
    });

    setShowCreate(false);
    resetForm();
    fetchAllGames();
  };

  const handleUpdate = async () => {
    if (!showEdit || !title.trim()) return;
    const content = validateJson(contentJson);
    if (!content) return;

    await updateGame(showEdit, {
      title,
      description: description || null,
      difficulty,
      stage,
      est_seconds: parseInt(estSeconds) || 120,
      skill_tags: skillTags,
      scope,
      agency_id: scope === 'agency' ? currentAgency?.id || null : null,
      content,
    });

    setShowEdit(null);
    resetForm();
    fetchAllGames();
  };

  const handleArchive = async (gameId: string) => {
    await updateGame(gameId, { status: 'archived' });
    fetchAllGames();
  };

  const handleActivate = async (gameId: string) => {
    await updateGame(gameId, { status: 'active' });
    fetchAllGames();
  };

  const handleDuplicate = async (gameId: string) => {
    await duplicateGame(gameId, currentAgency?.id);
    fetchAllGames();
  };

  const filtered = games.filter(g =>
    !search || g.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleTag = (tag: string) => {
    setSkillTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-foreground">Behavior Lab Games</h3>
          <p className="text-sm text-muted-foreground">Manage practice activities for clinical reasoning</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreate(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> New Game
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search games…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No games found</TableCell></TableRow>
              ) : (
                filtered.map(game => (
                  <TableRow key={game.game_id}>
                    <TableCell className="font-medium">{game.title}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[game.difficulty] || ''}`}>
                        {game.difficulty}
                      </span>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{STAGE_LABELS[game.stage] || game.stage}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{game.scope}</TableCell>
                    <TableCell>{(game.content as any)?.questions?.length || 0}</TableCell>
                    <TableCell>
                      <Badge variant={game.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {game.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(game.game_id)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(game.game_id)}>
                            <Copy className="w-4 h-4 mr-2" /> Duplicate to Agency
                          </DropdownMenuItem>
                          {game.status === 'active' ? (
                            <DropdownMenuItem onClick={() => handleArchive(game.game_id)}>
                              <Archive className="w-4 h-4 mr-2" /> Archive
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleActivate(game.game_id)}>
                              <Eye className="w-4 h-4 mr-2" /> Activate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate || !!showEdit} onOpenChange={(open) => { if (!open) { setShowCreate(false); setShowEdit(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showEdit ? 'Edit Game' : 'Create Game'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Game title" /></div>
            <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stage</Label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Est. Seconds</Label>
                <Input type="number" value={estSeconds} onChange={e => setEstSeconds(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Scope</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System (Global)</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Skill Tags</Label>
              <div className="flex flex-wrap gap-2">
                {SKILL_TAG_OPTIONS.map(tag => (
                  <Badge
                    key={tag}
                    variant={skillTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {SKILL_TAG_LABELS[tag] || tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>Content JSON</Label>
              <Textarea
                value={contentJson}
                onChange={e => { setContentJson(e.target.value); validateJson(e.target.value); }}
                rows={12}
                className="font-mono text-xs"
                placeholder='{"scenarios": [], "questions": []}'
              />
              {jsonError && <p className="text-xs text-destructive mt-1">Invalid JSON: {jsonError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setShowEdit(null); resetForm(); }}>Cancel</Button>
            <Button onClick={showEdit ? handleUpdate : handleCreate}>
              {showEdit ? 'Save Changes' : 'Create Game'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
