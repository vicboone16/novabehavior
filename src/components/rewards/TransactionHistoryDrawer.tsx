import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { RewardTransaction } from "@/hooks/useRewardEconomy";

interface TransactionHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  transactions: RewardTransaction[];
}

const TYPE_COLORS: Record<string, string> = {
  redeem: "bg-emerald-500/15 text-emerald-600",
  refund: "bg-blue-500/15 text-blue-600",
  inventory_add: "bg-teal-500/15 text-teal-600",
  price_change: "bg-amber-500/15 text-amber-600",
  manual_override: "bg-purple-500/15 text-purple-600",
};

export function TransactionHistoryDrawer({ open, onClose, transactions }: TransactionHistoryDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <div className="overflow-y-auto px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle>Transaction History</DrawerTitle>
          </DrawerHeader>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No transactions yet.</p>
          ) : (
            <div className="space-y-1.5">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2.5 rounded-md border border-border/50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{t.reward_emoji || "🎁"}</span>
                      <span className="text-xs font-medium truncate">{t.reward_name || "Reward"}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(t.created_at), "MMM d, h:mm a")}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {t.point_cost && <span className="text-xs font-medium">{t.point_cost} pts</span>}
                    <Badge className={`text-[10px] h-5 ${TYPE_COLORS[t.transaction_type] || "bg-muted text-muted-foreground"}`}>
                      {t.transaction_type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
