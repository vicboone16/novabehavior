import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Accessibility, Plus, Edit2, Trash2, CheckCircle, AlertTriangle,
  BookOpen, Clock, Users, Settings2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Accommodation {
  id: string;
  client_id: string;
  category: string;
  title: string;
  description: string;
  implementation_notes: string | null;
  settings: string[];
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  review_date: string | null;
  responsible_staff: string | null;
  created_at: string;
  updated_at: string;
}

const ACCOMMODATION_CATEGORIES = [
  { value: 'presentation', label: 'Presentation', icon: BookOpen },
  { value: 'response', label: 'Response', icon: Edit2 },
  { value: 'setting', label: 'Setting', icon: Settings2 },
  { value: 'timing', label: 'Timing/Scheduling', icon: Clock },
  { value: 'behavioral', label: 'Behavioral', icon: Users },
  { value: 'other', label: 'Other', icon: Accessibility },
];

const SETTING_OPTIONS = [
  'Classroom',
  'Testing',
  'Therapy Sessions',
  'All Settings',
  'Home',
  'Community',
];

interface AccommodationsManagerProps {
  clientId: string;
}

export function AccommodationsManager({ clientId }: AccommodationsManagerProps) {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAccommodation, setSelectedAccommodation] = useState<Accommodation | null>(null);
  
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    implementation_notes: '',
    settings: [] as string[],
    is_active: true,
    start_date: '',
    end_date: '',
    review_date: '',
    responsible_staff: '',
  });

  useEffect(() => {
    loadAccommodations();
  }, [clientId]);

  const loadAccommodations = async () => {
    try {
      const { data, error } = await supabase
        .from('client_accommodations')
        .select('*')
        .eq('client_id', clientId)
        .order('category', { ascending: true });

      if (error) throw error;
      setAccommodations((data as unknown as Accommodation[]) || []);
    } catch (error) {
      console.error('Error loading accommodations:', error);
      setAccommodations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.category || !formData.title) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client_id: clientId,
        category: formData.category,
        title: formData.title,
        description: formData.description || null,
        implementation_notes: formData.implementation_notes || null,
        settings: formData.settings,
        is_active: formData.is_active,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        review_date: formData.review_date || null,
        responsible_staff: formData.responsible_staff || null,
      };

      if (selectedAccommodation) {
        const { error } = await supabase
          .from('client_accommodations')
          .update(payload as any)
          .eq('id', selectedAccommodation.id);

        if (error) throw error;
        toast.success('Accommodation updated');
      } else {
        const { error } = await supabase
          .from('client_accommodations')
          .insert(payload as any);

        if (error) throw error;
        toast.success('Accommodation added');
      }

      setDialogOpen(false);
      resetForm();
      loadAccommodations();
    } catch (error) {
      console.error('Error saving accommodation:', error);
      toast.error('Failed to save accommodation');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccommodation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this accommodation?')) return;
    
    try {
      const { error } = await supabase
        .from('client_accommodations')
        .delete()
        .eq('id', id as any);

      if (error) throw error;
      toast.success('Accommodation deleted');
      loadAccommodations();
    } catch (error) {
      console.error('Error deleting accommodation:', error);
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setSelectedAccommodation(null);
    setFormData({
      category: '',
      title: '',
      description: '',
      implementation_notes: '',
      settings: [],
      is_active: true,
      start_date: '',
      end_date: '',
      review_date: '',
      responsible_staff: '',
    });
  };

  const editAccommodation = (acc: Accommodation) => {
    setSelectedAccommodation(acc);
    setFormData({
      category: acc.category,
      title: acc.title,
      description: acc.description || '',
      implementation_notes: acc.implementation_notes || '',
      settings: acc.settings || [],
      is_active: acc.is_active,
      start_date: acc.start_date || '',
      end_date: acc.end_date || '',
      review_date: acc.review_date || '',
      responsible_staff: acc.responsible_staff || '',
    });
    setDialogOpen(true);
  };

  const toggleSetting = (setting: string) => {
    setFormData(prev => ({
      ...prev,
      settings: prev.settings.includes(setting)
        ? prev.settings.filter(s => s !== setting)
        : [...prev.settings, setting]
    }));
  };

  const activeAccommodations = accommodations.filter(a => a.is_active);
  const inactiveAccommodations = accommodations.filter(a => !a.is_active);

  const getCategoryIcon = (category: string) => {
    const cat = ACCOMMODATION_CATEGORIES.find(c => c.value === category);
    const Icon = cat?.icon || Accessibility;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Accessibility className="h-5 w-5" />
            Accommodations & Modifications
          </h3>
          <p className="text-sm text-muted-foreground">
            {activeAccommodations.length} active accommodations
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Accommodation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedAccommodation ? 'Edit Accommodation' : 'Add Accommodation'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOMMODATION_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label>Active</Label>
                </div>
              </div>

              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Extended time on tests"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Full description of the accommodation..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Implementation Notes</Label>
                <Textarea
                  value={formData.implementation_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, implementation_notes: e.target.value }))}
                  placeholder="How should this be implemented? Any special instructions..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Applicable Settings</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SETTING_OPTIONS.map(setting => (
                    <Badge
                      key={setting}
                      variant={formData.settings.includes(setting) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleSetting(setting)}
                    >
                      {formData.settings.includes(setting) && (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      {setting}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Review Date</Label>
                  <Input
                    type="date"
                    value={formData.review_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, review_date: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Responsible Staff</Label>
                <Input
                  value={formData.responsible_staff}
                  onChange={(e) => setFormData(prev => ({ ...prev, responsible_staff: e.target.value }))}
                  placeholder="Staff member responsible for implementation"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? 'Saving...' : selectedAccommodation ? 'Update' : 'Add Accommodation'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Accommodations List */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeAccommodations.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({inactiveAccommodations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ) : activeAccommodations.length > 0 ? (
            <div className="grid gap-4">
              {ACCOMMODATION_CATEGORIES.map(cat => {
                const catAccommodations = activeAccommodations.filter(a => a.category === cat.value);
                if (catAccommodations.length === 0) return null;
                
                return (
                  <Card key={cat.value}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <cat.icon className="h-4 w-4" />
                        {cat.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {catAccommodations.map(acc => (
                        <AccommodationCard 
                          key={acc.id} 
                          accommodation={acc} 
                          onEdit={editAccommodation}
                          onDelete={deleteAccommodation}
                        />
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Accessibility className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active accommodations</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4 mt-4">
          {inactiveAccommodations.length > 0 ? (
            inactiveAccommodations.map(acc => (
              <AccommodationCard 
                key={acc.id} 
                accommodation={acc} 
                onEdit={editAccommodation}
                onDelete={deleteAccommodation}
              />
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No inactive accommodations</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AccommodationCard({ 
  accommodation, 
  onEdit, 
  onDelete 
}: { 
  accommodation: Accommodation; 
  onEdit: (acc: Accommodation) => void;
  onDelete: (id: string) => void;
}) {
  const needsReview = accommodation.review_date && 
    new Date(accommodation.review_date) <= new Date();

  return (
    <div className="p-3 border rounded-lg bg-background">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{accommodation.title}</span>
            {!accommodation.is_active && (
              <Badge variant="secondary">Inactive</Badge>
            )}
            {needsReview && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Review Due
              </Badge>
            )}
          </div>
          
          {accommodation.description && (
            <p className="text-sm text-muted-foreground mb-2">
              {accommodation.description}
            </p>
          )}
          
          {accommodation.settings && accommodation.settings.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {accommodation.settings.map(setting => (
                <Badge key={setting} variant="outline" className="text-xs">
                  {setting}
                </Badge>
              ))}
            </div>
          )}
          
          {accommodation.implementation_notes && (
            <p className="text-xs text-muted-foreground italic">
              {accommodation.implementation_notes}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(accommodation)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(accommodation.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}
