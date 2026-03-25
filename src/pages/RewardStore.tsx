import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Settings2, History, Search, Store } from "lucide-react";
import { useRewardEconomy } from "@/hooks/useRewardEconomy";
import { RewardCard } from "@/components/rewards/RewardCard";
import { RewardDetailDrawer } from "@/components/rewards/RewardDetailDrawer";
import { EconomySettingsModal } from "@/components/rewards/EconomySettingsModal";
import { CreateRewardDialog } from "@/components/rewards/CreateRewardDialog";
import { TransactionHistoryDrawer } from "@/components/rewards/TransactionHistoryDrawer";
import { useAuth } from "@/contexts/AuthContext";
import type { RewardItem } from "@/hooks/useRewardEconomy";

export default function RewardStore() {
  const { agencyId } = useAuth() as any;
  const economy = useRewardEconomy(agencyId || null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const filtered = useMemo(() => {
    let items = economy.rewards;
    if (search) items = items.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
    if (typeFilter !== "all") items = items.filter((r) => r.reward_type === typeFilter);
    if (tierFilter !== "all") items = items.filter((r) => r.tier === tierFilter);
    switch (sortBy) {
      case "price": items = [...items].sort((a, b) => (a.computed_price ?? a.cost) - (b.computed_price ?? b.cost)); break;
      case "popular": items = [...items].sort((a, b) => (b.recent_redemptions ?? 0) - (a.recent_redemptions ?? 0)); break;
      case "inventory": items = [...items].sort((a, b) => (a.quantity_available ?? 999) - (b.quantity_available ?? 999)); break;
      default: items = [...items].sort((a, b) => a.name.localeCompare(b.name));
    }
    return items;
  }, [economy.rewards, search, typeFilter, tierFilter, sortBy]);

  if (economy.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" /> Reward Store
          </h1>
          <p className="text-sm text-muted-foreground">Manage your classroom store and student incentives</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
            <History className="h-4 w-4 mr-1" /> History
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
            <Settings2 className="h-4 w-4 mr-1" /> Economy
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Reward
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search rewards..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="classroom">Classroom</SelectItem>
            <SelectItem value="schoolwide">Schoolwide</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="limited">Limited</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="price">Current Price</SelectItem>
            <SelectItem value="popular">Most Redeemed</SelectItem>
            <SelectItem value="inventory">Inventory Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Store className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No rewards found. Create your first reward to get started.</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Reward
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((r) => (
            <RewardCard
              key={r.id}
              reward={r}
              onClick={() => setSelectedReward(r)}
              onRestock={() => economy.restockInventory(r.id, 5)}
              onArchive={() => economy.updateReward(r.id, { active: false })}
              onOverride={() => setSelectedReward(r)}
            />
          ))}
        </div>
      )}

      {/* Drawers & Modals */}
      <RewardDetailDrawer
        reward={selectedReward}
        open={!!selectedReward}
        onClose={() => setSelectedReward(null)}
        transactions={economy.transactions}
        onOverridePrice={economy.overridePrice}
        onRestock={economy.restockInventory}
        onUpdate={economy.updateReward}
      />
      <EconomySettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={economy.settings}
        onSave={economy.saveSettings}
      />
      <CreateRewardDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={economy.createReward}
      />
      <TransactionHistoryDrawer
        open={showHistory}
        onClose={() => setShowHistory(false)}
        transactions={economy.transactions}
      />
    </div>
  );
}
