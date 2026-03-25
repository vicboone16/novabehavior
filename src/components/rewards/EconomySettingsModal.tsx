import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings2 } from "lucide-react";
import type { EconomySettings } from "@/hooks/useRewardEconomy";

interface EconomySettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: EconomySettings | null;
  onSave: (s: Partial<EconomySettings>) => void;
}

export function EconomySettingsModal({ open, onClose, settings, onSave }: EconomySettingsModalProps) {
  const [form, setForm] = useState({
    economy_mode: "dynamic",
    dynamic_pricing_enabled: true,
    demand_pricing_enabled: true,
    scarcity_enabled: true,
    underuse_discount_enabled: true,
    bonus_windows_enabled: false,
    overuse_threshold: 5,
    overuse_price_increase: 2,
    underuse_threshold: 0,
    underuse_price_decrease: 1,
    min_price: 1,
    max_price: 999,
    reset_cycle: "weekly",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        economy_mode: settings.economy_mode || "dynamic",
        dynamic_pricing_enabled: settings.dynamic_pricing_enabled,
        demand_pricing_enabled: settings.demand_pricing_enabled,
        scarcity_enabled: settings.scarcity_enabled,
        underuse_discount_enabled: settings.underuse_discount_enabled,
        bonus_windows_enabled: settings.bonus_windows_enabled,
        overuse_threshold: settings.overuse_threshold,
        overuse_price_increase: settings.overuse_price_increase,
        underuse_threshold: settings.underuse_threshold,
        underuse_price_decrease: settings.underuse_price_decrease,
        min_price: settings.min_price,
        max_price: settings.max_price,
        reset_cycle: settings.reset_cycle,
      });
    }
  }, [settings]);

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> Economy Settings
          </DialogTitle>
          <DialogDescription>Configure how reward pricing behaves across your classroom store.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Economy Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Economy Mode</Label>
            <RadioGroup value={form.economy_mode} onValueChange={(v) => update("economy_mode", v)} className="grid grid-cols-3 gap-2">
              {[
                { value: "static", label: "Static", desc: "Fixed prices" },
                { value: "light_dynamic", label: "Light", desc: "Gentle adjustments" },
                { value: "dynamic", label: "Dynamic", desc: "Full economy" },
              ].map((o) => (
                <label key={o.value} className={`flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-colors ${form.economy_mode === o.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                  <RadioGroupItem value={o.value} className="sr-only" />
                  <span className="text-xs font-medium">{o.label}</span>
                  <span className="text-[10px] text-muted-foreground">{o.desc}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* Demand Pricing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Demand Pricing</Label>
              <Switch checked={form.demand_pricing_enabled} onCheckedChange={(v) => update("demand_pricing_enabled", v)} />
            </div>
            {form.demand_pricing_enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Overuse threshold (redemptions/week)</Label>
                  <Input type="number" value={form.overuse_threshold} onChange={(e) => update("overuse_threshold", parseInt(e.target.value) || 0)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Price increase amount</Label>
                  <Input type="number" value={form.overuse_price_increase} onChange={(e) => update("overuse_price_increase", parseInt(e.target.value) || 0)} className="h-8 text-xs" />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Underuse Discount */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Underuse Discount</Label>
              <Switch checked={form.underuse_discount_enabled} onCheckedChange={(v) => update("underuse_discount_enabled", v)} />
            </div>
            {form.underuse_discount_enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Underuse threshold</Label>
                  <Input type="number" value={form.underuse_threshold} onChange={(e) => update("underuse_threshold", parseInt(e.target.value) || 0)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Price decrease amount</Label>
                  <Input type="number" value={form.underuse_price_decrease} onChange={(e) => update("underuse_price_decrease", parseInt(e.target.value) || 0)} className="h-8 text-xs" />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Scarcity */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">Scarcity Pricing</Label>
              <p className="text-[10px] text-muted-foreground">Increase prices when inventory is low</p>
            </div>
            <Switch checked={form.scarcity_enabled} onCheckedChange={(v) => update("scarcity_enabled", v)} />
          </div>

          <Separator />

          {/* Price Bounds */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Price Bounds</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] text-muted-foreground">Global min price</Label>
                <Input type="number" value={form.min_price} onChange={(e) => update("min_price", parseInt(e.target.value) || 1)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Global max price</Label>
                <Input type="number" value={form.max_price} onChange={(e) => update("max_price", parseInt(e.target.value) || 999)} className="h-8 text-xs" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Reset Cycle */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Price Reset Cycle</Label>
            <Select value={form.reset_cycle} onValueChange={(v) => update("reset_cycle", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={() => { onSave(form); onClose(); }}>Save Settings</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
