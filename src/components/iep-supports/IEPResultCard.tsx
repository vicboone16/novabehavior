import { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  XCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import type { IEPSupportItem, LinkStatus } from '@/types/iepSupports';
import { DOMAIN_DISPLAY, COMPLIANCE_DISPLAY, GRADE_BAND_DISPLAY } from '@/types/iepSupports';

interface IEPResultCardProps {
  item: IEPSupportItem;
  studentId?: string;
  existingLinkStatus?: LinkStatus;
  onAction: (itemId: string, action: LinkStatus) => void;
  showActions?: boolean;
}

export function IEPResultCard({
  item,
  studentId,
  existingLinkStatus,
  onAction,
  showActions = true
}: IEPResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<LinkStatus | null>(null);

  const requiresConfirmation = 
    item.idea_compliance_level === 'Caution' || 
    item.idea_compliance_level === 'Modification' ||
    item.item_type === 'Modification';

  const handleAction = (action: LinkStatus) => {
    if (action === 'existing' && requiresConfirmation) {
      setPendingAction(action);
      setShowConfirmDialog(true);
    } else {
      onAction(item.id, action);
    }
  };

  const confirmAction = () => {
    if (pendingAction) {
      onAction(item.id, pendingAction);
      setShowConfirmDialog(false);
      setPendingAction(null);
    }
  };

  const getComplianceIcon = () => {
    switch (item.idea_compliance_level) {
      case 'Safe':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'Caution':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'Modification':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const complianceStyle = COMPLIANCE_DISPLAY[item.idea_compliance_level] || { label: '', color: '', bgColor: '' };

  return (
    <>
      <Card className="transition-all hover:shadow-md">
        <CardContent className="p-4">
          {/* Warning Banner for Caution/Modification */}
          {requiresConfirmation && (
            <div className={`-mx-4 -mt-4 mb-3 px-4 py-2 ${
              item.item_type === 'Modification' || item.idea_compliance_level === 'Modification'
                ? 'bg-red-50 border-b border-red-200'
                : 'bg-amber-50 border-b border-amber-200'
            }`}>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className={`w-4 h-4 ${
                  item.item_type === 'Modification' || item.idea_compliance_level === 'Modification'
                    ? 'text-red-600'
                    : 'text-amber-600'
                }`} />
                <span className={
                  item.item_type === 'Modification' || item.idea_compliance_level === 'Modification'
                    ? 'text-red-700'
                    : 'text-amber-700'
                }>
                  {item.item_type === 'Modification' 
                    ? 'This is a Modification that alters academic standards. Team approval required.'
                    : 'Review with team before implementing.'}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Title Row */}
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <h4 className="font-medium">{item.title}</h4>
                <Badge 
                  variant={item.item_type === 'Accommodation' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {item.item_type}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${complianceStyle?.bgColor || ''} ${complianceStyle?.color || ''}`}
                >
                  {getComplianceIcon()}
                  <span className="ml-1">{item.idea_compliance_level}</span>
                </Badge>
                {existingLinkStatus && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    {existingLinkStatus === 'existing' && <CheckCircle2 className="w-3 h-3" />}
                    {existingLinkStatus === 'considering' && <Clock className="w-3 h-3" />}
                    {existingLinkStatus === 'rejected' && <XCircle className="w-3 h-3" />}
                    {existingLinkStatus.charAt(0).toUpperCase() + existingLinkStatus.slice(1)}
                  </Badge>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {item.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-2">
                {item.domains.slice(0, 3).map(domain => (
                  <Badge key={domain} variant="outline" className="text-xs">
                    {DOMAIN_DISPLAY[domain] || domain}
                  </Badge>
                ))}
                {item.domains.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{item.domains.length - 3} more
                  </Badge>
                )}
                {item.topics.slice(0, 2).map(topic => (
                  <Badge key={topic} variant="secondary" className="text-xs">
                    {topic.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>

              {/* Export Language Preview */}
              {item.export_language.iep && (
                <div className="text-xs text-muted-foreground italic border-l-2 pl-2 border-muted">
                  {item.export_language.iep.slice(0, 100)}
                  {item.export_language.iep.length > 100 && '...'}
                </div>
              )}

              {/* Expanded Content */}
              {expanded && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <div>
                    <span className="text-xs font-medium">Grade Bands:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.grade_band.map(g => (
                        <Badge key={g} variant="secondary" className="text-xs">
                          {GRADE_BAND_DISPLAY[g] || g}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {item.implementation_notes.length > 0 && (
                    <div>
                      <span className="text-xs font-medium">Implementation Notes:</span>
                      <ul className="list-disc list-inside text-xs text-muted-foreground mt-1">
                        {item.implementation_notes.map((note, i) => (
                          <li key={i}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {item.contraindications.length > 0 && (
                    <div className="bg-amber-50 p-2 rounded border border-amber-200">
                      <span className="text-xs font-medium text-amber-800">Contraindications:</span>
                      <ul className="list-disc list-inside text-xs text-amber-700 mt-1">
                        {item.contraindications.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1 shrink-0">
              {showActions && studentId && !existingLinkStatus && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="gap-1">
                      <Plus className="w-4 h-4" />
                      Add
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAction('existing')}>
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                      Mark as Existing
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAction('considering')}>
                      <Clock className="w-4 h-4 mr-2 text-amber-600" />
                      Save as Considering
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAction('recommended')}>
                      <FileText className="w-4 h-4 mr-2 text-blue-600" />
                      Add as Recommended
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAction('rejected')}>
                      <XCircle className="w-4 h-4 mr-2 text-muted-foreground" />
                      Reject
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setExpanded(!expanded)}
                className="text-xs"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3 h-3 mr-1" />
                    Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    More
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Confirm Implementation
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  <strong>{item.title}</strong> is marked as{' '}
                  {item.item_type === 'Modification' ? 'a Modification' : 'Caution-level'}.
                </p>
                {item.item_type === 'Modification' ? (
                  <p className="text-red-600">
                    Modifications alter academic standards and require IEP team approval. 
                    Please ensure proper documentation and team consensus before implementing.
                  </p>
                ) : (
                  <p className="text-amber-600">
                    This accommodation requires careful consideration and team review 
                    before implementation.
                  </p>
                )}
                <p>Are you sure you want to mark this as an existing support?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              Confirm & Add as Existing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
