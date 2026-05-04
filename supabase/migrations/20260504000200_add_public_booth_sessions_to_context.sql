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
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'display_order', display_order
          )
          order by display_order
        ),
        '[]'::jsonb
      )
      from public.teams
      where is_active = true
    ),
    'games', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', id,
            'title', title,
            'sport', sport,
            'round', round,
            'kind', kind,
            'location', location,
            'scheduled_start_time', scheduled_start_time,
            'scheduled_end_time', scheduled_end_time,
            'status', status,
            'actual_start_time', actual_start_time,
            'actual_end_time', actual_end_time
          )
          order by scheduled_start_time, title
        ),
        '[]'::jsonb
      )
      from public.games
    ),
    'game_results', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'game_id', game_id,
            'left_team_id', left_team_id,
            'right_team_id', right_team_id,
            'left_score', left_score,
            'right_score', right_score,
            'winner_team_id', winner_team_id
          )
          order by game_id, id
        ),
        '[]'::jsonb
      )
      from public.game_results
    ),
    'booths', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'location', location,
            'visible', visible,
            'status', status,
            'summary', summary,
            'guide', guide,
            'scheduled_start_time', scheduled_start_time,
            'scheduled_end_time', scheduled_end_time
          )
          order by scheduled_start_time, name
        ),
        '[]'::jsonb
      )
      from public.booths
      where coalesce(visible, true) = true
    ),
    'booth_sessions', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'booth_id', bs.booth_id,
            'title', bs.title,
            'slot_order', bs.slot_order,
            'session_status', bs.session_status,
            'scheduled_start_time', bs.scheduled_start_time,
            'scheduled_end_time', bs.scheduled_end_time
          )
          order by b.scheduled_start_time, b.name, bs.slot_order, bs.scheduled_start_time
        ),
        '[]'::jsonb
      )
      from public.booth_sessions bs
      join public.booths b on b.id = bs.booth_id
      where coalesce(b.visible, true) = true
    ),
    'scoreboard', public.get_scoreboard()
  );
end;
$$;

grant execute on function public.get_public_event_context() to anon, authenticated;
