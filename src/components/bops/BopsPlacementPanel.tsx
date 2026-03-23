import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle, ChevronDown, ChevronRight, CheckCircle2, MapPin,
  Shield, Zap, Brain, Eye, Loader2, Check
} from 'lucide-react';
import {
  useBopsPlacementPanel,
  useBopsCfiResults,
  useBopsCfiExplanations,
  useBopsCfiPrograms,
  useBopsPlacementMismatch,
  useBopsProfileResolution,
  useBopsLatestScores,
  useSelectPlacement,
  useAcceptPlacementAndPrograms,
} from '@/hooks/useBopsPlacement';

interface Props {
  studentId: string;
}

const FIT_COLORS: Record<string, string> = {
  HIGH: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
  MODERATE: 'bg-amber-500/15 text-amber-700 border-amber-300',
  LOW: 'bg-red-500/15 text-red-700 border-red-300',
};

const FIT_PROGRESS_COLORS: Record<string, string> = {
  HIGH: '[&>div]:bg-emerald-500',
  MODERATE: '[&>div]:bg-amber-500',
  LOW: '[&>div]:bg-red-500',
};

function IndexBadge({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  const num = Number(value);
  const color = num > 0.7 ? 'text-red-600' : num > 0.5 ? 'text-amber-600' : 'text-emerald-600';
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${color}`}>{num.toFixed(2)}</span>
    </div>
  );
}

export function BopsPlacementPanel({ studentId }: Props) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideModel, setOverrideModel] = useState('');

  const { data: panel, isLoading: panelLoading } = useBopsPlacementPanel(studentId);
  const { data: cfiResults, isLoading: cfiLoading } = useBopsCfiResults(studentId);
  const { data: explanations } = useBopsCfiExplanations(studentId);
  const { data: cfiPrograms } = useBopsCfiPrograms(studentId);
  const { data: mismatch } = useBopsPlacementMismatch(studentId);
  const { data: profile } = useBopsProfileResolution(studentId);
  const { data: scores } = useBopsLatestScores(studentId);

  const selectPlacement = useSelectPlacement();
  const acceptAndPrograms = useAcceptPlacementAndPrograms();

  const sessionId = scores?.session_id;

  if (panelLoading || cfiLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  if (!panel && (!cfiResults || cfiResults.length === 0)) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No placement data available yet.</p>
          <p className="text-xs mt-1">Complete a BOPS assessment to generate CFI results.</p>
        </CardContent>
      </Card>
    );
  }

  const bestFit = panel || (cfiResults?.[0] ?? null);
  const fitBand = bestFit?.fit_band || 'MODERATE';
  const fitScore = Number(bestFit?.fit_score || 0);
  const placementStatus = bestFit?.placement_status || 'UNKNOWN';
  const bullets: string[] = explanations?.explanation_bullets || [];

  const hasMismatch = mismatch && mismatch.placement_status && mismatch.placement_status !== 'MATCHED';

  return (
    <div className="space-y-4">
      {/* ─── Mismatch Warning ─── */}
      {hasMismatch && (
        <Card className="border-red-400 bg-red-50 dark:bg-red-950/20">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-300">Placement Risk Detected</p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                Current placement may be too low support based on behavioral profile.
                Recommended: <strong>{cfiResults?.[0]?.model_name || 'Higher support environment'}</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Mini Profile Summary ─── */}
      {profile && (
        <Card>
          <CardContent className="py-3 flex flex-wrap items-center gap-3">
            <Brain className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">
              {profile.primary_archetype}–{profile.secondary_archetype}
            </span>
            <Badge variant="outline" className="text-xs">{profile.classification_type}</Badge>
            {profile.clinical_name && (
              <span className="text-xs text-muted-foreground">{profile.clinical_name}</span>
            )}
            {profile.supporting_drivers && (
              <span className="text-xs text-muted-foreground">
                Drivers: {Array.isArray(profile.supporting_drivers) ? (profile.supporting_drivers as string[]).join(', ') : String(profile.supporting_drivers)}
              </span>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Section 1: Placement Summary ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Placement Intelligence
            </CardTitle>
            <div className="flex items-center gap-2">
              {placementStatus === 'MATCHED' && (
                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Matched
                </Badge>
              )}
              {placementStatus === 'HIGH RISK' && (
                <Badge className="bg-red-500/15 text-red-700 border-red-300">
                  <AlertTriangle className="w-3 h-3 mr-1" /> High Risk
                </Badge>
              )}
              {placementStatus === 'OVERPLACED' && (
                <Badge className="bg-amber-500/15 text-amber-700 border-amber-300">
                  <Shield className="w-3 h-3 mr-1" /> Overplaced
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Best Fit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Best Fit</p>
              <Badge className={`text-sm px-3 py-1 ${FIT_COLORS[fitBand] || ''}`}>
                {bestFit?.model_name || 'Unknown'}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Fit Score</p>
              <div className="flex items-center gap-2">
                <Progress
                  value={fitScore * 100}
                  className={`h-3 flex-1 ${FIT_PROGRESS_COLORS[fitBand] || ''}`}
                />
                <span className="text-sm font-semibold">{fitScore.toFixed(2)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Fit Band</p>
              <Badge className={FIT_COLORS[fitBand] || ''}>
                {fitBand}
              </Badge>
            </div>
          </div>

          {/* Indices */}
          {scores && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t">
              <IndexBadge label="Storm" value={scores.storm_score} />
              <IndexBadge label="Escalation" value={scores.escalation_index} />
              <IndexBadge label="Hidden Need" value={scores.hidden_need_index} />
              <IndexBadge label="Sensory Load" value={scores.sensory_load_index} />
              <IndexBadge label="Power Conflict" value={scores.power_conflict_index} />
              <IndexBadge label="Social Complexity" value={scores.social_complexity_index} />
              <IndexBadge label="Recovery Burden" value={scores.recovery_burden_index} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Section 2: Why This Placement ─── */}
      {bullets.length > 0 && (
        <Collapsible open={whyOpen} onOpenChange={setWhyOpen}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <div className="flex items-center gap-2">
                  {whyOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <CardTitle className="text-sm">Why This Placement?</CardTitle>
                  <Badge variant="outline" className="ml-auto text-xs">{bullets.length} factors</Badge>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {bullets.map((b: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Eye className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* ─── Section 3: Classroom Options Table ─── */}
      {cfiResults && cfiResults.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Classroom Options</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Classroom</TableHead>
                  <TableHead className="w-24">Fit Score</TableHead>
                  <TableHead className="w-24">Fit Band</TableHead>
                  <TableHead className="w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cfiResults.map((r: any, i: number) => (
                  <TableRow key={r.model_key || i}>
                    <TableCell className="font-medium">{r.recommended_rank || i + 1}</TableCell>
                    <TableCell>{r.model_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Progress
                          value={Number(r.fit_score) * 100}
                          className={`h-2 w-16 ${FIT_PROGRESS_COLORS[r.fit_band] || ''}`}
                        />
                        <span className="text-xs">{Number(r.fit_score).toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${FIT_COLORS[r.fit_band] || ''}`}>
                        {r.fit_band}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={i === 0 ? 'default' : 'outline'}
                        className="text-xs h-7"
                        onClick={() => selectPlacement.mutate({ studentId, modelKey: r.model_key })}
                        disabled={selectPlacement.isPending}
                      >
                        {i === 0 ? <><Check className="w-3 h-3 mr-1" /> Select</> : 'Select'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ─── Section 4: Program Auto-Recommendation Preview ─── */}
      {cfiPrograms && cfiPrograms.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Recommended Programs for This Placement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {cfiPrograms.map((p: any, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs py-1 px-2.5">
                  {p.program_name}
                  {p.day_state && (
                    <span className={`ml-1.5 inline-block w-2 h-2 rounded-full ${
                      p.day_state === 'red' ? 'bg-red-500' :
                      p.day_state === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Section 5: Action Buttons ─── */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                if (!sessionId) {
                  toast.error('No scored session found');
                  return;
                }
                acceptAndPrograms.mutate({
                  studentId,
                  sessionId,
                  modelKey: bestFit?.model_key || cfiResults?.[0]?.model_key || '',
                });
              }}
              disabled={acceptAndPrograms.isPending}
            >
              {acceptAndPrograms.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Zap className="w-4 h-4 mr-1" />
              )}
              Accept Placement + Programs
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                selectPlacement.mutate({
                  studentId,
                  modelKey: bestFit?.model_key || cfiResults?.[0]?.model_key || '',
                });
              }}
              disabled={selectPlacement.isPending}
            >
              Accept Placement Only
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setOverrideMode(!overrideMode)}
              >
                Override Placement
              </Button>
              {overrideMode && (
                <div className="flex items-center gap-2">
                  <Select value={overrideModel} onValueChange={setOverrideModel}>
                    <SelectTrigger className="w-48 h-9">
                      <SelectValue placeholder="Select model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(cfiResults || []).map((r: any) => (
                        <SelectItem key={r.model_key} value={r.model_key}>
                          {r.model_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={!overrideModel || selectPlacement.isPending}
                    onClick={() => {
                      selectPlacement.mutate({ studentId, modelKey: overrideModel });
                      setOverrideMode(false);
                      setOverrideModel('');
                    }}
                  >
                    Confirm
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
