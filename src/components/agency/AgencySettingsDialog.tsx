import { useState, useEffect } from 'react';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Building2, 
  MapPin, 
  Loader2, 
  Save,
  Plus,
  Trash2,
  Phone,
  Globe,
  FileText,
  Palette,
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { AgencyInviteCodesTab } from './AgencyInviteCodesTab';

interface AgencyLocation {
  id: string;
  agency_id: string;
  name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  location_type: string;
  geocode_lat: number | null;
  geocode_lng: number | null;
  phone: string | null;
  is_active: boolean;
  is_default: boolean;
  notes: string | null;
}

interface AgencySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgencySettingsDialog({ open, onOpenChange }: AgencySettingsDialogProps) {
  const { currentAgency, refreshAgencies } = useAgencyContext();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  
  // Agency info
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    npi: '',
    tax_id: '',
    phone: '',
    email: '',
    website: '',
    timezone: 'America/New_York',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    billing_address_line1: '',
    billing_address_city: '',
    billing_address_state: '',
    billing_address_zip: '',
    logo_url: '',
    primary_color: '#3B82F6',
  });

  // Locations
  const [locations, setLocations] = useState<AgencyLocation[]>([]);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: '',
    address_line1: '',
    city: '',
    state: '',
    zip_code: '',
    location_type: 'office',
    phone: '',
    geocode_lat: null as number | null,
    geocode_lng: null as number | null,
  });

  useEffect(() => {
    if (open && currentAgency) {
      loadAgencyData();
    }
  }, [open, currentAgency]);

  const loadAgencyData = async () => {
    if (!currentAgency) return;
    setLoading(true);
    
    try {
      // Load full agency details
      const { data: agency } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', currentAgency.id)
        .single();

      if (agency) {
        setFormData({
          name: agency.name || '',
          legal_name: agency.legal_name || '',
          npi: agency.npi || '',
          tax_id: agency.tax_id || '',
          phone: agency.phone || '',
          email: agency.email || '',
          website: agency.website || '',
          timezone: agency.timezone || 'America/New_York',
          address_line1: agency.address_line1 || '',
          address_line2: agency.address_line2 || '',
          city: agency.city || '',
          state: agency.state || '',
          zip_code: agency.zip_code || '',
          billing_address_line1: agency.billing_address_line1 || '',
          billing_address_city: agency.billing_address_city || '',
          billing_address_state: agency.billing_address_state || '',
          billing_address_zip: agency.billing_address_zip || '',
          logo_url: agency.logo_url || '',
          primary_color: agency.primary_color || '#3B82F6',
        });
      }

      // Load locations
      const { data: locs } = await supabase
        .from('agency_locations')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .order('is_default', { ascending: false })
        .order('name');

      if (locs) {
        setLocations(locs as AgencyLocation[]);
      }
    } catch (error) {
      console.error('Error loading agency data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentAgency) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('agencies')
        .update({
          name: formData.name,
          legal_name: formData.legal_name || null,
          npi: formData.npi || null,
          tax_id: formData.tax_id || null,
          phone: formData.phone || null,
          email: formData.email || null,
          website: formData.website || null,
          timezone: formData.timezone || null,
          address_line1: formData.address_line1 || null,
          address_line2: formData.address_line2 || null,
          city: formData.city || null,
          state: formData.state || null,
          zip_code: formData.zip_code || null,
          billing_address_line1: formData.billing_address_line1 || null,
          billing_address_city: formData.billing_address_city || null,
          billing_address_state: formData.billing_address_state || null,
          billing_address_zip: formData.billing_address_zip || null,
          logo_url: formData.logo_url || null,
          primary_color: formData.primary_color || null,
        })
        .eq('id', currentAgency.id);

      if (error) throw error;

      toast.success('Agency settings saved');
      refreshAgencies();
    } catch (error) {
      console.error('Error saving agency:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = async () => {
    if (!currentAgency || !newLocation.name.trim()) return;
    
    try {
      const { error } = await supabase
        .from('agency_locations')
        .insert({
          agency_id: currentAgency.id,
          name: newLocation.name.trim(),
          address_line1: newLocation.address_line1 || null,
          city: newLocation.city || null,
          state: newLocation.state || null,
          zip_code: newLocation.zip_code || null,
          location_type: newLocation.location_type,
          phone: newLocation.phone || null,
          geocode_lat: newLocation.geocode_lat,
          geocode_lng: newLocation.geocode_lng,
          geocode_status: newLocation.geocode_lat ? 'success' : 'pending',
          is_default: locations.length === 0,
        });

      if (error) throw error;

      toast.success('Location added');
      setShowAddLocation(false);
      setNewLocation({
        name: '',
        address_line1: '',
        city: '',
        state: '',
        zip_code: '',
        location_type: 'office',
        phone: '',
        geocode_lat: null,
        geocode_lng: null,
      });
      loadAgencyData();
    } catch (error) {
      console.error('Error adding location:', error);
      toast.error('Failed to add location');
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('agency_locations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Location deleted');
      loadAgencyData();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Failed to delete location');
    }
  };

  const handleSetDefaultLocation = async (id: string) => {
    if (!currentAgency) return;
    
    try {
      // Clear all defaults first
      await supabase
        .from('agency_locations')
        .update({ is_default: false })
        .eq('agency_id', currentAgency.id);

      // Set new default
      const { error } = await supabase
        .from('agency_locations')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      toast.success('Default location updated');
      loadAgencyData();
    } catch (error) {
      console.error('Error setting default:', error);
    }
  };

  const handleToggleLocationActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('agency_locations')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      loadAgencyData();
    } catch (error) {
      console.error('Error toggling location:', error);
    }
  };

  if (!currentAgency) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Agency Settings - {currentAgency.name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="info">Basic Info</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="locations">Locations</TabsTrigger>
              <TabsTrigger value="invites">Invite Codes</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              {/* Basic Info Tab */}
              <TabsContent value="info" className="space-y-4 m-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Agency Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Legal Name</Label>
                    <Input
                      value={formData.legal_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, legal_name: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>NPI</Label>
                    <Input
                      value={formData.npi}
                      onChange={(e) => setFormData(prev => ({ ...prev, npi: e.target.value }))}
                      placeholder="10-digit NPI"
                    />
                  </div>
                  <div>
                    <Label>Tax ID / EIN</Label>
                    <Input
                      value={formData.tax_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Website</Label>
                    <Input
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://"
                    />
                  </div>
                  <div>
                    <Label>Timezone</Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern</SelectItem>
                        <SelectItem value="America/Chicago">Central</SelectItem>
                        <SelectItem value="America/Denver">Mountain</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Primary Address</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      value={formData.address_line1}
                      onChange={(e) => setFormData(prev => ({ ...prev, address_line1: e.target.value }))}
                      placeholder="Street address"
                    />
                    <Input
                      value={formData.address_line2}
                      onChange={(e) => setFormData(prev => ({ ...prev, address_line2: e.target.value }))}
                      placeholder="Suite, unit, etc."
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="City"
                      />
                      <Input
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="State"
                      />
                      <Input
                        value={formData.zip_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                        placeholder="ZIP"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Billing Address</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      value={formData.billing_address_line1}
                      onChange={(e) => setFormData(prev => ({ ...prev, billing_address_line1: e.target.value }))}
                      placeholder="Billing street address"
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        value={formData.billing_address_city}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_address_city: e.target.value }))}
                        placeholder="City"
                      />
                      <Input
                        value={formData.billing_address_state}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_address_state: e.target.value }))}
                        placeholder="State"
                      />
                      <Input
                        value={formData.billing_address_zip}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_address_zip: e.target.value }))}
                        placeholder="ZIP"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Branding Tab */}
              <TabsContent value="branding" className="space-y-4 m-0">
                <div>
                  <Label>Logo URL</Label>
                  <Input
                    value={formData.logo_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                  />
                  {formData.logo_url && (
                    <div className="mt-3 p-4 bg-muted rounded-lg">
                      <img 
                        src={formData.logo_url} 
                        alt="Logo preview" 
                        className="max-h-24 object-contain"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label>Primary Brand Color</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-32"
                    />
                    <div 
                      className="w-20 h-10 rounded flex items-center justify-center text-white text-sm"
                      style={{ backgroundColor: formData.primary_color }}
                    >
                      Preview
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Locations Tab */}
              <TabsContent value="locations" className="space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Agency locations can be used as templates when adding client service locations.
                  </p>
                  <Button size="sm" onClick={() => setShowAddLocation(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Location
                  </Button>
                </div>

                {locations.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No locations added yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {locations.map((loc) => (
                      <Card key={loc.id} className={!loc.is_active ? 'opacity-60' : ''}>
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{loc.name}</span>
                                {loc.is_default && (
                                  <Badge variant="secondary" className="text-xs">Default</Badge>
                                )}
                                <Badge variant="outline" className="text-xs capitalize">
                                  {loc.location_type}
                                </Badge>
                              </div>
                              {loc.address_line1 && (
                                <p className="text-sm text-muted-foreground">
                                  {loc.address_line1}
                                  {loc.city && `, ${loc.city}`}
                                  {loc.state && `, ${loc.state}`}
                                  {loc.zip_code && ` ${loc.zip_code}`}
                                </p>
                              )}
                              {loc.phone && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {loc.phone}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={loc.is_active}
                                onCheckedChange={() => handleToggleLocationActive(loc.id, loc.is_active)}
                              />
                              {!loc.is_default && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleSetDefaultLocation(loc.id)}
                                >
                                  Set Default
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteLocation(loc.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Add Location Dialog */}
                <Dialog open={showAddLocation} onOpenChange={setShowAddLocation}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Agency Location</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label>Location Name *</Label>
                        <Input
                          value={newLocation.name}
                          onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Main Office, Clinic A"
                        />
                      </div>
                      
                      <div>
                        <Label>Location Type</Label>
                        <Select
                          value={newLocation.location_type}
                          onValueChange={(value) => setNewLocation(prev => ({ ...prev, location_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="office">Office</SelectItem>
                            <SelectItem value="clinic">Clinic</SelectItem>
                            <SelectItem value="school">School</SelectItem>
                            <SelectItem value="community">Community</SelectItem>
                            <SelectItem value="telehealth">Telehealth</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Address</Label>
                        <AddressAutocomplete
                          value={newLocation.address_line1}
                          onSelect={(parsed) => {
                            setNewLocation(prev => ({
                              ...prev,
                              address_line1: parsed.address_line1 || parsed.display_name,
                              city: parsed.city || '',
                              state: parsed.state || '',
                              zip_code: parsed.zip_code || '',
                              geocode_lat: parsed.lat,
                              geocode_lng: parsed.lng,
                            }));
                          }}
                          placeholder="Search for address..."
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <Input
                          value={newLocation.city}
                          onChange={(e) => setNewLocation(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="City"
                        />
                        <Input
                          value={newLocation.state}
                          onChange={(e) => setNewLocation(prev => ({ ...prev, state: e.target.value }))}
                          placeholder="State"
                        />
                        <Input
                          value={newLocation.zip_code}
                          onChange={(e) => setNewLocation(prev => ({ ...prev, zip_code: e.target.value }))}
                          placeholder="ZIP"
                        />
                      </div>

                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={newLocation.phone}
                          onChange={(e) => setNewLocation(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(555) 123-4567"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowAddLocation(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddLocation} disabled={!newLocation.name.trim()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Location
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              {/* Invite Codes Tab */}
              <TabsContent value="invites" className="m-0">
                <AgencyInviteCodesTab agencyId={currentAgency.id} />
              </TabsContent>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
