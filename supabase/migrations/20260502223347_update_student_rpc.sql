create or replace function public.get_public_event_context()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return jsonb_build_object(
    'ok', true,
    'generated_at', now(),
    'teams', (
      select coalesce(jsonb_agg(
        jsonb_build_object('id', id, 'name', name, 'display_order', display_order)
        order by display_order
      ), '[]'::jsonb)
      from public.teams where is_active = true
    ),
    'games', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', id, 'title', title, 'sport', sport, 'round', round, 'kind', kind,
          'location', location, 'scheduled_start_time', scheduled_start_time,
          'scheduled_end_time', scheduled_end_time, 'status', status,
          'actual_start_time', actual_start_time, 'actual_end_time', actual_end_time
        )
        order by scheduled_start_time, title
      ), '[]'::jsonb)
      from public.games
    ),
    'game_results', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'game_id', game_id, 'left_team_id', left_team_id, 'right_team_id', right_team_id,
          'left_score', left_score, 'right_score', right_score, 'winner_team_id', winner_team_id
        )
      ), '[]'::jsonb)
      from public.game_results
    ),
    'booths', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', id, 'name', name, 'location', location, 'description', description,
          'is_active', is_active, 'status', status
        )
        order by name
      ), '[]'::jsonb)
      from public.booths
    ),
    'scoreboard', public.get_scoreboard()
  );
end;
$$;
