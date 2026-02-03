import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { MapPin, Navigation, Car, Bus, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
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
  const [geocoding, setGeocoding] = useState(false);
  const [address, setAddress] = useState(profile.home_base_address || '');
  const [radius, setRadius] = useState(profile.max_travel_radius_miles || 15);
  const [buffer, setBuffer] = useState(profile.min_buffer_minutes || 15);
  const [transportMethod, setTransportMethod] = useState(profile.transportation_method || 'car');

  const handleGeocode = async () => {
    if (!address.trim()) {
      toast.error('Please enter an address');
      return;
    }

    setGeocoding(true);
    try {
      // Use OpenStreetMap Nominatim for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();

      if (data.length === 0) {
        toast.error('Address not found. Please try a more specific address.');
        return;
      }

      const { lat, lon, display_name } = data[0];
      
      const success = await updateProfile({
        home_base_address: display_name,
        geocode_lat: parseFloat(lat),
        geocode_lng: parseFloat(lon),
        geocode_status: 'success',
      });

      if (success) {
        setAddress(display_name);
        toast.success('Address geocoded successfully');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Failed to geocode address');
    } finally {
      setGeocoding(false);
    }
  };

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
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your home base address..."
              />
            </div>
            <Button onClick={handleGeocode} disabled={geocoding}>
              {geocoding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Geocoding...
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 mr-2" />
                  Geocode
                </>
              )}
            </Button>
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
