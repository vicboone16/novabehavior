import { Monitor, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { useMobilePreference, MobilePreference } from '@/hooks/useMobilePreference';
import { Separator } from '@/components/ui/separator';

interface MobileSettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSettingsSheet({ open, onClose }: MobileSettingsSheetProps) {
  const { preference, setMobilePreference } = useMobilePreference();

  const handleDesktopToggle = (checked: boolean) => {
    setMobilePreference(checked ? 'desktop' : 'auto');
    if (checked) {
      onClose();
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>Settings</DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon">
              <X className="w-5 h-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4">
          {/* Desktop View Toggle */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Monitor className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label htmlFor="desktop-mode" className="text-base font-medium cursor-pointer">
                  Use Desktop View
                </Label>
                <p className="text-sm text-muted-foreground">
                  Switch to full desktop interface
                </p>
              </div>
            </div>
            <Switch
              id="desktop-mode"
              checked={preference === 'desktop'}
              onCheckedChange={handleDesktopToggle}
            />
          </div>

          <Separator />

          {/* Current Mode Indicator */}
          <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
            {preference === 'desktop' ? (
              <>
                <Monitor className="w-4 h-4" />
                <span>Desktop mode active</span>
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4" />
                <span>Mobile mode active (auto-detected)</span>
              </>
            )}
          </div>

          {/* Info Text */}
          <p className="text-xs text-muted-foreground">
            Desktop view shows the full interface. You may need to scroll horizontally on smaller screens.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
