import { useState, useMemo } from 'react';
import { 
  AlertTriangle, Check, X, ChevronDown, ChevronUp, 
  FileText, ArrowRight, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  ExtractedBackgroundInfo,
  StudentBackgroundInfo 
} from '@/types/behavior';

interface BackgroundImportPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedData: ExtractedBackgroundInfo;
  existingData?: StudentBackgroundInfo;
  onImport: (selectedFields: Partial<StudentBackgroundInfo>) => void;
}

// Field labels for display
const FIELD_LABELS: Record<keyof ExtractedBackgroundInfo, string> = {
  referralReason: 'Referral Reason',
  referralSource: 'Referral Source',
  presentingConcerns: 'Presenting Concerns',
  educationalHistory: 'Educational History',
  previousPlacements: 'Previous Placements',
  diagnoses: 'Diagnoses',
  medicalInfo: 'Medical Information',
  previousBIPs: 'Previous BIPs',
  strategiesTried: 'Strategies Tried',
  whatWorked: 'What Worked',
  whatDidntWork: "What Didn't Work",
  homeEnvironment: 'Home Environment',
  familyStructure: 'Family Structure',
  culturalConsiderations: 'Cultural Considerations',
  behaviorsOfConcernSummary: 'Behaviors of Concern Summary',
};

// Group fields into categories
const FIELD_GROUPS = {
  'Referral Information': ['referralReason', 'referralSource', 'presentingConcerns'],
  'Student History': ['educationalHistory', 'previousPlacements', 'diagnoses', 'medicalInfo'],
  'Previous Interventions': ['previousBIPs', 'strategiesTried', 'whatWorked', 'whatDidntWork'],
  'Family/Home Context': ['homeEnvironment', 'familyStructure', 'culturalConsiderations'],
  'Behaviors of Concern': ['behaviorsOfConcernSummary'],
};

export function BackgroundImportPreview({
  open,
  onOpenChange,
  extractedData,
  existingData,
  onImport,
}: BackgroundImportPreviewProps) {
  // Get all available fields from extracted data
  const availableFields = useMemo(() => {
    return Object.keys(extractedData).filter(
      key => extractedData[key as keyof ExtractedBackgroundInfo]
    ) as (keyof ExtractedBackgroundInfo)[];
  }, [extractedData]);

  const [selectedFields, setSelectedFields] = useState<Set<keyof ExtractedBackgroundInfo>>(
    new Set(availableFields)
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Determine which fields will be overwritten
  const overwriteFields = useMemo(() => {
    return availableFields.filter(field => {
      const existingValue = existingData?.[field as keyof StudentBackgroundInfo];
      return existingValue && existingValue !== extractedData[field];
    });
  }, [availableFields, existingData, extractedData]);

  // Determine which fields are new (not overwriting)
  const newFields = useMemo(() => {
    return availableFields.filter(field => {
      const existingValue = existingData?.[field as keyof StudentBackgroundInfo];
      return !existingValue;
    });
  }, [availableFields, existingData]);

  const toggleField = (field: keyof ExtractedBackgroundInfo) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const selectAll = () => setSelectedFields(new Set(availableFields));
  const deselectAll = () => setSelectedFields(new Set());

  const handleImport = () => {
    const dataToImport: Partial<StudentBackgroundInfo> = {};
    
    selectedFields.forEach(field => {
      const value = extractedData[field];
      if (value) {
        (dataToImport as any)[field] = value;
      }
    });

    dataToImport.updatedAt = new Date();
    onImport(dataToImport);
    onOpenChange(false);
    
    const overwrittenCount = overwriteFields.filter(f => selectedFields.has(f)).length;
    const newCount = newFields.filter(f => selectedFields.has(f)).length;
    
    toast.success(
      `Imported ${selectedFields.size} field(s)` + 
      (overwrittenCount > 0 ? ` (${overwrittenCount} updated)` : '')
    );
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Import Background Information
          </DialogTitle>
          <DialogDescription>
            Select which fields to import. Fields with existing data will be updated.
          </DialogDescription>
        </DialogHeader>

        {/* Warning for overwrites */}
        {overwriteFields.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-600 dark:text-amber-400">
                {overwriteFields.length} field(s) will be overwritten
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                These fields have existing data that will be replaced with the extracted values.
              </p>
            </div>
          </div>
        )}

        {/* Selection actions */}
        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedFields.size} of {availableFields.length} selected
            </Badge>
            {overwriteFields.filter(f => selectedFields.has(f)).length > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-500/50">
                {overwriteFields.filter(f => selectedFields.has(f)).length} to update
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              Deselect All
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3 py-2">
            {Object.entries(FIELD_GROUPS).map(([groupName, fields]) => {
              const groupFields = fields.filter(f => 
                availableFields.includes(f as keyof ExtractedBackgroundInfo)
              ) as (keyof ExtractedBackgroundInfo)[];
              
              if (groupFields.length === 0) return null;
              
              const selectedInGroup = groupFields.filter(f => selectedFields.has(f)).length;
              const overwritesInGroup = groupFields.filter(f => overwriteFields.includes(f)).length;

              return (
                <Collapsible
                  key={groupName}
                  open={expandedGroups[groupName] !== false}
                  onOpenChange={() => toggleGroup(groupName)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-secondary/50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{groupName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {selectedInGroup}/{groupFields.length}
                      </Badge>
                      {overwritesInGroup > 0 && (
                        <Badge variant="outline" className="text-xs text-amber-600">
                          {overwritesInGroup} update
                        </Badge>
                      )}
                    </div>
                    {expandedGroups[groupName] !== false ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pl-2 pt-2">
                    {groupFields.map(field => {
                      const isOverwrite = overwriteFields.includes(field);
                      const isNew = newFields.includes(field);
                      const isSelected = selectedFields.has(field);
                      const extractedValue = extractedData[field];
                      const existingValue = existingData?.[field as keyof StudentBackgroundInfo];

                      return (
                        <div
                          key={field}
                          className={`p-3 rounded-lg border ${
                            isSelected 
                              ? isOverwrite 
                                ? 'bg-amber-500/5 border-amber-500/30' 
                                : 'bg-primary/5 border-primary/30'
                              : 'bg-secondary/20 border-border'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={field}
                              checked={isSelected}
                              onCheckedChange={() => toggleField(field)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Label 
                                  htmlFor={field} 
                                  className="font-medium text-sm cursor-pointer"
                                >
                                  {FIELD_LABELS[field]}
                                </Label>
                                {isNew && (
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    <Plus className="w-3 h-3" />
                                    New
                                  </Badge>
                                )}
                                {isOverwrite && (
                                  <Badge variant="outline" className="text-xs text-amber-600 gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Update
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Show comparison for overwrites */}
                              {isOverwrite && existingValue && (
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-start gap-2">
                                    <span className="text-muted-foreground shrink-0">Current:</span>
                                    <span className="text-red-600 dark:text-red-400 line-through">
                                      {truncateText(String(existingValue))}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <ArrowRight className="w-3 h-3" />
                                  </div>
                                </div>
                              )}
                              
                              {/* Show new value */}
                              <div className="text-sm text-foreground bg-secondary/30 rounded p-2">
                                {extractedValue}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={selectedFields.size === 0}
          >
            <Check className="w-4 h-4 mr-1" />
            Import {selectedFields.size} Field(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
