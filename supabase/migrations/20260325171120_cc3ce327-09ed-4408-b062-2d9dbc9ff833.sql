create or replace function public.record_parent_action(
  p_agency_id uuid,
  p_student_id uuid,
  p_parent_user_id uuid,
  p_action_type text,
  p_related_insight_id uuid default null,
  p_message text default null,
  p_points_equivalent integer default 0
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.parent_actions (
    agency_id, student_id, parent_user_id, related_insight_id,
    action_type, message, points_equivalent
  )
  values (
    p_agency_id, p_student_id, p_parent_user_id, p_related_insight_id,
    p_action_type, p_message, p_points_equivalent
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.create_student_quest(
  p_agency_id uuid,
  p_student_id uuid,
  p_quest_type text,
  p_title text,
  p_classroom_id uuid default null,
  p_description text default null,
  p_goal_value integer default 1,
  p_reward_points integer default 0,
  p_reward_type text default 'points',
  p_created_by uuid default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.student_quests (
    agency_id, classroom_id, student_id, quest_type, title, description,
    goal_value, reward_points, reward_type, created_by
  )
  values (
    p_agency_id, p_classroom_id, p_student_id, p_quest_type, p_title, p_description,
    p_goal_value, p_reward_points, p_reward_type, p_created_by
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;