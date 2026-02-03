import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Briefcase, MapPin, Save, Languages } from 'lucide-react';
import { SERVICE_TYPES, SETTINGS_OPTIONS, LANGUAGES } from '@/types/staffProfile';
import { toast } from 'sonner';

interface StaffServiceCapabilitiesTabProps {
  profile: any;
  updateProfile: (updates: Partial<any>) => Promise<boolean>;
}

export function StaffServiceCapabilitiesTab({ profile, updateProfile }: StaffServiceCapabilitiesTabProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>(
    profile.allowed_service_types || []
  );
  const [selectedSettings, setSelectedSettings] = useState<string[]>(
    profile.settings_willing_to_serve || []
  );
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    profile.languages_spoken || []
  );
  const [saving, setSaving] = useState(false);

  const toggleService = (value: string) => {
    setSelectedServices(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const toggleSetting = (value: string) => {
    setSelectedSettings(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const toggleLanguage = (value: string) => {
    setSelectedLanguages(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateProfile({
        allowed_service_types: selectedServices,
        settings_willing_to_serve: selectedSettings,
        languages_spoken: selectedLanguages,
      });
      
      if (success) {
        toast.success('Service capabilities saved');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Service Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Allowed Service Types
          </CardTitle>
          <CardDescription>
            Services this staff member is qualified and willing to provide
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {SERVICE_TYPES.map(service => (
              <div
                key={service.value}
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedServices.includes(service.value)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleService(service.value)}
              >
                <Checkbox
                  checked={selectedServices.includes(service.value)}
                  onCheckedChange={() => toggleService(service.value)}
                />
                <Label className="cursor-pointer flex-1">{service.label}</Label>
              </div>
            ))}
          </div>

          {selectedServices.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Selected services:</p>
              <div className="flex flex-wrap gap-2">
                {selectedServices.map(s => {
                  const service = SERVICE_TYPES.find(st => st.value === s);
                  return (
                    <Badge key={s} variant="default">
                      {service?.label || s}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Settings Willing to Serve
          </CardTitle>
          <CardDescription>
            Locations where this staff member can provide services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {SETTINGS_OPTIONS.map(setting => (
              <div
                key={setting.value}
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedSettings.includes(setting.value)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleSetting(setting.value)}
              >
                <Checkbox
                  checked={selectedSettings.includes(setting.value)}
                  onCheckedChange={() => toggleSetting(setting.value)}
                />
                <Label className="cursor-pointer flex-1">{setting.label}</Label>
              </div>
            ))}
          </div>

          {selectedSettings.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Selected settings:</p>
              <div className="flex flex-wrap gap-2">
                {selectedSettings.map(s => {
                  const setting = SETTINGS_OPTIONS.find(st => st.value === s);
                  return (
                    <Badge key={s} variant="outline">
                      {setting?.label || s}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Languages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Languages Spoken
          </CardTitle>
          <CardDescription>
            Languages for matching with clients who require specific language support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {LANGUAGES.map(language => (
              <div
                key={language}
                className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                  selectedLanguages.includes(language)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleLanguage(language)}
              >
                <Checkbox
                  checked={selectedLanguages.includes(language)}
                  onCheckedChange={() => toggleLanguage(language)}
                />
                <Label className="cursor-pointer text-sm">{language}</Label>
              </div>
            ))}
          </div>

          {selectedLanguages.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Languages:</p>
              <div className="flex flex-wrap gap-2">
                {selectedLanguages.map(lang => (
                  <Badge key={lang} variant="secondary">
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Service Capabilities'}
      </Button>
    </div>
  );
}
