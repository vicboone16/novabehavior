import { useState, useMemo } from 'react';
import { Search, Plus, CheckCircle2, Clock, XCircle, AlertTriangle, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useIEPLibrarySearch } from '@/hooks/useIEPLibrarySearch';
import type { LinkStatus, IEPSupportItem } from '@/types/iepSupports';
import { DOMAIN_DISPLAY, COMPLIANCE_DISPLAY } from '@/types/iepSupports';

interface AddFromIEPLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  excludeItemIds: string[];
  onAddItem: (itemId: string, status: LinkStatus) => void;
}

export function AddFromIEPLibraryDialog({
  open,
  onOpenChange,
  studentId,
  excludeItemIds,
  onAddItem
}: AddFromIEPLibraryDialogProps) {
  const { searchResults, query, setSearchText, isLoading } = useIEPLibrarySearch();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ item: IEPSupportItem; status: LinkStatus } | null>(null);

  const availableItems = useMemo(() => 
    searchResults.items.filter(item => !excludeItemIds.includes(item.id)),
    [searchResults.items, excludeItemIds]
  );

  const handleAction = (item: IEPSupportItem, status: LinkStatus) => {
    const requiresConfirmation = 
      status === 'existing' && (
        item.idea_compliance_level === 'Caution' ||
        item.idea_compliance_level === 'Modification' ||
        item.item_type === 'Modification'
      );

    if (requiresConfirmation) {
      setPendingAction({ item, status });
      setShowConfirmDialog(true);
    } else {
      onAddItem(item.id, status);
    }
  };

  const confirmAction = () => {
    if (pendingAction) {
      onAddItem(pendingAction.item.id, pendingAction.status);
      setShowConfirmDialog(false);
      setPendingAction(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add from IEP / 504 Library</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search accommodations, modifications..."
              value={query.query_text}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-2 py-2">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : availableItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No items found.</div>
              ) : (
                availableItems.map(item => (
                  <LibraryItemRow
                    key={item.id}
                    item={item}
                    onAction={handleAction}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Confirm Implementation
            </AlertDialogTitle>
            <AlertDialogDescription>
              This support requires team review. Are you sure you want to mark it as existing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function LibraryItemRow({ item, onAction }: { item: IEPSupportItem; onAction: (item: IEPSupportItem, status: LinkStatus) => void }) {
  const complianceStyle = COMPLIANCE_DISPLAY[item.idea_compliance_level] || { label: '', color: '', bgColor: '' };
  const requiresWarning = item.idea_compliance_level === 'Caution' || item.item_type === 'Modification';

  return (
    <div className={`p-3 border rounded-lg hover:bg-muted/50 ${requiresWarning ? 'border-amber-200' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium">{item.title}</span>
            <Badge variant={item.item_type === 'Accommodation' ? 'default' : 'destructive'} className="text-xs">
              {item.item_type}
            </Badge>
            <Badge variant="outline" className={`text-xs ${complianceStyle?.bgColor || ''} ${complianceStyle?.color || ''}`}>
              {item.idea_compliance_level}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
          <div className="flex flex-wrap gap-1">
            {item.domains.slice(0, 3).map(d => (
              <Badge key={d} variant="outline" className="text-xs">{DOMAIN_DISPLAY[d] || d}</Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="ghost" onClick={() => onAction(item, 'existing')} title="Mark as Existing">
            <CheckCircle2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction(item, 'considering')} title="Save as Considering">
            <Clock className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onAction(item, 'rejected')} title="Reject">
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
