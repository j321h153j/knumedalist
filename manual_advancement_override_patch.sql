create or replace function public.override_group_advancement(
  p_group_key text,
  p_better_winner_team_id uuid,
  p_weaker_winner_team_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_role text;
  v_from_game_ids uuid[];
  v_from_game_id uuid;
  v_qualifier_winner_count integer := 0;
  v_better_updates integer := 0;
  v_weaker_updates integer := 0;
  v_target record;
begin
  select a.role
  into v_admin_role
  from public.admins a
  where a.auth_user_id = auth.uid()
    and a.is_active = true
  limit 1;

  if coalesce(v_admin_role, '') <> 'super_admin' then
    raise exception 'permission denied for manual advancement override';
  end if;

  if nullif(p_group_key, '') is null then
    raise exception 'p_group_key is required';
  end if;

  if p_better_winner_team_id is null or p_weaker_winner_team_id is null then
    raise exception 'winner team ids are required';
  end if;

  if p_better_winner_team_id = p_weaker_winner_team_id then
    raise exception 'better and weaker winner cannot be the same team';
  end if;

  select array_agg(distinct ga.from_game_id)
  into v_from_game_ids
  from public.game_advancements ga
  where ga.group_key = p_group_key
    and ga.rule_type in ('better_winner', 'weaker_winner');

  if coalesce(array_length(v_from_game_ids, 1), 0) <> 2 then
    raise exception 'manual override requires exactly two qualifier games for group %', p_group_key;
  end if;

  select count(*)
  into v_qualifier_winner_count
  from (
    select distinct gr.winner_team_id
    from public.game_advancements ga
    join public.games g on g.id = ga.from_game_id
    join public.game_results gr on gr.game_id = ga.from_game_id
    where ga.group_key = p_group_key
      and ga.rule_type in ('better_winner', 'weaker_winner')
      and g.status = 'completed'
      and gr.winner_team_id in (p_better_winner_team_id, p_weaker_winner_team_id)
  ) winners;

  if v_qualifier_winner_count <> 2 then
    raise exception 'selected teams must be the two completed qualifier winners';
  end if;

  foreach v_from_game_id in array v_from_game_ids
  loop
    perform public.invalidate_downstream_games(v_from_game_id);
  end loop;

  for v_target in
    select distinct ga.to_game_id, ga.to_slot
    from public.game_advancements ga
    where ga.group_key = p_group_key
      and ga.rule_type = 'better_winner'
  loop
    perform public._set_game_result_slot(v_target.to_game_id, v_target.to_slot, p_better_winner_team_id);
    v_better_updates := v_better_updates + 1;
  end loop;

  for v_target in
    select distinct ga.to_game_id, ga.to_slot
    from public.game_advancements ga
    where ga.group_key = p_group_key
      and ga.rule_type = 'weaker_winner'
  loop
    perform public._set_game_result_slot(v_target.to_game_id, v_target.to_slot, p_weaker_winner_team_id);
    v_weaker_updates := v_weaker_updates + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'group_key', p_group_key,
    'better_winner_team_id', p_better_winner_team_id,
    'weaker_winner_team_id', p_weaker_winner_team_id,
    'better_updates', v_better_updates,
    'weaker_updates', v_weaker_updates
  );
end;
$$;

revoke execute on function public.override_group_advancement(text, uuid, uuid) from public, anon;
grant execute on function public.override_group_advancement(text, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
