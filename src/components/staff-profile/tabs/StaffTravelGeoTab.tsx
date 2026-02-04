import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { MapPin, Navigation, Car, Bus, CheckCircle, AlertTriangle } from 'lucide-react';
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

  const handleSaveRadius = async () => {
    const success = await updateProfile({
      max_travel_radius_miles: radius,
      min_buffer_minutes: buffer,
      transportation_method: transportMethod,
    });
    if (success) {
      toast.success('Travel settings saved');
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
              onSelect={async (parsed) => {
                setAddress(parsed.display_name);
                const success = await updateProfile({
                  home_base_address: parsed.display_name,
                  geocode_lat: parsed.lat,
                  geocode_lng: parsed.lng,
                  geocode_status: 'success',
                });
                if (success) {
                  toast.success('Address geocoded successfully');
                }
              }}
              placeholder="Start typing your address..."
            />
            <p className="text-xs text-muted-foreground">Type to search and auto-geocode</p>
          </div>

          {/* Geocode Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
            {hasCoordinates ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-sm">Location Verified</p>
                  <p className="text-xs text-muted-foreground">
                    Coordinates: {profile.geocode_lat?.toFixed(4)}, {profile.geocode_lng?.toFixed(4)}
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto">
                  {geocodeStatus || 'success'}
                </Badge>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-sm">Location Not Set</p>
                  <p className="text-xs text-muted-foreground">
                    Enter an address and click Geocode to set your home base
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

          <Button onClick={handleSaveRadius} className="w-full">
            Save Travel Settings
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
