import { useState, useRef } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Palette, X, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, SVG)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Logo must be under 2MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('report-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('report-logos')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, logo_url: publicUrl }));

      toast({
        title: 'Logo uploaded',
        description: 'Your logo has been uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload logo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo_url: '' }));
  };

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

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Logo</Label>
            {formData.logo_url ? (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                <img
                  src={formData.logo_url}
                  alt="Logo preview"
                  className="h-10 max-w-[120px] object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="text-xs text-muted-foreground flex-1 truncate">
                  {formData.logo_url}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleRemoveLogo}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isUploading ? 'Uploading...' : 'Upload Logo'}
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <p className="text-xs text-muted-foreground">
              Upload an image (PNG, JPG, SVG) — max 2MB. Recommended: 200×60px.
            </p>
            {!formData.logo_url && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Or paste a URL:</Label>
                <Input
                  value={formData.logo_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                  className="text-sm"
                />
              </div>
            )}
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
              {formData.logo_url ? (
                <img
                  src={formData.logo_url}
                  alt="Logo"
                  className="h-8 object-contain"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <Image className="w-8 h-8 text-muted-foreground/30" />
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
