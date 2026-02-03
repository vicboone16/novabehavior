import { useState } from 'react';
import { format } from 'date-fns';
import { 
  MoreHorizontal, 
  StickyNote, 
  Calendar, 
  ArrowRight, 
  Trash2,
  Star,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StudentIEPSupport, IEPStudentStatus } from '@/types/iepLibrary';
import { DOMAIN_DISPLAY_NAMES, SETTING_DISPLAY_NAMES } from '@/types/iepLibrary';

interface IEPSupportCardProps {
  support: StudentIEPSupport;
  onUpdateStatus: (supportId: string, status: IEPStudentStatus) => void;
  onUpdateNotes: (supportId: string, notes: string) => void;
  onSetReviewDate: (supportId: string, date: string) => void;
  onRemove: (supportId: string) => void;
}

export function IEPSupportCard({
  support,
  onUpdateStatus,
  onUpdateNotes,
  onSetReviewDate,
  onRemove
}: IEPSupportCardProps) {
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [notes, setNotes] = useState(support.notes || '');
  const [reviewDate, setReviewDate] = useState(support.review_date || '');

  const title = support.library_item?.title || support.custom_title || 'Untitled Support';
  const description = support.library_item?.description || support.custom_description || '';
  const itemType = support.item_type;
  const domains = support.domains_override || support.library_item?.domains || [];
  const settings = support.setting_tags_override || support.library_item?.setting_tags || [];
  const complianceLevel = support.library_item?.idea_compliance_level;
  const isArchived = support.library_item?.status === 'archived';

  const handleSaveNotes = () => {
    onUpdateNotes(support.id, notes);
    setShowNotesDialog(false);
  };

  const handleSaveReviewDate = () => {
    onSetReviewDate(support.id, reviewDate);
    setShowReviewDialog(false);
  };

  const getStatusIcon = () => {
    switch (support.student_status) {
      case 'existing':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'considering':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'not_using':
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getComplianceBadge = () => {
    if (!complianceLevel) return null;
    
    switch (complianceLevel) {
      case 'safe':
        return (
          <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Safe Accommodation
          </Badge>
        );
      case 'caution':
        return (
          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Caution – Review with Team
          </Badge>
        );
      case 'modification':
        return (
          <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Modification – Alters Standard
          </Badge>
        );
    }
  };

  return (
    <>
      <Card className={`${isArchived ? 'opacity-60' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon()}
                <h4 className="font-medium truncate">{title}</h4>
                {support.is_primary_support && (
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                )}
                {isArchived && (
                  <Badge variant="secondary" className="text-xs">Archived</Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {description}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge variant={itemType === 'accommodation' ? 'default' : 'destructive'} className="text-xs">
                  {itemType === 'accommodation' ? 'Accommodation' : 'Modification'}
                </Badge>
                {getComplianceBadge()}
              </div>

              <div className="flex flex-wrap gap-1">
                {domains.slice(0, 2).map(domain => (
                  <Badge key={domain} variant="outline" className="text-xs">
                    {DOMAIN_DISPLAY_NAMES[domain] || domain}
                  </Badge>
                ))}
                {domains.length > 2 && (
                  <Badge variant="outline" className="text-xs">+{domains.length - 2} more</Badge>
                )}
                {settings.slice(0, 1).map(setting => (
                  <Badge key={setting} variant="secondary" className="text-xs">
                    {SETTING_DISPLAY_NAMES[setting] || setting}
                  </Badge>
                ))}
              </div>

              {support.notes && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Note: {support.notes.slice(0, 80)}{support.notes.length > 80 ? '...' : ''}
                </p>
              )}

              {support.review_date && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Review: {format(new Date(support.review_date), 'MMM d, yyyy')}
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {support.student_status !== 'existing' && (
                  <DropdownMenuItem onClick={() => onUpdateStatus(support.id, 'existing')}>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Move to Existing
                  </DropdownMenuItem>
                )}
                {support.student_status !== 'considering' && (
                  <DropdownMenuItem onClick={() => onUpdateStatus(support.id, 'considering')}>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Move to Considering
                  </DropdownMenuItem>
                )}
                {support.student_status !== 'not_using' && (
                  <DropdownMenuItem onClick={() => onUpdateStatus(support.id, 'not_using')}>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Move to Not Using
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowNotesDialog(true)}>
                  <StickyNote className="w-4 h-4 mr-2" />
                  Add Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowReviewDialog(true)}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Set Review Date
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onRemove(support.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove from Student
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter notes about this support..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              Cancel
            </Button>
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
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Review Date</Label>
              <Input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveReviewDate}>Save Date</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
