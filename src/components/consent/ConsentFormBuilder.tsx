import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Trash2,
  GripVertical,
  FileText,
  Type,
  Mail,
  Phone,
  Calendar,
  AlignLeft,
  CheckSquare,
  List,
  Pen,
  Eye,
  Save,
  Loader2,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'textarea' | 'checkbox' | 'select';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  description?: string;
}

interface SignatureZone {
  id: string;
  label: string;
  required: boolean;
  description?: string;
}

interface ConsentFormTemplate {
  id: string;
  name: string;
  description?: string;
  form_type: string;
  fields: FormField[];
  signature_zones: SignatureZone[];
  version: number;
  is_active: boolean;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'textarea', label: 'Long Text', icon: AlignLeft },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { value: 'select', label: 'Dropdown', icon: List },
];

const FORM_TYPES = [
  { value: 'consent', label: 'Consent Form' },
  { value: 'intake', label: 'Intake Form' },
  { value: 'roi', label: 'Release of Information' },
  { value: 'service_agreement', label: 'Service Agreement' },
];

export function ConsentFormBuilder() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ConsentFormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<ConsentFormTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('fields');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formType, setFormType] = useState('consent');
  const [fields, setFields] = useState<FormField[]>([]);
  const [signatureZones, setSignatureZones] = useState<SignatureZone[]>([
    { id: 'primary', label: 'Parent/Guardian Signature', required: true }
  ]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('consent_form_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setTemplates((data || []).map(t => ({
        ...t,
        fields: (t.fields as unknown) as FormField[],
        signature_zones: (t.signature_zones as unknown) as SignatureZone[]
      })));
    } catch (err) {
      console.error('Error loading templates:', err);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const openNewTemplate = () => {
    setCurrentTemplate(null);
    setName('');
    setDescription('');
    setFormType('consent');
    setFields([]);
    setSignatureZones([{ id: 'primary', label: 'Parent/Guardian Signature', required: true }]);
    setActiveTab('fields');
    setEditDialogOpen(true);
  };

  const openEditTemplate = (template: ConsentFormTemplate) => {
    setCurrentTemplate(template);
    setName(template.name);
    setDescription(template.description || '');
    setFormType(template.form_type);
    setFields(template.fields);
    setSignatureZones(template.signature_zones);
    setActiveTab('fields');
    setEditDialogOpen(true);
  };

  const addField = (type: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: type as FormField['type'],
      label: `New ${type} field`,
      required: false,
      placeholder: '',
      options: type === 'select' ? ['Option 1', 'Option 2'] : undefined
    };
    setFields([...fields, newField]);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
  };

  const removeField = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId));
  };

  const addSignatureZone = () => {
    const newZone: SignatureZone = {
      id: `sig_${Date.now()}`,
      label: 'Additional Signature',
      required: false
    };
    setSignatureZones([...signatureZones, newZone]);
  };

  const updateSignatureZone = (zoneId: string, updates: Partial<SignatureZone>) => {
    setSignatureZones(signatureZones.map(z => z.id === zoneId ? { ...z, ...updates } : z));
  };

  const removeSignatureZone = (zoneId: string) => {
    setSignatureZones(signatureZones.filter(z => z.id !== zoneId));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      setSaving(true);

      const templateData = {
        name: name.trim(),
        description: description.trim() || null,
        form_type: formType,
        fields: fields as unknown as any,
        signature_zones: signatureZones as unknown as any,
        created_by: user?.id
      };

      if (currentTemplate) {
        // Update existing
        const { error } = await supabase
          .from('consent_form_templates')
          .update({
            ...templateData,
            version: currentTemplate.version + 1
          })
          .eq('id', currentTemplate.id);

        if (error) throw error;
        toast.success('Template updated');
      } else {
        // Create new
        const { error } = await supabase
          .from('consent_form_templates')
          .insert([templateData]);

        if (error) throw error;
        toast.success('Template created');
      }

      setEditDialogOpen(false);
      loadTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const toggleTemplateActive = async (template: ConsentFormTemplate) => {
    try {
      const { error } = await supabase
        .from('consent_form_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;
      toast.success(template.is_active ? 'Template deactivated' : 'Template activated');
      loadTemplates();
    } catch (err) {
      console.error('Error toggling template:', err);
      toast.error('Failed to update template');
    }
  };

  const renderFieldIcon = (type: string) => {
    const fieldType = FIELD_TYPES.find(f => f.value === type);
    const Icon = fieldType?.icon || Type;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Consent Form Templates</h2>
          <p className="text-muted-foreground">Create and manage consent and intake form templates</p>
        </div>
        <Button onClick={openNewTemplate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">No Templates Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first consent form template to get started
            </p>
            <Button onClick={openNewTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </div>
                  <Badge variant={template.is_active ? 'default' : 'secondary'}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {template.description && (
                  <CardDescription className="mt-1">{template.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span>{template.fields.length} fields</span>
                  <span>•</span>
                  <span>{template.signature_zones.length} signature(s)</span>
                  <span>•</span>
                  <span>v{template.version}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditTemplate(template)}
                    className="flex-1"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleTemplateActive(template)}
                  >
                    {template.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Editor Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentTemplate ? 'Edit Template' : 'New Template'}
            </DialogTitle>
            <DialogDescription>
              Configure form fields and signature requirements
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name *</Label>
                <Input
                  id="template-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., General Consent Form"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-type">Form Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this form..."
                rows={2}
              />
            </div>

            {/* Tabs for Fields and Signatures */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fields" className="gap-2">
                  <Type className="h-4 w-4" />
                  Form Fields ({fields.length})
                </TabsTrigger>
                <TabsTrigger value="signatures" className="gap-2">
                  <Pen className="h-4 w-4" />
                  Signatures ({signatureZones.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="fields" className="space-y-4">
                {/* Add Field Buttons */}
                <div className="flex flex-wrap gap-2">
                  {FIELD_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      variant="outline"
                      size="sm"
                      onClick={() => addField(type.value)}
                      className="gap-1"
                    >
                      <type.icon className="h-3 w-3" />
                      {type.label}
                    </Button>
                  ))}
                </div>

                {/* Field List */}
                {fields.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No fields added yet</p>
                    <p className="text-sm text-muted-foreground">Click buttons above to add fields</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="mt-2 text-muted-foreground">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            {renderFieldIcon(field.type)}
                            <Input
                              value={field.label}
                              onChange={(e) => updateField(field.id, { label: e.target.value })}
                              placeholder="Field label"
                              className="flex-1"
                            />
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Required</Label>
                              <Switch
                                checked={field.required}
                                onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeField(field.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          {field.type === 'select' && (
                            <Input
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => updateField(field.id, { 
                                options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                              })}
                              placeholder="Options (comma-separated)"
                              className="text-sm"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="signatures" className="space-y-4">
                <Button variant="outline" size="sm" onClick={addSignatureZone}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Signature Zone
                </Button>

                <div className="space-y-3">
                  {signatureZones.map((zone) => (
                    <div key={zone.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Pen className="h-4 w-4 mt-2 text-muted-foreground" />
                      <div className="flex-1 space-y-2">
                        <Input
                          value={zone.label}
                          onChange={(e) => updateSignatureZone(zone.id, { label: e.target.value })}
                          placeholder="Signature label"
                        />
                        <Input
                          value={zone.description || ''}
                          onChange={(e) => updateSignatureZone(zone.id, { description: e.target.value })}
                          placeholder="Description (optional)"
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Required</Label>
                        <Switch
                          checked={zone.required}
                          onCheckedChange={(checked) => updateSignatureZone(zone.id, { required: checked })}
                        />
                      </div>
                      {signatureZones.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSignatureZone(zone.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
