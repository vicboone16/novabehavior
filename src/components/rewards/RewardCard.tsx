import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Package, Archive, DollarSign, RefreshCw, Eye, EyeOff, Trash2, RotateCcw } from "lucide-react";
import type { RewardItem } from "@/hooks/useRewardEconomy";

interface RewardCardProps {
  reward: RewardItem;
  onClick: () => void;
  onRestock?: () => void;
  onArchive?: () => void;
  onOverride?: () => void;
  onHide?: (hidden: boolean) => void;
  onRestore?: () => void;
  onSoftDelete?: () => void;
  onHardDelete?: () => void;
}

export function RewardCard({ reward, onClick, onRestock, onArchive, onOverride, onHide, onRestore, onSoftDelete, onHardDelete }: RewardCardProps) {
  const currentPrice = reward.computed_price ?? reward.cost;
  const basePrice = reward.base_cost ?? reward.cost;
  const isHot = currentPrice > basePrice;
  const isSale = currentPrice < basePrice;
  const isLimited = reward.is_limited && (reward.quantity_available ?? 0) <= 3;
  const isOutOfStock = reward.is_limited && (reward.quantity_available ?? 0) === 0;
  const isArchived = reward.is_archived;
  const isHidden = reward.is_hidden;
  const isDeleted = !!reward.deleted_at;

  return (
    <Card
      className={`group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 relative overflow-hidden ${
        isArchived || isDeleted ? "opacity-60" : ""
      }`}
      onClick={onClick}
    >
      {isOutOfStock && !isArchived && (
        <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center">
          <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
        </div>
      )}
      {isArchived && (
        <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center">
          <Badge variant="secondary" className="text-xs">Archived</Badge>
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
              <DropdownMenuSeparator />
              {isHidden ? (
                <DropdownMenuItem onClick={() => onHide?.(false)}>
                  <Eye className="h-3.5 w-3.5 mr-2" /> Unhide
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onHide?.(true)}>
                  <EyeOff className="h-3.5 w-3.5 mr-2" /> Hide from Students
                </DropdownMenuItem>
              )}
              {isArchived ? (
                <DropdownMenuItem onClick={onRestore}>
                  <RotateCcw className="h-3.5 w-3.5 mr-2" /> Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="h-3.5 w-3.5 mr-2" /> Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSoftDelete} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
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
          {isHidden && <Badge className="bg-slate-500/15 text-slate-600 text-[10px] h-5">👁 Hidden</Badge>}
          {reward.tier === "premium" && <Badge className="bg-purple-500/15 text-purple-600 text-[10px] h-5">⭐ Premium</Badge>}
          {reward.tier === "limited" && <Badge className="bg-rose-500/15 text-rose-600 text-[10px] h-5">🔒 Limited</Badge>}
          {/* Scope badge */}
          {reward.classroom_id ? (
            <Badge variant="outline" className="text-[10px] h-5">Classroom</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] h-5">Agency</Badge>
          )}
        </div>

        {/* Reason hint */}
        {reward.price_reason && (
          <p className="text-[10px] text-muted-foreground italic truncate">{reward.price_reason}</p>
        )}
      </CardContent>
    </Card>
  );
}
