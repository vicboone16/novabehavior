create index if not exists idx_behavior_session_student on public.behavior_session_data(student_id);
create index if not exists idx_behavior_session_behavior on public.behavior_session_data(behavior_id);

alter table public.behavior_session_data enable row level security;

create policy "Users can view behavior session data for accessible students"
  on public.behavior_session_data for select
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.user_student_access usa
      where usa.user_id = auth.uid() and usa.student_id = behavior_session_data.student_id
    )
    or exists (
      select 1 from public.students s
      where s.id = behavior_session_data.student_id and s.user_id = auth.uid()
    )
  );

create policy "Users can insert behavior session data for accessible students"
  on public.behavior_session_data for insert
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.user_student_access usa
      where usa.user_id = auth.uid() and usa.student_id = behavior_session_data.student_id
    )
    or exists (
      select 1 from public.students s
      where s.id = behavior_session_data.student_id and s.user_id = auth.uid()
    )
  );

create policy "Users can update behavior session data for accessible students"
  on public.behavior_session_data for update
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.user_student_access usa
      where usa.user_id = auth.uid() and usa.student_id = behavior_session_data.student_id
    )
    or exists (
      select 1 from public.students s
      where s.id = behavior_session_data.student_id and s.user_id = auth.uid()
    )
  );

create policy "Users can delete behavior session data for accessible students"
  on public.behavior_session_data for delete
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.user_student_access usa
      where usa.user_id = auth.uid() and usa.student_id = behavior_session_data.student_id
    )
    or exists (
      select 1 from public.students s
      where s.id = behavior_session_data.student_id and s.user_id = auth.uid()
    )
  );