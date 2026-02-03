import { useState } from 'react';
import { Download, FileCheck, Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { StudentIEPSupport, IEPExportOptions } from '@/types/iepLibrary';
import { DOMAIN_DISPLAY_NAMES, SETTING_DISPLAY_NAMES } from '@/types/iepLibrary';

interface IEPExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  existingSupports: StudentIEPSupport[];
  consideringSupports: StudentIEPSupport[];
}

export function IEPExportDialog({
  open,
  onOpenChange,
  studentName,
  existingSupports,
  consideringSupports
}: IEPExportDialogProps) {
  const [options, setOptions] = useState<IEPExportOptions>({
    use_idea_language: true,
    exclude_clinical_notes: true,
    group_by_domain: false,
    separate_accommodations_modifications: true,
    plaafp_ready_phrasing: false,
    language_style: 'district'
  });

  const generateExportText = () => {
    let output = '';

    // Helper to format a support
    const formatSupport = (support: StudentIEPSupport): string => {
      const title = support.library_item?.title || support.custom_title || 'Untitled';
      const description = options.use_idea_language && support.library_item?.export_language?.iep
        ? support.library_item.export_language.iep
        : (support.library_item?.description || support.custom_description || '');
      const settings = (support.setting_tags_override || support.library_item?.setting_tags || [])
        .slice(0, 2)
        .map(s => SETTING_DISPLAY_NAMES[s] || s)
        .join(', ');

      let line = `• ${title}`;
      if (description) {
        line += ` – ${description}`;
      }
      if (settings && !options.exclude_clinical_notes) {
        line += ` (${settings})`;
      }
      return line;
    };

    // Separate accommodations and modifications if requested
    if (options.separate_accommodations_modifications) {
      const existingAccommodations = existingSupports.filter(s => s.item_type === 'accommodation');
      const existingModifications = existingSupports.filter(s => s.item_type === 'modification');
      const consideringAccommodations = consideringSupports.filter(s => s.item_type === 'accommodation');
      const consideringModifications = consideringSupports.filter(s => s.item_type === 'modification');

      if (existingAccommodations.length > 0) {
        output += 'SUPPLEMENTAL AIDS & SERVICES – ACCOMMODATIONS\n';
        output += existingAccommodations.map(formatSupport).join('\n');
        output += '\n\n';
      }

      if (existingModifications.length > 0) {
        output += 'SUPPLEMENTAL AIDS & SERVICES – MODIFICATIONS\n';
        output += existingModifications.map(formatSupport).join('\n');
        output += '\n\n';
      }

      if (consideringAccommodations.length > 0 || consideringModifications.length > 0) {
        output += 'PROPOSED SUPPORTS (UNDER CONSIDERATION)\n';
        if (consideringAccommodations.length > 0) {
          output += 'Accommodations:\n';
          output += consideringAccommodations.map(formatSupport).join('\n');
          output += '\n';
        }
        if (consideringModifications.length > 0) {
          output += 'Modifications:\n';
          output += consideringModifications.map(formatSupport).join('\n');
        }
      }
    } else {
      if (existingSupports.length > 0) {
        output += 'EXISTING SUPPORTS\n';
        output += existingSupports.map(formatSupport).join('\n');
        output += '\n\n';
      }

      if (consideringSupports.length > 0) {
        output += 'PROPOSED SUPPORTS\n';
        output += consideringSupports.map(formatSupport).join('\n');
      }
    }

    return output.trim();
  };

  const handleCopy = async () => {
    const text = generateExportText();
    await navigator.clipboard.writeText(text);
  };

  const handlePrint = () => {
    const text = generateExportText();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>IEP Supports - ${studentName}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
              h1 { font-size: 18px; margin-bottom: 20px; }
              pre { white-space: pre-wrap; font-family: inherit; }
            </style>
          </head>
          <body>
            <h1>IEP Supports for ${studentName}</h1>
            <pre>${text}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const exportText = generateExportText();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export IEP Supports
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 py-4">
          {/* Options */}
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Export Options</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="idea-language"
                  checked={options.use_idea_language}
                  onCheckedChange={(checked) => 
                    setOptions({ ...options, use_idea_language: checked === true })
                  }
                />
                <Label htmlFor="idea-language" className="text-sm font-normal cursor-pointer">
                  Use IDEA-compliant language
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exclude-notes"
                  checked={options.exclude_clinical_notes}
                  onCheckedChange={(checked) => 
                    setOptions({ ...options, exclude_clinical_notes: checked === true })
                  }
                />
                <Label htmlFor="exclude-notes" className="text-sm font-normal cursor-pointer">
                  Exclude internal clinical notes
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="group-domain"
                  checked={options.group_by_domain}
                  onCheckedChange={(checked) => 
                    setOptions({ ...options, group_by_domain: checked === true })
                  }
                />
                <Label htmlFor="group-domain" className="text-sm font-normal cursor-pointer">
                  Group by domain
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="separate-types"
                  checked={options.separate_accommodations_modifications}
                  onCheckedChange={(checked) => 
                    setOptions({ ...options, separate_accommodations_modifications: checked === true })
                  }
                />
                <Label htmlFor="separate-types" className="text-sm font-normal cursor-pointer">
                  Separate accommodations and modifications
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="plaafp-ready"
                  checked={options.plaafp_ready_phrasing}
                  onCheckedChange={(checked) => 
                    setOptions({ ...options, plaafp_ready_phrasing: checked === true })
                  }
                />
                <Label htmlFor="plaafp-ready" className="text-sm font-normal cursor-pointer">
                  PLAAFP-ready phrasing
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Language Style</Label>
              <RadioGroup
                value={options.language_style}
                onValueChange={(v) => setOptions({ ...options, language_style: v as any })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="clinical" id="lang-clinical" />
                  <Label htmlFor="lang-clinical" className="text-sm font-normal cursor-pointer">
                    Clinical (internal)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="district" id="lang-district" />
                  <Label htmlFor="lang-district" className="text-sm font-normal cursor-pointer">
                    District-friendly (IEP)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="parent" id="lang-parent" />
                  <Label htmlFor="lang-parent" className="text-sm font-normal cursor-pointer">
                    Parent-friendly
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preview</Label>
            <ScrollArea className="h-64 border rounded-md">
              <Textarea
                value={exportText}
                readOnly
                className="min-h-full border-0 resize-none font-mono text-xs"
              />
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleCopy}>
            <FileCheck className="w-4 h-4 mr-2" />
            Copy to Clipboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
