
-- v_nova_ai_optimization_quick_actions view
drop view if exists public.v_nova_ai_optimization_quick_actions;
create view public.v_nova_ai_optimization_quick_actions as
select
    id,
    action_key,
    action_title,
    source_type,
    default_reasoning_mode,
    default_prompt_text,
    sort_order
from public.nova_ai_optimization_quick_actions
where coalesce(is_active, true) = true
order by sort_order, action_title;
