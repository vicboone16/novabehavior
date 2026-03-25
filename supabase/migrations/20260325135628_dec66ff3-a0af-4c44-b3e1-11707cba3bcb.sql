-- Fix redeem_reward_dynamic to use points_delta instead of points
CREATE OR REPLACE FUNCTION public.redeem_reward_dynamic(
  p_agency_id uuid,
  p_student_id uuid,
  p_reward_id uuid,
  p_classroom_id uuid default null,
  p_created_by uuid default null
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
declare
  v_price_result jsonb;
  v_price integer;
  v_balance integer := 0;
  v_reward record;
  v_inventory record;
begin
  select *
  into v_reward
  from public.beacon_rewards
  where id = p_reward_id
    and active = true
  limit 1;

  if v_reward is null then
    return jsonb_build_object('ok', false, 'error', 'reward_not_found');
  end if;

  v_price_result := public.compute_dynamic_reward_price(
    p_reward_id,
    p_agency_id,
    p_classroom_id,
    p_student_id
  );

  if coalesce((v_price_result->>'ok')::boolean, false) = false then
    return v_price_result;
  end if;

  v_price := (v_price_result->>'computed_price')::integer;

  select coalesce(sum(points_delta), 0)
  into v_balance
  from public.beacon_points_ledger
  where student_id = p_student_id
    and agency_id = p_agency_id;

  if v_balance < v_price then
    return jsonb_build_object(
      'ok', false,
      'error', 'insufficient_balance',
      'balance', v_balance,
      'required', v_price
    );
  end if;

  select *
  into v_inventory
  from public.reward_inventory
  where reward_id = p_reward_id
    and (classroom_id = p_classroom_id or classroom_id is null)
  order by case when classroom_id is not null then 0 else 1 end
  limit 1;

  if v_inventory is not null
     and v_inventory.is_limited = true
     and v_inventory.quantity_available < 1 then
    return jsonb_build_object('ok', false, 'error', 'out_of_stock');
  end if;

  insert into public.beacon_points_ledger (
    agency_id,
    student_id,
    staff_id,
    points_delta,
    source,
    reason
  )
  values (
    p_agency_id,
    p_student_id,
    p_created_by,
    -abs(v_price),
    'reward_redeem',
    coalesce(v_reward.name, 'Reward redemption')
  );

  insert into public.reward_transactions (
    agency_id,
    classroom_id,
    student_id,
    reward_id,
    transaction_type,
    quantity,
    point_cost,
    balance_before,
    balance_after,
    created_by,
    metadata_json
  )
  values (
    p_agency_id,
    p_classroom_id,
    p_student_id,
    p_reward_id,
    'redeem',
    1,
    v_price,
    v_balance,
    v_balance - v_price,
    p_created_by,
    jsonb_build_object(
      'dynamic_reason', v_price_result->>'reason'
    )
  );

  if v_inventory is not null and v_inventory.is_limited = true then
    update public.reward_inventory
    set quantity_available = greatest(0, quantity_available - 1),
        updated_at = now()
    where id = v_inventory.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'reward_id', p_reward_id,
    'price_paid', v_price,
    'balance_after', v_balance - v_price
  );
end;
$$;

-- Fix views: beacon_rewards uses scope_type/scope_id, not agency_id
DROP VIEW IF EXISTS public.v_reward_store;
CREATE VIEW public.v_reward_store WITH (security_invoker = on) AS
SELECT
  r.id,
  r.scope_type,
  r.scope_id,
  r.name,
  r.emoji,
  r.cost,
  r.base_cost,
  r.reward_type,
  r.tier,
  r.dynamic_pricing_enabled,
  r.inventory_enabled,
  r.active,
  r.sort_order,
  r.min_cost,
  r.max_cost,
  r.description,
  i.quantity_available,
  i.is_limited
FROM public.beacon_rewards r
LEFT JOIN public.reward_inventory i
  ON i.reward_id = r.id
WHERE r.active = true;

DROP VIEW IF EXISTS public.v_student_reward_history;
CREATE VIEW public.v_student_reward_history WITH (security_invoker = on) AS
SELECT
  rt.id,
  rt.agency_id,
  rt.student_id,
  rt.reward_id,
  rt.transaction_type,
  rt.point_cost,
  rt.balance_before,
  rt.balance_after,
  rt.metadata_json,
  rt.created_at,
  r.name AS reward_name,
  r.emoji AS reward_emoji
FROM public.reward_transactions rt
LEFT JOIN public.beacon_rewards r
  ON r.id = rt.reward_id
WHERE rt.transaction_type IN ('redeem','refund');