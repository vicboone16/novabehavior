import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useReportBranding } from '@/hooks/useReportBranding';
import { ContactInfo } from '@/types/reportBranding';
import { Loader2, Upload, Palette } from 'lucide-react';

interface ReportBrandingEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingBranding?: {
    id: string;
    organization_name: string;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
    footer_text: string | null;
    contact_info: ContactInfo | null;
    is_default: boolean;
  };
}

export function ReportBrandingEditor({
  open,
  onOpenChange,
  existingBranding,
}: ReportBrandingEditorProps) {
  const { createBranding, updateBranding } = useReportBranding();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    organization_name: existingBranding?.organization_name || '',
    logo_url: existingBranding?.logo_url || '',
    primary_color: existingBranding?.primary_color || '#3B82F6',
    secondary_color: existingBranding?.secondary_color || '#1E40AF',
    footer_text: existingBranding?.footer_text || '',
    is_default: existingBranding?.is_default || false,
    contact_phone: existingBranding?.contact_info?.phone || '',
    contact_email: existingBranding?.contact_info?.email || '',
    contact_address: existingBranding?.contact_info?.address || '',
    contact_website: existingBranding?.contact_info?.website || '',
  });

  const handleSubmit = async () => {
    if (!formData.organization_name.trim()) return;

    setIsSubmitting(true);

    const contactInfo: ContactInfo = {
      phone: formData.contact_phone.trim() || undefined,
      email: formData.contact_email.trim() || undefined,
      address: formData.contact_address.trim() || undefined,
      website: formData.contact_website.trim() || undefined,
    };

    const brandingData = {
      organization_name: formData.organization_name.trim(),
      logo_url: formData.logo_url.trim() || undefined,
      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
      footer_text: formData.footer_text.trim() || undefined,
      contact_info: Object.keys(contactInfo).length > 0 ? contactInfo : undefined,
      is_default: formData.is_default,
    };

    if (existingBranding) {
      await updateBranding(existingBranding.id, brandingData);
    } else {
      await createBranding(brandingData);
    }

    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existingBranding ? 'Edit Branding' : 'Create Report Branding'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label>Organization Name *</Label>
            <Input
              value={formData.organization_name}
              onChange={(e) => setFormData(prev => ({ ...prev, organization_name: e.target.value }))}
              placeholder="ABC Behavioral Services"
            />
          </div>

          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input
              value={formData.logo_url}
              onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              Enter a URL to your organization's logo (recommended: 200x60px)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Primary Color
              </Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.primary_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Secondary Color
              </Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.secondary_color}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div 
            className="border rounded-lg p-4"
            style={{ borderColor: formData.primary_color }}
          >
            <div className="flex items-center gap-3 mb-3">
              {formData.logo_url && (
                <img 
                  src={formData.logo_url} 
                  alt="Logo" 
                  className="h-8 object-contain"
                  onError={(e) => e.currentTarget.style.display = 'none'}
                />
              )}
              <span 
                className="font-bold"
                style={{ color: formData.primary_color }}
              >
                {formData.organization_name || 'Organization Name'}
              </span>
            </div>
            <div 
              className="h-2 rounded"
              style={{ backgroundColor: formData.secondary_color }}
            />
          </div>

          <div className="space-y-2">
            <Label>Footer Text</Label>
            <Textarea
              value={formData.footer_text}
              onChange={(e) => setFormData(prev => ({ ...prev, footer_text: e.target.value }))}
              placeholder="Confidential - For educational purposes only"
              rows={2}
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Contact Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={formData.contact_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="info@example.com"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Address</Label>
                <Input
                  value={formData.contact_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_address: e.target.value }))}
                  placeholder="123 Main St, City, State 12345"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Website</Label>
                <Input
                  value={formData.contact_website}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_website: e.target.value }))}
                  placeholder="https://www.example.com"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <Label>Set as Default</Label>
              <p className="text-xs text-muted-foreground">
                Use this branding for all new reports
              </p>
            </div>
            <Switch
              checked={formData.is_default}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.organization_name.trim()}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {existingBranding ? 'Update' : 'Create'} Branding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
