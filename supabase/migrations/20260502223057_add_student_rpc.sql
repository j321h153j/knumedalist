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
    'scoreboard', public.get_scoreboard()
  );
end;
$$;

grant execute on function public.get_public_event_context() to anon, authenticated;
