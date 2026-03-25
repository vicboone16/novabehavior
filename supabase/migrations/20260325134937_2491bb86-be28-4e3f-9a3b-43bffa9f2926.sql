
ALTER TABLE public.beacon_rewards
ADD COLUMN IF NOT EXISTS tier text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS emoji text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beacon_rewards_tier_chk') THEN
    ALTER TABLE public.beacon_rewards ADD CONSTRAINT beacon_rewards_tier_chk CHECK (tier IN ('basic','standard','premium','limited'));
  END IF;
END $$;

ALTER TABLE public.reward_economy_settings
ADD COLUMN IF NOT EXISTS economy_mode text NOT NULL DEFAULT 'dynamic',
ADD COLUMN IF NOT EXISTS underuse_discount_enabled boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_economy_settings_mode_chk') THEN
    ALTER TABLE public.reward_economy_settings ADD CONSTRAINT reward_economy_settings_mode_chk CHECK (economy_mode IN ('static','light_dynamic','dynamic'));
  END IF;
END $$;

UPDATE public.beacon_rewards SET base_cost = cost WHERE base_cost IS NULL AND cost IS NOT NULL;

CREATE OR REPLACE FUNCTION public.override_reward_price(
  p_agency_id uuid, p_reward_id uuid, p_classroom_id uuid DEFAULT NULL,
  p_student_id uuid DEFAULT NULL, p_new_price integer DEFAULT 1,
  p_created_by uuid DEFAULT NULL, p_reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO public.reward_dynamic_prices (agency_id, classroom_id, reward_id, student_id, computed_price, price_reason, evidence_json)
  VALUES (p_agency_id, p_classroom_id, p_reward_id, p_student_id, p_new_price, 'manual override', jsonb_build_object('override_reason', p_reason, 'overridden_by', p_created_by));
  INSERT INTO public.reward_transactions (agency_id, classroom_id, student_id, reward_id, transaction_type, point_cost, created_by, metadata_json)
  VALUES (p_agency_id, p_classroom_id, p_student_id, p_reward_id, 'manual_override', p_new_price, p_created_by, jsonb_build_object('reason', p_reason));
  RETURN jsonb_build_object('ok', true, 'new_price', p_new_price);
END;
$$;

CREATE OR REPLACE FUNCTION public.restock_reward_inventory(
  p_agency_id uuid, p_reward_id uuid, p_classroom_id uuid DEFAULT NULL,
  p_quantity integer DEFAULT 1, p_created_by uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.reward_inventory (agency_id, classroom_id, reward_id, quantity_available, is_limited, updated_at)
  VALUES (p_agency_id, p_classroom_id, p_reward_id, greatest(p_quantity, 0), true, now())
  ON CONFLICT (reward_id, classroom_id)
  DO UPDATE SET quantity_available = reward_inventory.quantity_available + EXCLUDED.quantity_available, updated_at = now()
  RETURNING id INTO v_id;
  INSERT INTO public.reward_transactions (agency_id, classroom_id, reward_id, transaction_type, quantity, created_by)
  VALUES (p_agency_id, p_classroom_id, p_reward_id, 'inventory_add', p_quantity, p_created_by);
  RETURN jsonb_build_object('ok', true, 'inventory_id', v_id);
END;
$$;

CREATE OR REPLACE VIEW public.v_reward_store WITH (security_invoker = on) AS
SELECT r.id, r.scope_type, r.scope_id, r.name, r.emoji, r.description, r.cost, r.base_cost,
  r.reward_type, r.tier, r.dynamic_pricing_enabled, r.inventory_enabled, r.active, r.sort_order,
  r.min_cost, r.max_cost, r.metadata_json, i.quantity_available, i.is_limited
FROM public.beacon_rewards r
LEFT JOIN public.reward_inventory i ON i.reward_id = r.id
WHERE r.active = true;

CREATE OR REPLACE VIEW public.v_student_reward_history WITH (security_invoker = on) AS
SELECT rt.id, rt.student_id, rt.reward_id, rt.transaction_type, rt.point_cost,
  rt.balance_before, rt.balance_after, rt.metadata_json, rt.created_at,
  r.name AS reward_name, r.emoji AS reward_emoji
FROM public.reward_transactions rt
LEFT JOIN public.beacon_rewards r ON r.id = rt.reward_id
WHERE rt.transaction_type IN ('redeem','refund');
