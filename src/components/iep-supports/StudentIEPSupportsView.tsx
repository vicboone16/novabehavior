import { useState, useMemo } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  Lightbulb, 
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  MoreHorizontal,
  Trash2,
  StickyNote,
  Calendar as CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStudentIEPSupportLinks, useIEPRecommendations } from '@/hooks/useStudentIEPSupportLinks';
import { AddFromIEPLibraryDialog } from './AddFromIEPLibraryDialog';
import type { LinkStatus, StudentIEPSupportLink, IEPRecommendationRequest, DataSignals } from '@/types/iepSupports';
import { DOMAIN_DISPLAY, COMPLIANCE_DISPLAY } from '@/types/iepSupports';

interface StudentIEPSupportsViewProps {
  studentId: string;
  studentName: string;
  gradeBand?: string;
  eligibility?: string[];
  settings?: string[];
  isSchoolBased?: boolean;
}

export function StudentIEPSupportsView({
  studentId,
  studentName,
  gradeBand = 'elementary',
  eligibility = [],
  settings = ['general_ed'],
  isSchoolBased = true
}: StudentIEPSupportsViewProps) {
  const [activeTab, setActiveTab] = useState<LinkStatus>('existing');
  const [showLibraryDialog, setShowLibraryDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedLink, setSelectedLink] = useState<StudentIEPSupportLink | null>(null);
  const [pendingAction, setPendingAction] = useState<{ linkId: string; status: LinkStatus } | null>(null);
  const [notes, setNotes] = useState('');
  const [reviewDate, setReviewDate] = useState('');

  const {
    links,
    isLoading,
    existingLinks,
    consideringLinks,
    recommendedLinks,
    rejectedLinks,
    upsertLink,
    updateLinkStatus,
    updateNotes,
    setReviewDate: saveReviewDate,
    deleteLink
  } = useStudentIEPSupportLinks(studentId);

  const { recommendations, isLoading: recLoading, generateRecommendations } = useIEPRecommendations(studentId);

  const existingItemIds = useMemo(() => links.map(l => l.item_id), [links]);

  const handleGenerateRecommendations = async () => {
    const request: IEPRecommendationRequest = {
      student: {
        student_id: studentId,
        grade_band: gradeBand,
        age: gradeBand === 'preschool' ? 4 : gradeBand === 'elementary' ? 8 : gradeBand === 'middle_school' ? 12 : 16,
        eligibility,
        primary_needs: eligibility,
        settings,
        current_accommodations_item_ids: existingLinks.filter(l => l.item?.item_type === 'Accommodation').map(l => l.item_id),
        current_modifications_item_ids: existingLinks.filter(l => l.item?.item_type === 'Modification').map(l => l.item_id)
      },
      goals: [],
      data_signals: {
        academic: [],
        behavior: [],
        attendance: [],
        sensory: [],
        communication: [],
        executive_function: []
      },
      constraints: {
        school_based_mode: isSchoolBased,
        allowed_item_types: ['Accommodation', 'Modification'],
        max_recommendations: 10,
        exclude_item_ids: existingItemIds
      }
    };

    const result = await generateRecommendations(request);
    
    // Add recommendations as links
    for (const rec of result.recommendations) {
      await upsertLink(rec.item_id, 'recommended', {
        recommendation_score: rec.recommendation_score,
        recommendation_confidence: rec.confidence,
        rationale_bullets: rec.rationale_bullets,
        risk_flags: rec.risk_flags
      });
    }
  };

  const handleStatusChange = (link: StudentIEPSupportLink, newStatus: LinkStatus) => {
    const requiresConfirmation = 
      newStatus === 'existing' && (
        link.item?.idea_compliance_level === 'Caution' ||
        link.item?.idea_compliance_level === 'Modification' ||
        link.item?.item_type === 'Modification'
      );

    if (requiresConfirmation) {
      setPendingAction({ linkId: link.link_id, status: newStatus });
      setShowConfirmDialog(true);
    } else {
      updateLinkStatus(link.link_id, newStatus);
    }
  };

  const confirmStatusChange = () => {
    if (pendingAction) {
      updateLinkStatus(pendingAction.linkId, pendingAction.status, { confirmed: true });
      setShowConfirmDialog(false);
      setPendingAction(null);
    }
  };

  const openNotesDialog = (link: StudentIEPSupportLink) => {
    setSelectedLink(link);
    setNotes(link.notes || '');
    setShowNotesDialog(true);
  };

  const openReviewDialog = (link: StudentIEPSupportLink) => {
    setSelectedLink(link);
    setReviewDate(link.review_due || '');
    setShowReviewDialog(true);
  };

  const handleSaveNotes = () => {
    if (selectedLink) {
      updateNotes(selectedLink.link_id, notes);
      setShowNotesDialog(false);
      setSelectedLink(null);
    }
  };

  const handleSaveReviewDate = () => {
    if (selectedLink) {
      saveReviewDate(selectedLink.link_id, reviewDate);
      setShowReviewDialog(false);
      setSelectedLink(null);
    }
  };

  const getTabLinks = (): StudentIEPSupportLink[] => {
    switch (activeTab) {
      case 'existing': return existingLinks;
      case 'considering': return consideringLinks;
      case 'recommended': return recommendedLinks;
      case 'rejected': return rejectedLinks;
      default: return [];
    }
  };

  const tabCounts = {
    existing: existingLinks.length,
    considering: consideringLinks.length,
    recommended: recommendedLinks.length,
    rejected: rejectedLinks.length
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Accommodations & Modifications
              </CardTitle>
              <CardDescription>
                IEP and 504 supports for {studentName}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGenerateRecommendations}
                disabled={recLoading}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Generate Recommendations
              </Button>
              <Button size="sm" onClick={() => setShowLibraryDialog(true)}>
                <FileText className="w-4 h-4 mr-1" />
                Add from Library
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LinkStatus)}>
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="existing" className="gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span className="hidden sm:inline">Existing</span>
                {tabCounts.existing > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                    {tabCounts.existing}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="considering" className="gap-1.5">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Considering</span>
                {tabCounts.considering > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                    {tabCounts.considering}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="recommended" className="gap-1.5">
                <Lightbulb className="w-4 h-4" />
                <span className="hidden sm:inline">Recommended</span>
                {tabCounts.recommended > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                    {tabCounts.recommended}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-1.5">
                <XCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Rejected</span>
                {tabCounts.rejected > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                    {tabCounts.rejected}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {['existing', 'considering', 'recommended', 'rejected'].map(status => (
              <TabsContent key={status} value={status}>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading supports...
                  </div>
                ) : getTabLinks().length === 0 ? (
                  <EmptyState 
                    status={status as LinkStatus} 
                    onAddFromLibrary={() => setShowLibraryDialog(true)}
                    onGenerateRecs={status === 'recommended' ? handleGenerateRecommendations : undefined}
                  />
                ) : (
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {getTabLinks().map(link => (
                        <SupportLinkCard
                          key={link.link_id}
                          link={link}
                          onStatusChange={(newStatus) => handleStatusChange(link, newStatus)}
                          onOpenNotes={() => openNotesDialog(link)}
                          onOpenReview={() => openReviewDialog(link)}
                          onDelete={() => deleteLink(link.link_id)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Add from Library Dialog */}
      <AddFromIEPLibraryDialog
        open={showLibraryDialog}
        onOpenChange={setShowLibraryDialog}
        studentId={studentId}
        excludeItemIds={existingItemIds}
        onAddItem={(itemId, status) => upsertLink(itemId, status)}
      />

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter notes about this support..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveNotes}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Date Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Review Date</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Review Date</Label>
            <Input
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveReviewDate}>Save Date</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Confirm Implementation
            </AlertDialogTitle>
            <AlertDialogDescription>
              This support requires team review and confirmation before marking as existing.
              Please ensure proper documentation and team consensus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              Confirm & Mark as Existing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Support Link Card Component
function SupportLinkCard({
  link,
  onStatusChange,
  onOpenNotes,
  onOpenReview,
  onDelete
}: {
  link: StudentIEPSupportLink;
  onStatusChange: (status: LinkStatus) => void;
  onOpenNotes: () => void;
  onOpenReview: () => void;
  onDelete: () => void;
}) {
  const [showRationale, setShowRationale] = useState(false);
  const item = link.item;
  
  if (!item) return null;

  const complianceStyle = COMPLIANCE_DISPLAY[item.idea_compliance_level] || { label: '', color: '', bgColor: '' };
  const requiresWarning = 
    item.idea_compliance_level === 'Caution' || 
    item.idea_compliance_level === 'Modification' ||
    item.item_type === 'Modification';

  return (
    <Card className={requiresWarning ? 'border-amber-200' : ''}>
      <CardContent className="p-3">
        {/* Warning Banner */}
        {requiresWarning && link.link_status !== 'existing' && (
          <div className="bg-amber-50 -mx-3 -mt-3 mb-2 px-3 py-1.5 border-b border-amber-200">
            <div className="flex items-center gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="w-3 h-3" />
              {item.item_type === 'Modification' ? 'Modification - Team approval required' : 'Caution - Review with team'}
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="font-medium text-sm truncate">{item.title}</span>
              <Badge 
                variant={item.item_type === 'Accommodation' ? 'default' : 'destructive'}
                className="text-[10px] px-1.5 py-0"
              >
                {item.item_type}
              </Badge>
              <Badge 
                variant="outline" 
                className={`text-[10px] px-1.5 py-0 ${complianceStyle?.bgColor || ''} ${complianceStyle?.color || ''}`}
              >
                {item.idea_compliance_level}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-1 mb-1.5">
              {item.domains.slice(0, 2).map(d => (
                <Badge key={d} variant="outline" className="text-[10px] px-1.5 py-0">
                  {DOMAIN_DISPLAY[d] || d}
                </Badge>
              ))}
            </div>

            {item.export_language.iep && (
              <p className="text-xs text-muted-foreground italic line-clamp-2">
                {item.export_language.iep}
              </p>
            )}

            {link.notes && (
              <p className="text-xs text-muted-foreground mt-1 border-l-2 pl-2 border-muted">
                {link.notes.slice(0, 60)}{link.notes.length > 60 && '...'}
              </p>
            )}

            {link.review_due && (
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                Review: {format(new Date(link.review_due), 'MMM d, yyyy')}
              </p>
            )}

            {/* Recommendation Rationale */}
            {link.link_status === 'recommended' && link.rationale_bullets && link.rationale_bullets.length > 0 && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2 gap-1"
                  onClick={() => setShowRationale(!showRationale)}
                >
                  {showRationale ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Why recommended
                  {link.recommendation_confidence && (
                    <Badge variant="secondary" className="text-[10px] ml-1">
                      {link.recommendation_confidence}
                    </Badge>
                  )}
                </Button>
                {showRationale && (
                  <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
                    {link.rationale_bullets.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {link.link_status !== 'existing' && (
                <DropdownMenuItem onClick={() => onStatusChange('existing')}>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                  Move to Existing
                </DropdownMenuItem>
              )}
              {link.link_status !== 'considering' && (
                <DropdownMenuItem onClick={() => onStatusChange('considering')}>
                  <Clock className="w-4 h-4 mr-2 text-amber-600" />
                  Move to Considering
                </DropdownMenuItem>
              )}
              {link.link_status !== 'rejected' && (
                <DropdownMenuItem onClick={() => onStatusChange('rejected')}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Move to Rejected
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenNotes}>
                <StickyNote className="w-4 h-4 mr-2" />
                Add Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenReview}>
                <CalendarIcon className="w-4 h-4 mr-2" />
                Set Review Date
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// Empty State Component
function EmptyState({ 
  status, 
  onAddFromLibrary,
  onGenerateRecs
}: { 
  status: LinkStatus; 
  onAddFromLibrary: () => void;
  onGenerateRecs?: () => void;
}) {
  const messages: Record<LinkStatus, { title: string; description: string }> = {
    existing: {
      title: 'No existing supports',
      description: 'Add supports that are documented in the current IEP or 504 plan.'
    },
    considering: {
      title: 'No supports under consideration',
      description: "Add supports you're evaluating for possible inclusion."
    },
    recommended: {
      title: 'No recommendations yet',
      description: 'Generate AI recommendations based on student profile and data.'
    },
    rejected: {
      title: 'No rejected supports',
      description: 'Supports determined not appropriate will appear here.'
    },
    archived: {
      title: 'No archived supports',
      description: 'Archived supports will appear here.'
    }
  };

  return (
    <div className="text-center py-8 text-muted-foreground">
      <p className="font-medium">{messages[status].title}</p>
      <p className="text-sm mt-1">{messages[status].description}</p>
      <div className="flex justify-center gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={onAddFromLibrary}>
          <FileText className="w-4 h-4 mr-1" />
          Add from Library
        </Button>
        {status === 'recommended' && onGenerateRecs && (
          <Button size="sm" onClick={onGenerateRecs}>
            <Sparkles className="w-4 h-4 mr-1" />
            Generate Recommendations
          </Button>
        )}
      </div>
    </div>
  );
}
