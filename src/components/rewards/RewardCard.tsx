import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Package, Archive, DollarSign, RefreshCw } from "lucide-react";
import type { RewardItem } from "@/hooks/useRewardEconomy";

interface RewardCardProps {
  reward: RewardItem;
  onClick: () => void;
  onRestock?: () => void;
  onArchive?: () => void;
  onOverride?: () => void;
}

export function RewardCard({ reward, onClick, onRestock, onArchive, onOverride }: RewardCardProps) {
  const currentPrice = reward.computed_price ?? reward.cost;
  const basePrice = reward.base_cost ?? reward.cost;
  const isHot = currentPrice > basePrice;
  const isSale = currentPrice < basePrice;
  const isLimited = reward.is_limited && (reward.quantity_available ?? 0) <= 3;
  const isOutOfStock = reward.is_limited && (reward.quantity_available ?? 0) === 0;

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 relative overflow-hidden"
      onClick={onClick}
    >
      {isOutOfStock && (
        <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center">
          <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="text-3xl">{reward.emoji || "🎁"}</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onOverride}>
                <DollarSign className="h-3.5 w-3.5 mr-2" /> Override Price
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRestock}>
                <RefreshCw className="h-3.5 w-3.5 mr-2" /> Restock
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="h-3.5 w-3.5 mr-2" /> Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Name */}
        <p className="font-semibold text-sm truncate">{reward.name}</p>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-primary">{currentPrice} pts</span>
          {currentPrice !== basePrice && (
            <span className="text-xs text-muted-foreground line-through">{basePrice} pts</span>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1">
          {isHot && <Badge className="bg-orange-500/15 text-orange-600 text-[10px] h-5">🔥 Hot</Badge>}
          {isSale && <Badge className="bg-emerald-500/15 text-emerald-600 text-[10px] h-5">💰 Sale</Badge>}
          {isLimited && !isOutOfStock && (
            <Badge className="bg-amber-500/15 text-amber-600 text-[10px] h-5">
              <Package className="h-2.5 w-2.5 mr-0.5" /> {reward.quantity_available} left
            </Badge>
          )}
          {reward.tier === "premium" && <Badge className="bg-purple-500/15 text-purple-600 text-[10px] h-5">⭐ Premium</Badge>}
          {reward.tier === "limited" && <Badge className="bg-rose-500/15 text-rose-600 text-[10px] h-5">🔒 Limited</Badge>}
          {reward.reward_type === "classroom" && <Badge variant="outline" className="text-[10px] h-5">Classroom</Badge>}
          {reward.reward_type === "schoolwide" && <Badge variant="outline" className="text-[10px] h-5">Schoolwide</Badge>}
        </div>

        {/* Reason hint */}
        {reward.price_reason && (
          <p className="text-[10px] text-muted-foreground italic truncate">{reward.price_reason}</p>
        )}
      </CardContent>
    </Card>
  );
}
