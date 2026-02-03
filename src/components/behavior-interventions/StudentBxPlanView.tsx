import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  CheckCircle, 
  Clock, 
  Lightbulb, 
  XCircle, 
  Archive,
  MoreVertical,
  Plus,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useStudentBxPlan } from '@/hooks/useBehaviorInterventions';
import type { StudentBxPlanLink, LinkStatus } from '@/types/behaviorIntervention';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<LinkStatus, { label: string; icon: React.ReactNode; color: string }> = {
  existing: { label: 'Existing', icon: <CheckCircle className="w-4 h-4" />, color: 'text-primary' },
  considering: { label: 'Considering', icon: <Clock className="w-4 h-4" />, color: 'text-muted-foreground' },
  recommended: { label: 'Recommended', icon: <Lightbulb className="w-4 h-4" />, color: 'text-accent-foreground' },
  rejected: { label: 'Rejected', icon: <XCircle className="w-4 h-4" />, color: 'text-destructive' },
  archived: { label: 'Archived', icon: <Archive className="w-4 h-4" />, color: 'text-muted-foreground' },
};

interface StudentBxPlanViewProps {
  studentId: string;
  studentName: string;
  onAddIntervention?: () => void;
  onGenerateRecommendations?: () => void;
}

function InterventionCard({ 
  link, 
  onUpdateStatus 
}: { 
  link: StudentBxPlanLink;
  onUpdateStatus: (id: string, status: LinkStatus) => void;
}) {
  const config = STATUS_CONFIG[link.link_status];

  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {link.problem && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Badge variant="outline" className="text-xs font-mono">
                  {link.problem.problem_code}
                </Badge>
                <span>{link.problem.title}</span>
              </div>
            )}
            {link.objective && (
              <div className="flex items-center gap-1 mb-1">
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <span className="text-sm font-medium truncate">
                  {link.objective.objective_title}
                </span>
              </div>
            )}
            {link.strategy && (
              <div className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-muted-foreground ml-3" />
                <Badge variant="secondary" className="text-xs">
                  {link.strategy.strategy_name}
                </Badge>
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {link.link_status !== 'existing' && (
              <DropdownMenuItem onClick={() => onUpdateStatus(link.id, 'existing')}>
                  <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                  Mark as Existing
                </DropdownMenuItem>
              )}
              {link.link_status !== 'considering' && (
              <DropdownMenuItem onClick={() => onUpdateStatus(link.id, 'considering')}>
                  <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                  Move to Considering
                </DropdownMenuItem>
              )}
              {link.link_status !== 'rejected' && (
              <DropdownMenuItem onClick={() => onUpdateStatus(link.id, 'rejected')}>
                  <XCircle className="w-4 h-4 mr-2 text-destructive" />
                  Reject
                </DropdownMenuItem>
              )}
              {link.link_status !== 'archived' && (
                <DropdownMenuItem onClick={() => onUpdateStatus(link.id, 'archived')}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {link.target_behavior_label && (
          <p className="text-xs">
            <span className="font-medium">Target:</span>{' '}
            <span className="text-muted-foreground">{link.target_behavior_label}</span>
          </p>
        )}
        {link.function_hypothesis && link.function_hypothesis.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {link.function_hypothesis.map(f => (
              <Badge key={f} variant="outline" className="text-xs capitalize">
                {f}
              </Badge>
            ))}
          </div>
        )}
        {link.notes && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {link.notes}
          </p>
        )}
        {link.start_date && (
          <p className="text-xs text-muted-foreground mt-1">
            Started: {new Date(link.start_date).toLocaleDateString()}
          </p>
        )}
        {link.recommended_score !== null && link.recommended_score !== undefined && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs">
                Score: {link.recommended_score.toFixed(1)}
              </span>
            </div>
            {link.recommendation_reason && (
              <p className="text-xs text-muted-foreground mt-1">
                {link.recommendation_reason}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InterventionList({ 
  links, 
  emptyMessage,
  onUpdateStatus 
}: { 
  links: StudentBxPlanLink[];
  emptyMessage: string;
  onUpdateStatus: (id: string, status: LinkStatus) => void;
}) {
  if (links.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {links.map(link => (
        <InterventionCard 
          key={link.id} 
          link={link} 
          onUpdateStatus={onUpdateStatus}
        />
      ))}
    </div>
  );
}

export function StudentBxPlanView({ 
  studentId, 
  studentName,
  onAddIntervention,
  onGenerateRecommendations 
}: StudentBxPlanViewProps) {
  const { 
    existing, 
    considering, 
    recommended, 
    rejected, 
    archived,
    loading,
    updateLinkStatus 
  } = useStudentBxPlan(studentId);

  const [activeTab, setActiveTab] = useState<LinkStatus>('existing');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Behavior Interventions</h3>
          <p className="text-sm text-muted-foreground">
            Manage intervention plans for {studentName}
          </p>
        </div>
        <div className="flex gap-2">
          {onGenerateRecommendations && (
            <Button variant="outline" onClick={onGenerateRecommendations}>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Recommendations
            </Button>
          )}
          {onAddIntervention && (
            <Button onClick={onAddIntervention}>
              <Plus className="w-4 h-4 mr-2" />
              Add Intervention
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LinkStatus)}>
        <TabsList>
          <TabsTrigger value="existing" className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            Existing
            <Badge variant="secondary" className="ml-1">{existing.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="considering" className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Considering
            <Badge variant="secondary" className="ml-1">{considering.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="recommended" className="flex items-center gap-1">
            <Lightbulb className="w-4 h-4" />
            Recommended
            <Badge variant="secondary" className="ml-1">{recommended.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-1">
            <XCircle className="w-4 h-4" />
            Rejected
            <Badge variant="secondary" className="ml-1">{rejected.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[400px] mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Loading interventions...
            </div>
          ) : (
            <>
              <TabsContent value="existing" className="m-0">
                <InterventionList 
                  links={existing}
                  emptyMessage="No existing interventions. Add interventions from the library."
                  onUpdateStatus={updateLinkStatus}
                />
              </TabsContent>

              <TabsContent value="considering" className="m-0">
                <InterventionList 
                  links={considering}
                  emptyMessage="No interventions under consideration."
                  onUpdateStatus={updateLinkStatus}
                />
              </TabsContent>

              <TabsContent value="recommended" className="m-0">
                <InterventionList 
                  links={recommended}
                  emptyMessage="No AI recommendations yet. Click 'Generate Recommendations' to get suggestions."
                  onUpdateStatus={updateLinkStatus}
                />
              </TabsContent>

              <TabsContent value="rejected" className="m-0">
                <InterventionList 
                  links={rejected}
                  emptyMessage="No rejected interventions."
                  onUpdateStatus={updateLinkStatus}
                />
              </TabsContent>
            </>
          )}
        </ScrollArea>
      </Tabs>
    </div>
  );
}
