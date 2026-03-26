import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RewardItem {
  id: string;
  scope_type: string;
  scope_id: string | null;
  name: string;
  emoji: string | null;
  description: string | null;
  cost: number;
  base_cost: number | null;
  reward_type: string;
  tier: string;
  dynamic_pricing_enabled: boolean;
  inventory_enabled: boolean;
  active: boolean;
  sort_order: number;
  min_cost: number;
  max_cost: number;
  metadata_json: any;
  quantity_available: number | null;
  is_limited: boolean | null;
  classroom_id: string | null;
  is_hidden: boolean;
  is_archived: boolean;
  deleted_at: string | null;
  created_by: string | null;
  // computed
  computed_price?: number;
  price_reason?: string;
  recent_redemptions?: number;
}

export interface EconomySettings {
  id: string;
  agency_id: string;
  classroom_id: string | null;
  economy_mode: string;
  dynamic_pricing_enabled: boolean;
  scarcity_enabled: boolean;
  demand_pricing_enabled: boolean;
  underuse_discount_enabled: boolean;
  bonus_windows_enabled: boolean;
  overuse_threshold: number;
  overuse_price_increase: number;
  underuse_threshold: number;
  underuse_price_decrease: number;
  min_price: number;
  max_price: number;
  reset_cycle: string;
}

export interface RewardTransaction {
  id: string;
  student_id: string | null;
  reward_id: string;
  transaction_type: string;
  point_cost: number | null;
  balance_before: number | null;
  balance_after: number | null;
  metadata_json: any;
  created_at: string;
  reward_name?: string;
  reward_emoji?: string;
}

export function useRewardEconomy(agencyId: string | null) {
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [settings, setSettings] = useState<EconomySettings | null>(null);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRewards = useCallback(async () => {
    if (!agencyId) return;
    const { data, error } = await supabase
      .from("v_reward_store" as any)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("Failed to fetch rewards:", error);
      return;
    }
    // Compute dynamic prices for each reward
    const enriched: RewardItem[] = [];
    for (const r of (data as any[]) || []) {
      try {
        const { data: priceData } = await supabase.rpc("compute_dynamic_reward_price" as any, {
          p_reward_id: r.id,
          p_agency_id: agencyId,
        });
        const priceResult = priceData as any;
        enriched.push({
          ...r,
          computed_price: priceResult?.computed_price ?? r.cost,
          price_reason: priceResult?.reason ?? null,
          recent_redemptions: priceResult?.recent_redemptions ?? 0,
        });
      } catch {
        enriched.push({ ...r, computed_price: r.cost });
      }
    }
    setRewards(enriched);
  }, [agencyId]);

  const fetchSettings = useCallback(async () => {
    if (!agencyId) return;
    const { data } = await supabase
      .from("reward_economy_settings" as any)
      .select("*")
      .eq("agency_id", agencyId)
      .order("classroom_id", { ascending: true, nullsFirst: false })
      .limit(1);
    if (data && (data as any[]).length > 0) {
      setSettings((data as any[])[0] as EconomySettings);
    }
  }, [agencyId]);

  const fetchTransactions = useCallback(async () => {
    if (!agencyId) return;
    const { data } = await supabase
      .from("v_student_reward_history" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setTransactions((data as any[]) || []);
  }, [agencyId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchRewards(), fetchSettings(), fetchTransactions()]);
    setLoading(false);
  }, [fetchRewards, fetchSettings, fetchTransactions]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveSettings = async (s: Partial<EconomySettings>) => {
    if (!agencyId) return;
    const payload = { ...s, agency_id: agencyId };
    if (settings?.id) {
      const { error } = await supabase
        .from("reward_economy_settings" as any)
        .update(payload as any)
        .eq("id", settings.id);
      if (error) { toast.error("Failed to save settings"); return; }
    } else {
      const { error } = await supabase
        .from("reward_economy_settings" as any)
        .insert(payload as any);
      if (error) { toast.error("Failed to create settings"); return; }
    }
    toast.success("Economy settings saved");
    await fetchSettings();
  };

  const createReward = async (reward: {
    name: string; emoji?: string; description?: string;
    cost: number; reward_type?: string; tier?: string;
    dynamic_pricing_enabled?: boolean; inventory_enabled?: boolean;
    min_cost?: number; max_cost?: number;
    classroom_id?: string | null;
  }) => {
    if (!agencyId) return;
    const { error } = await supabase
      .from("beacon_rewards" as any)
      .insert({
        ...reward,
        scope_type: reward.classroom_id ? "classroom" : "agency",
        scope_id: reward.classroom_id || agencyId,
        base_cost: reward.cost,
        active: true,
        is_hidden: false,
        is_archived: false,
      } as any);
    if (error) { toast.error("Failed to create reward"); return; }
    toast.success("Reward created");
    await fetchRewards();
  };

  const hideReward = async (id: string, hidden: boolean) => {
    const { error } = await supabase
      .from("beacon_rewards" as any)
      .update({ is_hidden: hidden, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) { toast.error("Failed to update visibility"); return; }
    toast.success(hidden ? "Reward hidden from students" : "Reward visible to students");
    await fetchRewards();
  };

  const archiveReward = async (id: string) => {
    const { error } = await supabase
      .from("beacon_rewards" as any)
      .update({ is_archived: true, active: false, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) { toast.error("Failed to archive"); return; }
    toast.success("Reward archived");
    await fetchRewards();
  };

  const restoreReward = async (id: string) => {
    const { error } = await supabase
      .from("beacon_rewards" as any)
      .update({ is_archived: false, active: true, is_hidden: false, deleted_at: null, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) { toast.error("Failed to restore"); return; }
    toast.success("Reward restored");
    await fetchRewards();
  };

  const softDeleteReward = async (id: string) => {
    const { error } = await supabase
      .from("beacon_rewards" as any)
      .update({ deleted_at: new Date().toISOString(), active: false, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Reward deleted (soft)");
    await fetchRewards();
  };

  const hardDeleteReward = async (id: string) => {
    // Only works if no redemptions/transactions reference it
    const { error } = await supabase
      .from("beacon_rewards" as any)
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Cannot delete — reward has history. Use archive instead.");
      return;
    }
    toast.success("Reward permanently deleted");
    await fetchRewards();
  };

  const updateReward = async (id: string, updates: Record<string, any>) => {
    const { error } = await supabase
      .from("beacon_rewards" as any)
      .update(updates as any)
      .eq("id", id);
    if (error) { toast.error("Failed to update reward"); return; }
    toast.success("Reward updated");
    await fetchRewards();
  };

  const overridePrice = async (rewardId: string, newPrice: number, reason?: string) => {
    if (!agencyId) return;
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc("override_reward_price" as any, {
      p_agency_id: agencyId,
      p_reward_id: rewardId,
      p_new_price: newPrice,
      p_created_by: user?.user?.id,
      p_reason: reason || "Manual override",
    });
    if (error) { toast.error("Failed to override price"); return; }
    toast.success("Price overridden");
    await fetchRewards();
  };

  const restockInventory = async (rewardId: string, quantity: number) => {
    if (!agencyId) return;
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.rpc("restock_reward_inventory" as any, {
      p_agency_id: agencyId,
      p_reward_id: rewardId,
      p_quantity: quantity,
      p_created_by: user?.user?.id,
    });
    if (error) { toast.error("Failed to restock"); return; }
    toast.success("Inventory restocked");
    await fetchRewards();
  };

  const redeemReward = async (studentId: string, rewardId: string, classroomId?: string) => {
    if (!agencyId) return null;
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc("redeem_reward_dynamic" as any, {
      p_agency_id: agencyId,
      p_student_id: studentId,
      p_reward_id: rewardId,
      p_classroom_id: classroomId || null,
      p_created_by: user?.user?.id,
    });
    if (error) { toast.error("Redemption failed"); return null; }
    const result = data as any;
    if (!result?.ok) {
      toast.error(result?.error === "insufficient_balance" ? "Not enough points" : result?.error || "Redemption failed");
      return null;
    }
    toast.success("Reward redeemed! 🎉");
    await Promise.all([fetchRewards(), fetchTransactions()]);
    return result;
  };

  return {
    rewards, settings, transactions, loading,
    loadAll, createReward, updateReward, overridePrice,
    restockInventory, redeemReward, saveSettings,
  };
}
