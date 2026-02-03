import { useState, useMemo } from 'react';
import { Plus, Download, FileText, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStudentIEPSupports, useIEPRecommendations } from '@/hooks/useIEPLibrary';
import { IEPSupportCard } from './IEPSupportCard';
import { AddFromLibraryDialog } from './AddFromLibraryDialog';
import { AddCustomSupportDialog } from './AddCustomSupportDialog';
import { SuggestedSupportsPanel } from './SuggestedSupportsPanel';
import { IEPExportDialog } from './IEPExportDialog';
import type { StudentIEPProfile, IEPStudentStatus } from '@/types/iepLibrary';

interface StudentAccommodationsPanelProps {
  studentId: string;
  studentName: string;
  studentProfile?: StudentIEPProfile;
  showRecommendations?: boolean;
}

export function StudentAccommodationsPanel({
  studentId,
  studentName,
  studentProfile,
  showRecommendations = true
}: StudentAccommodationsPanelProps) {
  const [activeTab, setActiveTab] = useState<IEPStudentStatus>('existing');
  const [showLibraryDialog, setShowLibraryDialog] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const {
    supports,
    isLoading,
    addFromLibrary,
    addCustomSupport,
    updateStatus,
    updateNotes,
    setReviewDate,
    removeSupport,
    existingSupports,
    consideringSupports,
    notUsingSupports
  } = useStudentIEPSupports(studentId);

  const {
    recommendations,
    isLoading: recommendationsLoading,
    logAction
  } = useIEPRecommendations(studentId, studentProfile);

  const existingItemIds = useMemo(() => 
    supports.filter(s => s.library_item_id).map(s => s.library_item_id as string),
    [supports]
  );

  const handleAcceptRecommendation = async (itemId: string) => {
    const rec = recommendations.find(r => r.library_item.id === itemId);
    if (!rec) return;

    await logAction(itemId, 'accepted', rec.reason, rec.confidence);
    await addFromLibrary(itemId, 'considering', 'recommended_by_system');
  };

  const handleDismissRecommendation = async (itemId: string) => {
    const rec = recommendations.find(r => r.library_item.id === itemId);
    if (!rec) return;
    await logAction(itemId, 'dismissed', rec.reason, rec.confidence);
  };

  const handleSaveForLaterRecommendation = async (itemId: string) => {
    const rec = recommendations.find(r => r.library_item.id === itemId);
    if (!rec) return;
    await logAction(itemId, 'saved_for_later', rec.reason, rec.confidence);
  };

  const getTabSupports = () => {
    switch (activeTab) {
      case 'existing': return existingSupports;
      case 'considering': return consideringSupports;
      case 'not_using': return notUsingSupports;
      default: return [];
    }
  };

  const EmptyState = ({ status }: { status: IEPStudentStatus }) => {
    const messages: Record<IEPStudentStatus, { title: string; description: string }> = {
      existing: {
        title: 'No existing supports',
        description: 'Add supports that are already documented in the student\'s current IEP or 504 plan.'
      },
      considering: {
        title: 'No supports under consideration',
        description: 'Add supports you\'re evaluating for possible inclusion in the student\'s plan.'
      },
      not_using: {
        title: 'No rejected supports',
        description: 'Supports that were considered but determined not appropriate will appear here.'
      }
    };

    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="font-medium">{messages[status].title}</p>
        <p className="text-sm mt-1">{messages[status].description}</p>
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setShowLibraryDialog(true)}>
            <FileText className="w-4 h-4 mr-1" />
            Add from Library
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCustomDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Custom
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Suggested Supports */}
      {showRecommendations && studentProfile && (
        <SuggestedSupportsPanel
          recommendations={recommendations}
          isLoading={recommendationsLoading}
          onAccept={handleAcceptRecommendation}
          onDismiss={handleDismissRecommendation}
          onSaveForLater={handleSaveForLaterRecommendation}
          studentProfile={studentProfile}
        />
      )}

      {/* Main Supports Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Accommodations & Modifications
              </CardTitle>
              <CardDescription>
                Track IEP supports already in place and proposed supports to consider.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
                <Download className="w-4 h-4 mr-1" />
                Export Supports
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowLibraryDialog(true)}>
                <FileText className="w-4 h-4 mr-1" />
                Add from Library
              </Button>
              <Button size="sm" onClick={() => setShowCustomDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Custom Support
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as IEPStudentStatus)}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="existing" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="hidden sm:inline">Existing</span>
                {existingSupports.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{existingSupports.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="considering" className="gap-2">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Considering</span>
                {consideringSupports.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{consideringSupports.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="not_using" className="gap-2">
                <XCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Not Using</span>
                {notUsingSupports.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{notUsingSupports.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {['existing', 'considering', 'not_using'].map((status) => (
              <TabsContent key={status} value={status}>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading supports...
                  </div>
                ) : getTabSupports().length === 0 ? (
                  <EmptyState status={status as IEPStudentStatus} />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {getTabSupports().map(support => (
                      <IEPSupportCard
                        key={support.id}
                        support={support}
                        onUpdateStatus={updateStatus}
                        onUpdateNotes={updateNotes}
                        onSetReviewDate={setReviewDate}
                        onRemove={removeSupport}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddFromLibraryDialog
        open={showLibraryDialog}
        onOpenChange={setShowLibraryDialog}
        onAddItem={addFromLibrary}
        existingItemIds={existingItemIds}
      />

      <AddCustomSupportDialog
        open={showCustomDialog}
        onOpenChange={setShowCustomDialog}
        onAdd={addCustomSupport}
      />

      <IEPExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        studentName={studentName}
        existingSupports={existingSupports}
        consideringSupports={consideringSupports}
      />
    </div>
  );
}
