import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, DollarSign, TrendingUp, TrendingDown, Package, History } from "lucide-react";
import type { RewardItem, RewardTransaction } from "@/hooks/useRewardEconomy";
import { format } from "date-fns";

interface RewardDetailDrawerProps {
  reward: RewardItem | null;
  open: boolean;
  onClose: () => void;
  transactions: RewardTransaction[];
  onOverridePrice: (rewardId: string, price: number, reason?: string) => void;
  onRestock: (rewardId: string, quantity: number) => void;
  onUpdate: (rewardId: string, updates: Record<string, any>) => void;
}

export function RewardDetailDrawer({
  reward, open, onClose, transactions, onOverridePrice, onRestock, onUpdate,
}: RewardDetailDrawerProps) {
  const [overridePrice, setOverridePrice] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [restockQty, setRestockQty] = useState("5");

  if (!reward) return null;

  const currentPrice = reward.computed_price ?? reward.cost;
  const basePrice = reward.base_cost ?? reward.cost;
  const rewardTxns = transactions.filter((t) => t.reward_id === reward.id).slice(0, 10);

  // Price breakdown
  const demandDelta = currentPrice - basePrice;
  const breakdown: { label: string; value: string; icon: React.ReactNode }[] = [
    { label: "Base cost", value: `${basePrice} pts`, icon: <DollarSign className="h-3.5 w-3.5 text-muted-foreground" /> },
  ];
  if (reward.price_reason?.includes("high demand")) {
    breakdown.push({ label: "High demand", value: `+${demandDelta}`, icon: <TrendingUp className="h-3.5 w-3.5 text-orange-500" /> });
  }
  if (reward.price_reason?.includes("low demand") || reward.price_reason?.includes("underused")) {
    breakdown.push({ label: "Low demand discount", value: `${demandDelta}`, icon: <TrendingDown className="h-3.5 w-3.5 text-emerald-500" /> });
  }
  if (reward.price_reason?.includes("inventory")) {
    breakdown.push({ label: "Scarcity premium", value: "+1–2", icon: <Package className="h-3.5 w-3.5 text-amber-500" /> });
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <div className="overflow-y-auto px-4 pb-6">
          <DrawerHeader className="px-0">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{reward.emoji || "🎁"}</span>
              <div>
                <DrawerTitle>{reward.name}</DrawerTitle>
                <DrawerDescription>{reward.description || "No description"}</DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          {/* Current price & badges */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl font-bold text-primary">{currentPrice} pts</span>
            {currentPrice !== basePrice && (
              <span className="text-sm text-muted-foreground line-through">{basePrice} pts</span>
            )}
            <Badge variant="outline" className="text-[10px]">{reward.tier}</Badge>
            <Badge variant="outline" className="text-[10px]">{reward.reward_type}</Badge>
          </div>

          <Separator className="my-4" />

          {/* Why this price? */}
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" /> Why this price?
            </h4>
            <div className="space-y-1.5 bg-muted/50 rounded-lg p-3">
              {breakdown.map((b, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">{b.icon} {b.label}</span>
                  <span className="font-medium">{b.value}</span>
                </div>
              ))}
              <Separator className="my-1.5" />
              <div className="flex items-center justify-between text-sm font-bold">
                <span>Current total</span>
                <span className="text-primary">{currentPrice} pts</span>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Inventory */}
          <div className="space-y-3 mb-4">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Package className="h-4 w-4" /> Inventory
            </h4>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Limited inventory</Label>
              <Switch
                checked={reward.inventory_enabled}
                onCheckedChange={(v) => onUpdate(reward.id, { inventory_enabled: v })}
              />
            </div>
            {reward.is_limited && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Available: <strong>{reward.quantity_available ?? 0}</strong></span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <Input
                    type="number" min="1" value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="w-16 h-8 text-xs"
                  />
                  <Button size="sm" variant="outline" className="h-8 text-xs"
                    onClick={() => onRestock(reward.id, parseInt(restockQty) || 5)}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Restock
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Controls */}
          <div className="space-y-3 mb-4">
            <h4 className="text-sm font-semibold">Controls</h4>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Dynamic pricing</Label>
              <Switch
                checked={reward.dynamic_pricing_enabled}
                onCheckedChange={(v) => onUpdate(reward.id, { dynamic_pricing_enabled: v })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Min cost</Label>
                <Input type="number" defaultValue={reward.min_cost} className="h-8 text-xs"
                  onBlur={(e) => onUpdate(reward.id, { min_cost: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Max cost</Label>
                <Input type="number" defaultValue={reward.max_cost} className="h-8 text-xs"
                  onBlur={(e) => onUpdate(reward.id, { max_cost: parseInt(e.target.value) || 999 })} />
              </div>
            </div>
            {/* Override */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <Label className="text-xs font-medium">Manual price override</Label>
              <div className="flex gap-2">
                <Input type="number" placeholder="Price" value={overridePrice}
                  onChange={(e) => setOverridePrice(e.target.value)} className="h-8 text-xs flex-1" />
                <Input placeholder="Reason" value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)} className="h-8 text-xs flex-1" />
              </div>
              <Button size="sm" variant="secondary" className="h-8 text-xs w-full"
                disabled={!overridePrice}
                onClick={() => {
                  onOverridePrice(reward.id, parseInt(overridePrice), overrideReason);
                  setOverridePrice(""); setOverrideReason("");
                }}>
                <DollarSign className="h-3 w-3 mr-1" /> Apply Override
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          {/* History */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <History className="h-4 w-4" /> Recent Activity
            </h4>
            {rewardTxns.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No transactions yet</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {rewardTxns.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs p-2 rounded border border-border/50">
                    <div>
                      <span className="font-medium capitalize">{t.transaction_type}</span>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(t.created_at), "MMM d, h:mm a")}</p>
                    </div>
                    {t.point_cost && <Badge variant="outline" className="text-[10px]">{t.point_cost} pts</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
