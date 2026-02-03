import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Tag, FolderOpen, DollarSign, MapPin, Settings, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ClientCaseAttribute } from '@/types/clientProfile';

interface TagsCaseAttributesTabProps {
  clientId: string;
  caseAttributes: ClientCaseAttribute[];
  onRefetch: () => void;
}

const ATTRIBUTE_TYPES = [
  { value: 'program', label: 'Program', icon: FolderOpen, color: 'bg-blue-100 text-blue-800' },
  { value: 'funding_source', label: 'Funding Source', icon: DollarSign, color: 'bg-green-100 text-green-800' },
  { value: 'priority', label: 'Priority', icon: Tag, color: 'bg-orange-100 text-orange-800' },
  { value: 'region', label: 'Region', icon: MapPin, color: 'bg-purple-100 text-purple-800' },
  { value: 'custom', label: 'Custom', icon: Settings, color: 'bg-gray-100 text-gray-800' },
];

const PREDEFINED_VALUES: Record<string, string[]> = {
  program: ['Early Intervention', 'School-Based', 'Home-Based', 'Clinic-Based', 'Community', 'Intensive'],
  funding_source: ['Private Insurance', 'Medicaid', 'Regional Center', 'School District', 'Self-Pay', 'Grant'],
  priority: ['High', 'Medium', 'Low', 'Urgent', 'Waitlist'],
  region: ['North', 'South', 'East', 'West', 'Central', 'Remote'],
};

export function TagsCaseAttributesTab({ clientId, caseAttributes, onRefetch }: TagsCaseAttributesTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    attribute_type: '',
    attribute_key: '',
    attribute_value: '',
  });

  const handleAddAttribute = async () => {
    if (!formData.attribute_type || !formData.attribute_value) {
      toast.error('Attribute type and value are required');
      return;
    }

    try {
      const { error } = await supabase.from('client_case_attributes').insert({
        client_id: clientId,
        attribute_type: formData.attribute_type,
        attribute_key: formData.attribute_key || formData.attribute_type,
        attribute_value: formData.attribute_value,
      });

      if (error) throw error;
      toast.success('Attribute added');
      setIsAddDialogOpen(false);
      setFormData({ attribute_type: '', attribute_key: '', attribute_value: '' });
      onRefetch();
    } catch (error) {
      console.error('Error adding attribute:', error);
      toast.error('Failed to add attribute');
    }
  };

  const handleRemoveAttribute = async (attributeId: string) => {
    try {
      const { error } = await supabase
        .from('client_case_attributes')
        .delete()
        .eq('id', attributeId);

      if (error) throw error;
      toast.success('Attribute removed');
      onRefetch();
    } catch (error) {
      toast.error('Failed to remove attribute');
    }
  };

  const groupedAttributes = caseAttributes.reduce((acc, attr) => {
    if (!acc[attr.attribute_type]) acc[attr.attribute_type] = [];
    acc[attr.attribute_type].push(attr);
    return acc;
  }, {} as Record<string, ClientCaseAttribute[]>);

  const getTypeConfig = (type: string) => {
    return ATTRIBUTE_TYPES.find(t => t.value === type) || ATTRIBUTE_TYPES[4]; // Default to custom
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tags & Case Attributes</h3>
          <p className="text-sm text-muted-foreground">
            Categorize and organize this case with custom attributes
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Attribute
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Case Attribute</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Attribute Type *</Label>
                <Select
                  value={formData.attribute_type}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    attribute_type: value,
                    attribute_value: '' 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTRIBUTE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.attribute_type === 'custom' && (
                <div className="space-y-2">
                  <Label>Custom Key</Label>
                  <Input
                    value={formData.attribute_key}
                    onChange={(e) => setFormData({ ...formData, attribute_key: e.target.value })}
                    placeholder="e.g., Cohort, Wave, Team"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Value *</Label>
                {formData.attribute_type && PREDEFINED_VALUES[formData.attribute_type] ? (
                  <Select
                    value={formData.attribute_value}
                    onValueChange={(value) => setFormData({ ...formData, attribute_value: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select value" />
                    </SelectTrigger>
                    <SelectContent>
                      {PREDEFINED_VALUES[formData.attribute_type].map((value) => (
                        <SelectItem key={value} value={value}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.attribute_value}
                    onChange={(e) => setFormData({ ...formData, attribute_value: e.target.value })}
                    placeholder="Enter value"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddAttribute}>Add</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grouped Attributes */}
      {caseAttributes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No attributes assigned yet. Click "Add Attribute" to categorize this case.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ATTRIBUTE_TYPES.map((type) => {
            const attrs = groupedAttributes[type.value] || [];
            if (attrs.length === 0) return null;
            
            const Icon = type.icon;
            return (
              <Card key={type.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {type.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {attrs.map((attr) => (
                      <Badge
                        key={attr.id}
                        className={`${type.color} group`}
                      >
                        {attr.attribute_key !== attr.attribute_type && (
                          <span className="opacity-70">{attr.attribute_key}: </span>
                        )}
                        {attr.attribute_value}
                        <button
                          onClick={() => handleRemoveAttribute(attr.id)}
                          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Add Common Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Add</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['Early Intervention', 'Home-Based', 'Private Insurance', 'High Priority'].map((tag) => {
              const exists = caseAttributes.some(a => a.attribute_value === tag);
              return (
                <Badge
                  key={tag}
                  variant={exists ? 'default' : 'outline'}
                  className={`cursor-pointer ${exists ? 'opacity-50' : 'hover:bg-primary/10'}`}
                  onClick={async () => {
                    if (exists) return;
                    const type = PREDEFINED_VALUES.program.includes(tag) ? 'program' :
                                 PREDEFINED_VALUES.funding_source.includes(tag) ? 'funding_source' :
                                 PREDEFINED_VALUES.priority.includes(tag) ? 'priority' : 'custom';
                    
                    try {
                      const { error } = await supabase.from('client_case_attributes').insert({
                        client_id: clientId,
                        attribute_type: type,
                        attribute_key: type,
                        attribute_value: tag,
                      });
                      if (error) throw error;
                      toast.success(`Added: ${tag}`);
                      onRefetch();
                    } catch (error) {
                      toast.error('Failed to add attribute');
                    }
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
