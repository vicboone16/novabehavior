import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { AddressAutocomplete, type ParsedAddress } from '@/components/ui/address-autocomplete';
import { MapPin, Navigation, Car, Bus, CheckCircle, AlertTriangle, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface StaffTravelGeoTabProps {
  profile: any;
  updateProfile: (updates: Partial<any>) => Promise<boolean>;
}

const TRANSPORT_METHODS = [
  { value: 'car', label: 'Car', icon: Car },
  { value: 'transit', label: 'Public Transit', icon: Bus },
  { value: 'other', label: 'Other', icon: Navigation },
];

export function StaffTravelGeoTab({ profile, updateProfile }: StaffTravelGeoTabProps) {
  const [address, setAddress] = useState(profile.home_base_address || '');
  const [radius, setRadius] = useState(profile.max_travel_radius_miles || 15);
  const [buffer, setBuffer] = useState(profile.min_buffer_minutes || 15);
  const [transportMethod, setTransportMethod] = useState(profile.transportation_method || 'car');
  const [pendingAddress, setPendingAddress] = useState<ParsedAddress | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Sync state when profile changes
  useEffect(() => {
    setAddress(profile.home_base_address || '');
    setRadius(profile.max_travel_radius_miles || 15);
    setBuffer(profile.min_buffer_minutes || 15);
    setTransportMethod(profile.transportation_method || 'car');
  }, [profile]);

  const handleAddressSelect = (parsed: ParsedAddress) => {
    setAddress(parsed.display_name);
    setPendingAddress(parsed);
  };

  const handleSaveAddress = async () => {
    if (!pendingAddress) return;
    
    setSavingAddress(true);
    try {
      const success = await updateProfile({
        home_base_address: pendingAddress.display_name,
        geocode_lat: pendingAddress.lat,
        geocode_lng: pendingAddress.lng,
        geocode_status: 'success',
      });
      
      if (success) {
        toast.success('Address saved and geocoded successfully');
        setPendingAddress(null);
      }
    } catch (error) {
      console.error('Failed to save address:', error);
      toast.error('Failed to save address');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const success = await updateProfile({
        max_travel_radius_miles: radius,
        min_buffer_minutes: buffer,
        transportation_method: transportMethod,
      });
      if (success) {
        toast.success('Travel settings saved');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const geocodeStatus = profile.geocode_status;
  const hasCoordinates = profile.geocode_lat && profile.geocode_lng;

  return (
    <div className="space-y-6 mt-6">
      {/* Home Base Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Home Base Location
          </CardTitle>
          <CardDescription>
            Your starting location for travel distance calculations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Home Base Address</Label>
            <AddressAutocomplete
              value={address}
              onSelect={handleAddressSelect}
              placeholder="Start typing your address..."
            />
            <p className="text-xs text-muted-foreground">
              Type to search, select an address, then click Save Address
            </p>
          </div>

          {/* Pending Address Confirmation */}
          {pendingAddress && (
            <div className="p-3 rounded-lg border border-primary/50 bg-primary/5 space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Selected Address</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {pendingAddress.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Coordinates: {pendingAddress.lat.toFixed(4)}, {pendingAddress.lng.toFixed(4)}
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleSaveAddress} 
                disabled={savingAddress}
                className="w-full"
                size="sm"
              >
                {savingAddress ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Address
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Geocode Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
            {hasCoordinates ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Location Verified</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile.home_base_address || `${profile.geocode_lat?.toFixed(4)}, ${profile.geocode_lng?.toFixed(4)}`}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {geocodeStatus || 'success'}
                </Badge>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-sm">Location Not Set</p>
                  <p className="text-xs text-muted-foreground">
                    Search for an address above and save it
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Travel Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Travel Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max Travel Radius */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Maximum Travel Radius</Label>
              <span className="text-lg font-bold">{radius} miles</span>
            </div>
            <Slider
              value={[radius]}
              onValueChange={(value) => setRadius(value[0])}
              min={5}
              max={50}
              step={5}
            />
            <p className="text-sm text-muted-foreground">
              Sessions outside this radius will require an override with reason
            </p>
          </div>

          {/* Buffer Between Sessions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Minimum Buffer Between Sessions</Label>
              <span className="text-lg font-bold">{buffer} min</span>
            </div>
            <Slider
              value={[buffer]}
              onValueChange={(value) => setBuffer(value[0])}
              min={0}
              max={60}
              step={5}
            />
            <p className="text-sm text-muted-foreground">
              Time needed between sessions for travel and preparation
            </p>
          </div>

          {/* Transportation Method */}
          <div className="space-y-3">
            <Label>Transportation Method</Label>
            <div className="grid grid-cols-3 gap-3">
              {TRANSPORT_METHODS.map(method => {
                const Icon = method.icon;
                return (
                  <Button
                    key={method.value}
                    variant={transportMethod === method.value ? 'default' : 'outline'}
                    className="h-auto py-4 flex flex-col gap-2"
                    onClick={() => setTransportMethod(method.value)}
                  >
                    <Icon className="h-6 w-6" />
                    <span>{method.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <Button onClick={handleSaveSettings} className="w-full" disabled={savingSettings}>
            {savingSettings ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Travel Settings'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Travel Stats */}
      {hasCoordinates && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coverage Area</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{radius}</div>
                <p className="text-sm text-muted-foreground">Miles Radius</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">~{Math.round(3.14 * radius * radius)}</div>
                <p className="text-sm text-muted-foreground">Sq Miles Coverage</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">~{radius * 3}</div>
                <p className="text-sm text-muted-foreground">Est. Max Travel (min)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
