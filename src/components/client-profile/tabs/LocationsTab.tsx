import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Plus, Pencil, Trash2, CheckCircle2, AlertCircle, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { ClientLocation } from '@/types/clientProfile';

interface LocationsTabProps {
  clientId: string;
  locations: ClientLocation[];
  onRefresh: () => void;
}

const LOCATION_TYPES = [
  { value: 'home', label: 'Home' },
  { value: 'school', label: 'School' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'community', label: 'Community' },
  { value: 'daycare', label: 'Daycare' },
  { value: 'other', label: 'Other' },
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export function LocationsTab({ clientId, locations, onRefresh }: LocationsTabProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ClientLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const [formData, setFormData] = useState({
    location_type: 'home' as ClientLocation['location_type'],
    location_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    is_active: true,
    is_primary_service_site: false,
    onsite_contact_name: '',
    onsite_contact_phone: '',
    onsite_contact_email: '',
    access_instructions: '',
    safety_notes: '',
    parking_notes: '',
    school_hours_only: false,
    geocode_lat: null as number | null,
    geocode_lng: null as number | null,
    geocode_status: 'pending' as ClientLocation['geocode_status'],
  });

  const resetForm = () => {
    setFormData({
      location_type: 'home',
      location_name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip_code: '',
      is_active: true,
      is_primary_service_site: false,
      onsite_contact_name: '',
      onsite_contact_phone: '',
      onsite_contact_email: '',
      access_instructions: '',
      safety_notes: '',
      parking_notes: '',
      school_hours_only: false,
      geocode_lat: null,
      geocode_lng: null,
      geocode_status: 'pending',
    });
    setEditingLocation(null);
  };

  const openEdit = (location: ClientLocation) => {
    setEditingLocation(location);
    setFormData({
      location_type: location.location_type,
      location_name: location.location_name,
      address_line1: location.address_line1,
      address_line2: location.address_line2 || '',
      city: location.city,
      state: location.state,
      zip_code: location.zip_code,
      is_active: location.is_active,
      is_primary_service_site: location.is_primary_service_site,
      onsite_contact_name: location.onsite_contact_name || '',
      onsite_contact_phone: location.onsite_contact_phone || '',
      onsite_contact_email: location.onsite_contact_email || '',
      access_instructions: location.access_instructions || '',
      safety_notes: location.safety_notes || '',
      parking_notes: location.parking_notes || '',
      school_hours_only: location.school_hours_only,
      geocode_lat: location.geocode_lat,
      geocode_lng: location.geocode_lng,
      geocode_status: location.geocode_status,
    });
    setShowDialog(true);
  };

  const geocodeAddress = async () => {
    const address = `${formData.address_line1}, ${formData.city}, ${formData.state} ${formData.zip_code}`;
    
    try {
      setGeocoding(true);
      // Using a free geocoding API (OpenStreetMap Nominatim)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        setFormData({
          ...formData,
          geocode_lat: parseFloat(data[0].lat),
          geocode_lng: parseFloat(data[0].lon),
          geocode_status: 'success',
        });
        toast.success('Address geocoded successfully');
      } else {
        setFormData({ ...formData, geocode_status: 'failed' });
        toast.error('Could not geocode address. Please verify the address or enter coordinates manually.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setFormData({ ...formData, geocode_status: 'failed' });
      toast.error('Geocoding failed');
    } finally {
      setGeocoding(false);
    }
  };

  const handleSave = async () => {
    if (!formData.location_name || !formData.address_line1 || !formData.city || !formData.state || !formData.zip_code) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      
      const locationData = {
        client_id: clientId,
        ...formData,
        address_line2: formData.address_line2 || null,
        onsite_contact_name: formData.onsite_contact_name || null,
        onsite_contact_phone: formData.onsite_contact_phone || null,
        onsite_contact_email: formData.onsite_contact_email || null,
        access_instructions: formData.access_instructions || null,
        safety_notes: formData.safety_notes || null,
        parking_notes: formData.parking_notes || null,
      };

      // If setting as primary, unset other primaries first
      if (formData.is_primary_service_site) {
        await supabase
          .from('client_locations')
          .update({ is_primary_service_site: false })
          .eq('client_id', clientId)
          .neq('id', editingLocation?.id || '');
      }

      if (editingLocation) {
        const { error } = await supabase
          .from('client_locations')
          .update(locationData)
          .eq('id', editingLocation.id);
        if (error) throw error;
        toast.success('Location updated');
      } else {
        const { error } = await supabase
          .from('client_locations')
          .insert(locationData);
        if (error) throw error;
        toast.success('Location added');
      }

      setShowDialog(false);
      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    
    try {
      const { error } = await supabase
        .from('client_locations')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Location deleted');
      onRefresh();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Failed to delete location');
    }
  };

  const activeLocations = locations.filter(l => l.is_active);
  const hasActiveGeocodedLocation = activeLocations.some(l => l.geocode_status === 'success');

  return (
    <div className="space-y-4">
      {!hasActiveGeocodedLocation && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">At least one active geocoded location is required to activate this client.</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Service Locations ({locations.length})</h3>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          Add Location
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {locations.map((location) => (
          <Card key={location.id} className={`${location.is_primary_service_site ? 'ring-2 ring-primary' : ''} ${!location.is_active ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className={`h-5 w-5 ${location.geocode_status === 'success' ? 'text-green-600' : 'text-muted-foreground'}`} />
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {location.location_name}
                      {location.is_primary_service_site && (
                        <Badge variant="default" className="text-xs">Primary</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="capitalize">{location.location_type}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(location)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(location.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {location.address_line1}
                {location.address_line2 && `, ${location.address_line2}`}
                <br />
                {location.city}, {location.state} {location.zip_code}
              </p>
              
              <div className="flex flex-wrap gap-1">
                {location.is_active ? (
                  <Badge variant="outline" className="text-green-700 border-green-300">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
                {location.geocode_status === 'success' ? (
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Geocoded
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-700 border-amber-300">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Geocoded
                  </Badge>
                )}
                {location.school_hours_only && <Badge variant="outline">School Hours Only</Badge>}
              </div>

              {location.onsite_contact_name && (
                <p className="text-xs text-muted-foreground">
                  Contact: {location.onsite_contact_name}
                  {location.onsite_contact_phone && ` • ${location.onsite_contact_phone}`}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Edit Location' : 'Add Location'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location Type <span className="text-destructive">*</span></Label>
                <Select 
                  value={formData.location_type} 
                  onValueChange={(v) => setFormData({ ...formData, location_type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location Name <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  placeholder="e.g., Family Home, Lincoln Elementary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address Line 1 <span className="text-destructive">*</span></Label>
              <Input
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                placeholder="Street address"
              />
            </div>

            <div className="space-y-2">
              <Label>Address Line 2</Label>
              <Input
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                placeholder="Apt, Suite, Unit, etc."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>State <span className="text-destructive">*</span></Label>
                <Select value={formData.state} onValueChange={(v) => setFormData({ ...formData, state: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ZIP Code <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                />
              </div>
            </div>

            {/* Geocoding */}
            <div className="p-3 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  <Label>Geocoding</Label>
                  {formData.geocode_status === 'success' && (
                    <Badge variant="outline" className="text-green-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {formData.geocode_lat?.toFixed(4)}, {formData.geocode_lng?.toFixed(4)}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={geocodeAddress}
                  disabled={geocoding || !formData.address_line1 || !formData.city || !formData.state}
                >
                  {geocoding ? 'Geocoding...' : 'Auto-Geocode'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Geocoding is required for travel time calculations and scheduling optimization.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                />
                <Label>Active Location</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_primary_service_site}
                  onCheckedChange={(c) => setFormData({ ...formData, is_primary_service_site: c })}
                />
                <Label>Primary Service Site</Label>
              </div>
            </div>

            {formData.location_type === 'school' && (
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.school_hours_only}
                  onCheckedChange={(c) => setFormData({ ...formData, school_hours_only: c })}
                />
                <Label>School Hours Only</Label>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Onsite Contact Name</Label>
                <Input
                  value={formData.onsite_contact_name}
                  onChange={(e) => setFormData({ ...formData, onsite_contact_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  value={formData.onsite_contact_phone}
                  onChange={(e) => setFormData({ ...formData, onsite_contact_phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  value={formData.onsite_contact_email}
                  onChange={(e) => setFormData({ ...formData, onsite_contact_email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Access Instructions</Label>
              <Textarea
                value={formData.access_instructions}
                onChange={(e) => setFormData({ ...formData, access_instructions: e.target.value })}
                placeholder="Gate codes, buzzer instructions, where to park, etc."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Parking Notes</Label>
                <Input
                  value={formData.parking_notes}
                  onChange={(e) => setFormData({ ...formData, parking_notes: e.target.value })}
                  placeholder="Driveway, street parking, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Safety Notes</Label>
                <Input
                  value={formData.safety_notes}
                  onChange={(e) => setFormData({ ...formData, safety_notes: e.target.value })}
                  placeholder="Dogs, gates, etc."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
