begin;

create extension if not exists pgcrypto;

alter table public.game_result_sets
  alter column duration_seconds drop not null;

create table if not exists public.booth_sessions (
  id uuid primary key default gen_random_uuid(),
  booth_id uuid not null references public.booths(id) on delete cascade,
  title text not null default 'current',
  slot_order integer not null default 1,
  session_label text,
  session_status text not null default 'open',
  scheduled_start_time timestamptz,
  scheduled_end_time timestamptz,
  current_note text,
  updated_by uuid references public.admins(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booth_scores (
  id uuid primary key default gen_random_uuid(),
  booth_id uuid not null references public.booths(id) on delete cascade,
  team_id uuid references public.teams(id),
  participant_name text,
  participant_student_id text,
  score_value numeric,
  score_unit text,
  attempt_count integer,
  note text,
  recorded_by uuid references public.admins(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booth_sessions
  add column if not exists booth_id uuid,
  add column if not exists title text default 'current',
  add column if not exists slot_order integer default 1,
  add column if not exists session_label text,
  add column if not exists session_status text default 'open',
  add column if not exists scheduled_start_time timestamptz,
  add column if not exists scheduled_end_time timestamptz,
  add column if not exists current_note text,
  add column if not exists updated_by uuid,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.booth_sessions
set title = coalesce(title, session_label, 'current')
where title is null;

update public.booth_sessions
set slot_order = 1
where slot_order is null;

alter table public.booth_sessions
  alter column title set default 'current',
  alter column slot_order set default 1;

alter table public.booth_scores
  add column if not exists booth_id uuid,
  add column if not exists team_id uuid,
  add column if not exists participant_name text,
  add column if not exists participant_student_id text,
  add column if not exists score_value numeric,
  add column if not exists score_unit text,
  add column if not exists attempt_count integer,
  add column if not exists note text,
  add column if not exists recorded_by uuid,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists admins_auth_user_id_idx
  on public.admins(auth_user_id);

create index if not exists admin_assignments_admin_active_idx
  on public.admin_assignments(admin_id, is_active);

create index if not exists admin_assignments_game_id_idx
  on public.admin_assignments(game_id);

create index if not exists admin_assignments_booth_id_idx
  on public.admin_assignments(booth_id);

create index if not exists booth_sessions_booth_id_idx
  on public.booth_sessions(booth_id);

create index if not exists booth_scores_booth_id_idx
  on public.booth_scores(booth_id);

create index if not exists booth_scores_team_id_idx
  on public.booth_scores(team_id);

create index if not exists booth_scores_booth_team_idx
  on public.booth_scores(booth_id, team_id);

create index if not exists game_results_game_id_idx
  on public.game_results(game_id);

create index if not exists game_result_sets_result_id_idx
  on public.game_result_sets(game_result_id);

create index if not exists game_rankings_game_id_idx
  on public.game_rankings(game_id);

create index if not exists game_advancements_from_game_id_idx
  on public.game_advancements(from_game_id);

create index if not exists game_advancements_group_key_idx
  on public.game_advancements(group_key);

create index if not exists team_points_team_id_idx
  on public.team_points(team_id);

create index if not exists team_points_source_idx
  on public.team_points(source_type, source_id);

create or replace view public.team_scoreboard
with (security_invoker = true)
as
with totals as (
  select
    t.id as team_id,
    t.name as team_name,
    t.display_order,
    coalesce(sum(tp.points), 0)::integer as total_points
  from public.teams t
  left join public.team_points tp on tp.team_id = t.id
  where t.is_active = true
  group by t.id, t.name, t.display_order
)
select
  team_id,
  team_name,
  display_order,
  total_points,
  dense_rank() over (
    order by total_points desc
  )::integer as rank_order
from totals;

create or replace function public.get_scoreboard()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return jsonb_build_object(
    'ok', true,
    'generated_at', now(),
    'rankings', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'team_id', sb.team_id,
            'team_name', sb.team_name,
            'rank_order', sb.rank_order,
            'total_points', sb.total_points,
            'sources', coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'source_type', tp.source_type,
                    'source_id', tp.source_id,
                    'source_title', coalesce(g.title, b.name, tp.reason),
                    'points', tp.points,
                    'reason', tp.reason
                  )
                  order by tp.source_type, coalesce(g.scheduled_start_time, b.scheduled_start_time), tp.reason
                )
                from public.team_points tp
                left join public.games g on tp.source_type = 'game' and g.id = tp.source_id
                left join public.booths b on tp.source_type = 'booth' and b.id = tp.source_id
                where tp.team_id = sb.team_id
              ),
              '[]'::jsonb
            )
          )
          order by sb.rank_order, sb.total_points desc, sb.display_order
        )
        from public.team_scoreboard sb
      ),
      '[]'::jsonb
    ),
    'point_sources', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'team_id', tp.team_id,
            'team_name', t.name,
            'source_type', tp.source_type,
            'source_id', tp.source_id,
            'source_title', coalesce(g.title, b.name, tp.reason),
            'points', tp.points,
            'reason', tp.reason
          )
          order by t.display_order, tp.source_type, coalesce(g.scheduled_start_time, b.scheduled_start_time), tp.reason
        )
        from public.team_points tp
        join public.teams t on t.id = tp.team_id
        left join public.games g on tp.source_type = 'game' and g.id = tp.source_id
        left join public.booths b on tp.source_type = 'booth' and b.id = tp.source_id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

create or replace function public._set_game_result_slot(
  p_game_id uuid,
  p_slot text,
  p_team_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_slot not in ('left', 'right') then
    raise exception 'invalid slot: %', p_slot;
  end if;

  insert into public.game_results (game_id)
  values (p_game_id)
  on conflict (game_id) do nothing;

  if p_slot = 'left' then
    update public.game_results
    set left_team_id = p_team_id,
        updated_at = now()
    where game_id = p_game_id;
  else
    update public.game_results
    set right_team_id = p_team_id,
        updated_at = now()
    where game_id = p_game_id;
  end if;
end;
$$;

create or replace function public.invalidate_downstream_games(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_downstream_count integer := 0;
  v_points_deleted integer := 0;
  v_sets_deleted integer := 0;
  v_rankings_deleted integer := 0;
  v_results_reset integer := 0;
  v_games_reset integer := 0;
begin
  create temporary table if not exists downstream_games (
    game_id uuid primary key
  ) on commit drop;

  truncate table pg_temp.downstream_games;

  insert into pg_temp.downstream_games (game_id)
  with recursive downstream(game_id) as (
    select ga.to_game_id
    from public.game_advancements ga
    where ga.from_game_id = p_game_id

    union

    select ga.to_game_id
    from public.game_advancements ga
    join downstream d on d.game_id = ga.from_game_id
  )
  select distinct game_id
  from downstream
  where game_id <> p_game_id
  on conflict (game_id) do nothing;

  select count(*)
  into v_downstream_count
  from pg_temp.downstream_games;

  if v_downstream_count = 0 then
    return jsonb_build_object(
      'ok', true,
      'invalidated', false,
      'downstream_games', 0
    );
  end if;

  insert into public.game_results (game_id)
  select dg.game_id
  from pg_temp.downstream_games dg
  on conflict (game_id) do nothing;

  delete from public.team_points tp
  using pg_temp.downstream_games dg
  where tp.source_type = 'game'
    and tp.source_id = dg.game_id;

  get diagnostics v_points_deleted = row_count;

  delete from public.game_result_sets grs
  using public.game_results gr, pg_temp.downstream_games dg
  where grs.game_result_id = gr.id
    and gr.game_id = dg.game_id;

  get diagnostics v_sets_deleted = row_count;

  delete from public.game_rankings grk
  using pg_temp.downstream_games dg
  where grk.game_id = dg.game_id;

  get diagnostics v_rankings_deleted = row_count;

  with advancement_slots as (
    select
      ga.to_game_id,
      bool_or(ga.to_slot = 'left') as clear_left_slot,
      bool_or(ga.to_slot = 'right') as clear_right_slot
    from public.game_advancements ga
    join pg_temp.downstream_games dg on dg.game_id = ga.to_game_id
    group by ga.to_game_id
  )
  update public.game_results gr
  set
    left_team_id = case when coalesce(s.clear_left_slot, false) then null else gr.left_team_id end,
    right_team_id = case when coalesce(s.clear_right_slot, false) then null else gr.right_team_id end,
    left_score = null,
    right_score = null,
    winner_team_id = null,
    tiebreak_type = 'none',
    left_tiebreak_score = null,
    right_tiebreak_score = null,
    note = '상위 경기 수정으로 결과 초기화',
    updated_by = public.current_admin_id(),
    updated_at = now()
  from pg_temp.downstream_games dg
  left join advancement_slots s on s.to_game_id = dg.game_id
  where gr.game_id = dg.game_id;

  get diagnostics v_results_reset = row_count;

  update public.games g
  set
    status = 'scheduled',
    actual_end_time = null,
    updated_by = public.current_admin_id(),
    updated_at = now()
  from pg_temp.downstream_games dg
  where g.id = dg.game_id;

  get diagnostics v_games_reset = row_count;

  return jsonb_build_object(
    'ok', true,
    'invalidated', true,
    'downstream_games', v_downstream_count,
    'points_deleted', v_points_deleted,
    'sets_deleted', v_sets_deleted,
    'rankings_deleted', v_rankings_deleted,
    'results_reset', v_results_reset,
    'games_reset', v_games_reset
  );
end;
$$;

create or replace function public.get_admin_context()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin public.admins%rowtype;
begin
  select
    a.*
  into v_admin
  from public.admins a
  where a.auth_user_id = auth.uid()
    and a.is_active = true
  limit 1;

  if v_admin.id is null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'admin_not_found'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'admin', jsonb_build_object(
      'id', v_admin.id,
      'name', v_admin.name,
      'email', v_admin.email,
      'role', v_admin.role,
      'auth_user_id', v_admin.auth_user_id,
      'is_active', v_admin.is_active
    ),
    'assignments', coalesce(
      (
        select jsonb_agg(to_jsonb(aa) order by aa.id)
        from public.admin_assignments aa
        where aa.admin_id = v_admin.id
          and aa.is_active = true
      ),
      '[]'::jsonb
    ),
    'games', coalesce(
      (
        select jsonb_agg(to_jsonb(g) order by g.scheduled_start_time, g.title)
        from public.games g
      ),
      '[]'::jsonb
    ),
    'booths', coalesce(
      (
        select jsonb_agg(to_jsonb(b) order by b.scheduled_start_time, b.name)
        from public.booths b
      ),
      '[]'::jsonb
    ),
    'teams', coalesce(
      (
        select jsonb_agg(to_jsonb(t) order by t.display_order, t.name)
        from public.teams t
        where t.is_active = true
      ),
      '[]'::jsonb
    ),
    'game_results', coalesce(
      (
        select jsonb_agg(to_jsonb(gr) order by gr.game_id, gr.id)
        from public.game_results gr
      ),
      '[]'::jsonb
    ),
    'game_result_sets', coalesce(
      (
        select jsonb_agg(to_jsonb(grs) order by grs.game_result_id, grs.set_number, grs.id)
        from public.game_result_sets grs
      ),
      '[]'::jsonb
    ),
    'game_rankings', coalesce(
      (
        select jsonb_agg(to_jsonb(grk) order by grk.game_id, grk.rank_order, grk.id)
        from public.game_rankings grk
      ),
      '[]'::jsonb
    ),
    'booth_scores', coalesce(
      (
        select jsonb_agg(to_jsonb(bs) order by bs.booth_id, bs.created_at, bs.id)
        from public.booth_scores bs
      ),
      '[]'::jsonb
    ),
    'booth_sessions', coalesce(
      (
        select jsonb_agg(to_jsonb(bs) order by bs.booth_id, bs.updated_at desc, bs.id)
        from public.booth_sessions bs
      ),
      '[]'::jsonb
    ),
    'scoreboard', public.get_scoreboard()
  );
end;
$$;

create or replace function public.apply_group_advancement(p_group_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sport text;
  v_total integer;
  v_completed integer;
  v_better record;
  v_weaker record;
  v_target record;
  v_better_updates integer := 0;
  v_weaker_updates integer := 0;
begin
  select min(g.sport), count(distinct ga.from_game_id)
  into v_sport, v_total
  from public.game_advancements ga
  join public.games g on g.id = ga.from_game_id
  where ga.group_key = p_group_key
    and ga.rule_type in ('better_winner', 'weaker_winner');

  if v_total is null or v_total = 0 then
    return jsonb_build_object(
      'ok', false,
      'group_key', p_group_key,
      'reason', 'no_advancement_group'
    );
  end if;

  if v_total <> 2 then
    return jsonb_build_object(
      'ok', false,
      'group_key', p_group_key,
      'reason', 'unsupported_group_size',
      'game_count', v_total
    );
  end if;

  select count(distinct ga.from_game_id)
  into v_completed
  from public.game_advancements ga
  join public.games g on g.id = ga.from_game_id
  join public.game_results gr on gr.game_id = ga.from_game_id
  where ga.group_key = p_group_key
    and ga.rule_type in ('better_winner', 'weaker_winner')
    and g.status = 'completed'
    and gr.winner_team_id is not null;

  if v_completed < v_total then
    return jsonb_build_object(
      'ok', true,
      'group_key', p_group_key,
      'waiting', true,
      'completed_games', v_completed,
      'required_games', v_total
    );
  end if;

  if v_sport = '줄다리기' then
    with from_games as (
      select distinct ga.from_game_id
      from public.game_advancements ga
      where ga.group_key = p_group_key
        and ga.rule_type in ('better_winner', 'weaker_winner')
    ),
    contenders as (
      select
        fg.from_game_id,
        gr.winner_team_id,
        case
          when gr.winner_team_id = gr.left_team_id then gr.left_score
          else gr.right_score
        end as win_sets,
        case
          when gr.winner_team_id = gr.left_team_id then gr.right_score
          else gr.left_score
        end as lose_sets,
        coalesce(sum(grs.duration_seconds), 0) as total_duration
      from from_games fg
      join public.game_results gr on gr.game_id = fg.from_game_id
      left join public.game_result_sets grs on grs.game_result_id = gr.id
      group by fg.from_game_id, gr.id
    )
    select
      from_game_id,
      winner_team_id,
      win_sets,
      lose_sets,
      (win_sets = 2 and lose_sets = 0) as undefeated,
      (win_sets - lose_sets) as set_diff,
      total_duration
    into v_better
    from contenders
    order by
      (win_sets = 2 and lose_sets = 0) desc,
      (win_sets - lose_sets) desc,
      total_duration asc
    limit 1;

    with from_games as (
      select distinct ga.from_game_id
      from public.game_advancements ga
      where ga.group_key = p_group_key
        and ga.rule_type in ('better_winner', 'weaker_winner')
    ),
    contenders as (
      select
        fg.from_game_id,
        gr.winner_team_id,
        case
          when gr.winner_team_id = gr.left_team_id then gr.left_score
          else gr.right_score
        end as win_sets,
        case
          when gr.winner_team_id = gr.left_team_id then gr.right_score
          else gr.left_score
        end as lose_sets,
        coalesce(sum(grs.duration_seconds), 0) as total_duration
      from from_games fg
      join public.game_results gr on gr.game_id = fg.from_game_id
      left join public.game_result_sets grs on grs.game_result_id = gr.id
      group by fg.from_game_id, gr.id
    )
    select
      from_game_id,
      winner_team_id,
      win_sets,
      lose_sets,
      (win_sets = 2 and lose_sets = 0) as undefeated,
      (win_sets - lose_sets) as set_diff,
      total_duration
    into v_weaker
    from contenders
    order by
      (win_sets = 2 and lose_sets = 0) desc,
      (win_sets - lose_sets) desc,
      total_duration asc
    offset 1
    limit 1;

    if v_better.undefeated = v_weaker.undefeated
       and v_better.set_diff = v_weaker.set_diff
       and v_better.total_duration = v_weaker.total_duration then
      return jsonb_build_object(
        'ok', false,
        'group_key', p_group_key,
        'manual_review_required', true,
        'reason', 'rope_group_tie'
      );
    end if;
  elsif v_sport like '%피구' then
    with from_games as (
      select distinct ga.from_game_id
      from public.game_advancements ga
      where ga.group_key = p_group_key
        and ga.rule_type in ('better_winner', 'weaker_winner')
    ),
    contenders as (
      select
        fg.from_game_id,
        gr.winner_team_id,
        case
          when gr.winner_team_id = gr.left_team_id then gr.left_score
          else gr.right_score
        end as win_sets,
        case
          when gr.winner_team_id = gr.left_team_id then gr.right_score
          else gr.left_score
        end as lose_sets,
        coalesce(
          sum(
            case
              when gr.winner_team_id = gr.left_team_id then grs.left_score
              when gr.winner_team_id = gr.right_team_id then grs.right_score
              else 0
            end
          ),
          0
        ) as own_survivors
      from from_games fg
      join public.game_results gr on gr.game_id = fg.from_game_id
      left join public.game_result_sets grs on grs.game_result_id = gr.id
      group by fg.from_game_id, gr.id
    )
    select
      from_game_id,
      winner_team_id,
      win_sets,
      lose_sets,
      own_survivors
    into v_better
    from contenders
    order by
      lose_sets asc,
      own_survivors desc
    limit 1;

    with from_games as (
      select distinct ga.from_game_id
      from public.game_advancements ga
      where ga.group_key = p_group_key
        and ga.rule_type in ('better_winner', 'weaker_winner')
    ),
    contenders as (
      select
        fg.from_game_id,
        gr.winner_team_id,
        case
          when gr.winner_team_id = gr.left_team_id then gr.left_score
          else gr.right_score
        end as win_sets,
        case
          when gr.winner_team_id = gr.left_team_id then gr.right_score
          else gr.left_score
        end as lose_sets,
        coalesce(
          sum(
            case
              when gr.winner_team_id = gr.left_team_id then grs.left_score
              when gr.winner_team_id = gr.right_team_id then grs.right_score
              else 0
            end
          ),
          0
        ) as own_survivors
      from from_games fg
      join public.game_results gr on gr.game_id = fg.from_game_id
      left join public.game_result_sets grs on grs.game_result_id = gr.id
      group by fg.from_game_id, gr.id
    )
    select
      from_game_id,
      winner_team_id,
      win_sets,
      lose_sets,
      own_survivors
    into v_weaker
    from contenders
    order by
      lose_sets asc,
      own_survivors desc
    offset 1
    limit 1;

    if v_better.lose_sets = v_weaker.lose_sets
       and v_better.own_survivors = v_weaker.own_survivors then
      return jsonb_build_object(
        'ok', false,
        'group_key', p_group_key,
        'manual_review_required', true,
        'reason', 'dodgeball_group_tie'
      );
    end if;
  else
    with from_games as (
      select distinct ga.from_game_id
      from public.game_advancements ga
      where ga.group_key = p_group_key
        and ga.rule_type in ('better_winner', 'weaker_winner')
    ),
    contenders as (
      select
        fg.from_game_id,
        gr.winner_team_id,
        case
          when gr.winner_team_id = gr.left_team_id then gr.left_score
          else gr.right_score
        end as points_for,
        case
          when gr.winner_team_id = gr.left_team_id then gr.right_score
          else gr.left_score
        end as points_against,
        case
          when gr.winner_team_id = gr.left_team_id then coalesce(gr.left_tiebreak_score, 0)
          else coalesce(gr.right_tiebreak_score, 0)
        end as tiebreak_for,
        case
          when gr.winner_team_id = gr.left_team_id then coalesce(gr.right_tiebreak_score, 0)
          else coalesce(gr.left_tiebreak_score, 0)
        end as tiebreak_against
      from from_games fg
      join public.game_results gr on gr.game_id = fg.from_game_id
    )
    select
      from_game_id,
      winner_team_id,
      points_for,
      points_against,
      (points_for - points_against) as score_diff,
      tiebreak_for,
      tiebreak_against,
      (tiebreak_for - tiebreak_against) as tiebreak_diff
    into v_better
    from contenders
    order by
      (points_for - points_against) desc,
      points_for desc,
      (tiebreak_for - tiebreak_against) desc,
      tiebreak_for desc
    limit 1;

    with from_games as (
      select distinct ga.from_game_id
      from public.game_advancements ga
      where ga.group_key = p_group_key
        and ga.rule_type in ('better_winner', 'weaker_winner')
    ),
    contenders as (
      select
        fg.from_game_id,
        gr.winner_team_id,
        case
          when gr.winner_team_id = gr.left_team_id then gr.left_score
          else gr.right_score
        end as points_for,
        case
          when gr.winner_team_id = gr.left_team_id then gr.right_score
          else gr.left_score
        end as points_against,
        case
          when gr.winner_team_id = gr.left_team_id then coalesce(gr.left_tiebreak_score, 0)
          else coalesce(gr.right_tiebreak_score, 0)
        end as tiebreak_for,
        case
          when gr.winner_team_id = gr.left_team_id then coalesce(gr.right_tiebreak_score, 0)
          else coalesce(gr.left_tiebreak_score, 0)
        end as tiebreak_against
      from from_games fg
      join public.game_results gr on gr.game_id = fg.from_game_id
    )
    select
      from_game_id,
      winner_team_id,
      points_for,
      points_against,
      (points_for - points_against) as score_diff,
      tiebreak_for,
      tiebreak_against,
      (tiebreak_for - tiebreak_against) as tiebreak_diff
    into v_weaker
    from contenders
    order by
      (points_for - points_against) desc,
      points_for desc,
      (tiebreak_for - tiebreak_against) desc,
      tiebreak_for desc
    offset 1
    limit 1;

    if v_better.score_diff = v_weaker.score_diff
       and v_better.points_for = v_weaker.points_for
       and v_better.tiebreak_diff = v_weaker.tiebreak_diff
       and v_better.tiebreak_for = v_weaker.tiebreak_for then
      return jsonb_build_object(
        'ok', false,
        'group_key', p_group_key,
        'manual_review_required', true,
        'reason', 'score_group_tie'
      );
    end if;
  end if;

  for v_target in
    select distinct ga.to_game_id, ga.to_slot
    from public.game_advancements ga
    where ga.group_key = p_group_key
      and ga.rule_type = 'better_winner'
  loop
    perform public._set_game_result_slot(v_target.to_game_id, v_target.to_slot, v_better.winner_team_id);
    v_better_updates := v_better_updates + 1;
  end loop;

  for v_target in
    select distinct ga.to_game_id, ga.to_slot
    from public.game_advancements ga
    where ga.group_key = p_group_key
      and ga.rule_type = 'weaker_winner'
  loop
    perform public._set_game_result_slot(v_target.to_game_id, v_target.to_slot, v_weaker.winner_team_id);
    v_weaker_updates := v_weaker_updates + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'group_key', p_group_key,
    'better_winner_team_id', v_better.winner_team_id,
    'weaker_winner_team_id', v_weaker.winner_team_id,
    'better_updates', v_better_updates,
    'weaker_updates', v_weaker_updates
  );
end;
$$;

create or replace function public.apply_advancements_for_game(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_winner_team_id uuid;
  v_advancement record;
  v_group_key text;
  v_direct_updates integer := 0;
  v_group_results jsonb := '[]'::jsonb;
  v_group_result jsonb;
begin
  select gr.winner_team_id
  into v_winner_team_id
  from public.game_results gr
  where gr.game_id = p_game_id;

  if v_winner_team_id is null then
    return jsonb_build_object(
      'ok', false,
      'game_id', p_game_id,
      'reason', 'winner_not_set'
    );
  end if;

  for v_advancement in
    select ga.*
    from public.game_advancements ga
    where ga.from_game_id = p_game_id
      and ga.rule_type = 'direct_winner'
  loop
    perform public._set_game_result_slot(
      v_advancement.to_game_id,
      v_advancement.to_slot,
      v_winner_team_id
    );
    v_direct_updates := v_direct_updates + 1;
  end loop;

  for v_group_key in
    select distinct ga.group_key
    from public.game_advancements ga
    where ga.from_game_id = p_game_id
      and ga.rule_type in ('better_winner', 'weaker_winner')
      and ga.group_key is not null
  loop
    v_group_result := public.apply_group_advancement(v_group_key);
    v_group_results := v_group_results || jsonb_build_array(v_group_result);
  end loop;

  return jsonb_build_object(
    'ok', true,
    'game_id', p_game_id,
    'direct_updates', v_direct_updates,
    'group_results', v_group_results
  );
end;
$$;

create or replace function public.rebuild_bracket_points_for_sport(p_sport text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_final_game_id uuid;
  v_final_count integer;
  v_result record;
  v_winner_team_id uuid;
  v_loser_team_id uuid;
  v_points_count integer := 0;
begin
  select count(*)
  into v_final_count
  from public.games g
  where g.sport = p_sport
    and g.round = '결승'
    and g.kind = 'game';

  if v_final_count = 0 then
    return jsonb_build_object('ok', true, 'points_updated', false, 'reason', 'final_not_found');
  end if;

  if v_final_count > 1 then
    return jsonb_build_object('ok', false, 'points_updated', false, 'reason', 'multiple_finals_not_supported');
  end if;

  select g.id
  into v_final_game_id
  from public.games g
  where g.sport = p_sport
    and g.round = '결승'
    and g.kind = 'game'
  limit 1;

  select
    gr.left_team_id,
    gr.right_team_id,
    gr.winner_team_id,
    g.status
  into v_result
  from public.game_results gr
  join public.games g on g.id = gr.game_id
  where gr.game_id = v_final_game_id;

  if v_result.winner_team_id is null or v_result.status <> 'completed' then
    return jsonb_build_object('ok', true, 'points_updated', false, 'reason', 'final_not_completed');
  end if;

  v_winner_team_id := v_result.winner_team_id;

  if v_winner_team_id = v_result.left_team_id then
    v_loser_team_id := v_result.right_team_id;
  elsif v_winner_team_id = v_result.right_team_id then
    v_loser_team_id := v_result.left_team_id;
  else
    return jsonb_build_object('ok', false, 'points_updated', false, 'reason', 'winner_not_in_final_slots');
  end if;

  delete from public.team_points
  where source_type = 'game'
    and source_id = v_final_game_id;

  with participants as (
    select distinct team_id
    from (
      select gr.left_team_id as team_id
      from public.game_results gr
      join public.games g on g.id = gr.game_id
      where g.sport = p_sport and g.kind = 'game'
      union all
      select gr.right_team_id as team_id
      from public.game_results gr
      join public.games g on g.id = gr.game_id
      where g.sport = p_sport and g.kind = 'game'
    ) source
    where team_id is not null
  ),
  point_rows as (
    select
      p.team_id,
      case
        when p.team_id = v_winner_team_id then 8
        when p.team_id = v_loser_team_id then 5
        else 2
      end as points,
      case
        when p.team_id = v_winner_team_id then p_sport || ' 1위'
        when p.team_id = v_loser_team_id then p_sport || ' 2위'
        else p_sport || ' 참가점'
      end as reason
    from participants p
  )
  insert into public.team_points (team_id, source_type, source_id, points, reason)
  select team_id, 'game', v_final_game_id, points, reason
  from point_rows;

  get diagnostics v_points_count = row_count;

  return jsonb_build_object(
    'ok', true,
    'sport', p_sport,
    'source_id', v_final_game_id,
    'points_updated', true,
    'rows_inserted', v_points_count
  );
end;
$$;

create or replace function public.rebuild_relay_points(p_game_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows integer := 0;
begin
  update public.game_rankings
  set points_awarded = case rank_order
    when 1 then 12
    when 2 then 8
    when 3 then 5
    when 4 then 3
    when 5 then 1
    else 0
  end,
  updated_at = now()
  where game_id = p_game_id;

  delete from public.team_points
  where source_type = 'ranking'
    and source_id = p_game_id;

  insert into public.team_points (team_id, source_type, source_id, points, reason)
  select
    gr.team_id,
    'ranking',
    p_game_id,
    gr.points_awarded,
    '계주 ' || gr.rank_order || '위'
  from public.game_rankings gr
  where gr.game_id = p_game_id
    and gr.points_awarded is not null;

  get diagnostics v_rows = row_count;

  return jsonb_build_object(
    'ok', true,
    'game_id', p_game_id,
    'points_updated', true,
    'rows_inserted', v_rows
  );
end;
$$;

create or replace function public.submit_score_game_result(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game_id uuid := (payload->>'game_id')::uuid;
  v_left_score integer := (payload #>> '{regular_score,left}')::integer;
  v_right_score integer := (payload #>> '{regular_score,right}')::integer;
  v_tiebreak_type text := nullif(payload #>> '{tiebreak,type}', '');
  v_left_tiebreak_score integer := nullif(payload #>> '{tiebreak,left}', '')::integer;
  v_right_tiebreak_score integer := nullif(payload #>> '{tiebreak,right}', '')::integer;
  v_note text := payload->>'note';
  v_expected_tiebreak_type text;
  v_game record;
  v_result record;
  v_winner_team_id uuid;
  v_advancement_result jsonb;
  v_points_result jsonb;
begin
  if v_game_id is null then
    raise exception 'game_id is required';
  end if;

  if not coalesce(public.can_edit_game(v_game_id), false) then
    raise exception 'permission denied for game %', v_game_id;
  end if;

  select *
  into v_game
  from public.games
  where id = v_game_id;

  if not found then
    raise exception 'game not found: %', v_game_id;
  end if;

  if v_game.sport not in ('농구', '풋살') then
    raise exception 'submit_score_game_result only supports 농구/풋살, got %', v_game.sport;
  end if;

  if v_left_score is null or v_right_score is null then
    raise exception 'regular_score.left and regular_score.right are required';
  end if;

  insert into public.game_results (game_id)
  values (v_game_id)
  on conflict (game_id) do nothing;

  select *
  into v_result
  from public.game_results
  where game_id = v_game_id
  for update;

  if v_result.left_team_id is null or v_result.right_team_id is null then
    raise exception 'both left_team_id and right_team_id must be set before submitting result';
  end if;

  if v_left_score > v_right_score then
    v_winner_team_id := v_result.left_team_id;
    v_tiebreak_type := 'none';
    v_left_tiebreak_score := null;
    v_right_tiebreak_score := null;
  elsif v_right_score > v_left_score then
    v_winner_team_id := v_result.right_team_id;
    v_tiebreak_type := 'none';
    v_left_tiebreak_score := null;
    v_right_tiebreak_score := null;
  else
    v_expected_tiebreak_type := case
      when v_game.sport = '농구' then 'free_throw'
      else 'penalty_shootout'
    end;

    if v_tiebreak_type is null or v_tiebreak_type = 'none' then
      raise exception '% 동점은 % 점수가 필요합니다.', v_game.sport, v_expected_tiebreak_type;
    end if;

    if v_tiebreak_type <> v_expected_tiebreak_type then
      raise exception 'invalid tiebreak_type for %: expected %, got %',
        v_game.sport,
        v_expected_tiebreak_type,
        v_tiebreak_type;
    end if;

    if v_left_tiebreak_score is null or v_right_tiebreak_score is null then
      raise exception 'tiebreak.left and tiebreak.right are required';
    end if;

    if v_left_tiebreak_score = v_right_tiebreak_score then
      raise exception 'tiebreak score cannot be tied';
    end if;

    if v_left_tiebreak_score > v_right_tiebreak_score then
      v_winner_team_id := v_result.left_team_id;
    else
      v_winner_team_id := v_result.right_team_id;
    end if;
  end if;

  perform public.invalidate_downstream_games(v_game_id);

  update public.game_results
  set left_score = v_left_score,
      right_score = v_right_score,
      tiebreak_type = coalesce(v_tiebreak_type, 'none'),
      left_tiebreak_score = v_left_tiebreak_score,
      right_tiebreak_score = v_right_tiebreak_score,
      winner_team_id = v_winner_team_id,
      note = v_note,
      updated_by = public.current_admin_id(),
      updated_at = now()
  where game_id = v_game_id;

  update public.games
  set status = 'completed',
      actual_end_time = coalesce(actual_end_time, now()),
      updated_by = public.current_admin_id(),
      updated_at = now()
  where id = v_game_id;

  v_advancement_result := public.apply_advancements_for_game(v_game_id);
  v_points_result := public.rebuild_bracket_points_for_sport(v_game.sport);

  return jsonb_build_object(
    'ok', true,
    'game_id', v_game_id,
    'sport', v_game.sport,
    'winner_team_id', v_winner_team_id,
    'advancement', v_advancement_result,
    'points', v_points_result
  );
end;
$$;

create or replace function public.submit_rope_game_result(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game_id uuid := (payload->>'game_id')::uuid;
  v_sets jsonb := payload->'sets';
  v_note text := payload->>'note';
  v_game record;
  v_result record;
  v_set record;
  v_left_wins integer := 0;
  v_right_wins integer := 0;
  v_set_count integer := 0;
  v_winner_team_id uuid;
  v_advancement_result jsonb;
  v_points_result jsonb;
begin
  if v_game_id is null then
    raise exception 'game_id is required';
  end if;

  if not coalesce(public.can_edit_game(v_game_id), false) then
    raise exception 'permission denied for game %', v_game_id;
  end if;

  select *
  into v_game
  from public.games
  where id = v_game_id;

  if not found then
    raise exception 'game not found: %', v_game_id;
  end if;

  if v_game.sport <> '줄다리기' then
    raise exception 'submit_rope_game_result only supports 줄다리기, got %', v_game.sport;
  end if;

  if v_sets is null or jsonb_typeof(v_sets) <> 'array' then
    raise exception 'sets array is required';
  end if;

  insert into public.game_results (game_id)
  values (v_game_id)
  on conflict (game_id) do nothing;

  select *
  into v_result
  from public.game_results
  where game_id = v_game_id
  for update;

  if v_result.left_team_id is null or v_result.right_team_id is null then
    raise exception 'both left_team_id and right_team_id must be set before submitting result';
  end if;

  delete from public.game_result_sets
  where game_result_id = v_result.id;

  for v_set in
    select *
    from jsonb_to_recordset(v_sets) as x(
      set_number integer,
      left_score integer,
      right_score integer,
      duration_seconds integer,
      note text
    )
  loop
    if v_set.set_number is null then
      raise exception 'set_number is required';
    end if;

    if not (
      (v_set.left_score = 1 and v_set.right_score = 0)
      or
      (v_set.left_score = 0 and v_set.right_score = 1)
    ) then
      raise exception 'rope set score must be 1:0 or 0:1';
    end if;

    if v_set.duration_seconds is null or v_set.duration_seconds <= 0 then
      raise exception 'duration_seconds must be positive';
    end if;

    insert into public.game_result_sets (
      game_result_id,
      set_number,
      left_score,
      right_score,
      duration_seconds,
      note
    )
    values (
      v_result.id,
      v_set.set_number,
      v_set.left_score,
      v_set.right_score,
      v_set.duration_seconds,
      v_set.note
    );

    v_set_count := v_set_count + 1;
    if v_set.left_score > v_set.right_score then
      v_left_wins := v_left_wins + 1;
    else
      v_right_wins := v_right_wins + 1;
    end if;
  end loop;

  if v_set_count < 2 or v_set_count > 3 then
    raise exception 'rope result requires 2 or 3 sets';
  end if;

  if v_left_wins = 2 and v_right_wins < 2 then
    v_winner_team_id := v_result.left_team_id;
  elsif v_right_wins = 2 and v_left_wins < 2 then
    v_winner_team_id := v_result.right_team_id;
  else
    raise exception 'rope result must have exactly one team with 2 set wins';
  end if;

  perform public.invalidate_downstream_games(v_game_id);

  update public.game_results
  set left_score = v_left_wins,
      right_score = v_right_wins,
      tiebreak_type = 'none',
      left_tiebreak_score = null,
      right_tiebreak_score = null,
      winner_team_id = v_winner_team_id,
      note = v_note,
      updated_by = public.current_admin_id(),
      updated_at = now()
  where id = v_result.id;

  update public.games
  set status = 'completed',
      actual_end_time = coalesce(actual_end_time, now()),
      updated_by = public.current_admin_id(),
      updated_at = now()
  where id = v_game_id;

  v_advancement_result := public.apply_advancements_for_game(v_game_id);
  v_points_result := public.rebuild_bracket_points_for_sport(v_game.sport);

  return jsonb_build_object(
    'ok', true,
    'game_id', v_game_id,
    'winner_team_id', v_winner_team_id,
    'set_score', jsonb_build_object('left', v_left_wins, 'right', v_right_wins),
    'advancement', v_advancement_result,
    'points', v_points_result
  );
end;
$$;

create or replace function public.submit_dodgeball_game_result(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game_id uuid := (payload->>'game_id')::uuid;
  v_sets jsonb := payload->'sets';
  v_note text := payload->>'note';
  v_game record;
  v_result record;
  v_set record;
  v_left_wins integer := 0;
  v_right_wins integer := 0;
  v_set_count integer := 0;
  v_winner_team_id uuid;
  v_advancement_result jsonb;
  v_points_result jsonb;
begin
  if v_game_id is null then
    raise exception 'game_id is required';
  end if;

  if not coalesce(public.can_edit_game(v_game_id), false) then
    raise exception 'permission denied for game %', v_game_id;
  end if;

  select *
  into v_game
  from public.games
  where id = v_game_id;

  if not found then
    raise exception 'game not found: %', v_game_id;
  end if;

  if v_game.sport not like '%피구' then
    raise exception 'submit_dodgeball_game_result only supports 피구, got %', v_game.sport;
  end if;

  if v_sets is null or jsonb_typeof(v_sets) <> 'array' then
    raise exception 'sets array is required';
  end if;

  insert into public.game_results (game_id)
  values (v_game_id)
  on conflict (game_id) do nothing;

  select *
  into v_result
  from public.game_results
  where game_id = v_game_id
  for update;

  if v_result.left_team_id is null or v_result.right_team_id is null then
    raise exception 'both left_team_id and right_team_id must be set before submitting result';
  end if;

  delete from public.game_result_sets
  where game_result_id = v_result.id;

  for v_set in
    select *
    from jsonb_to_recordset(v_sets) as x(
      set_number integer,
      left_survivors integer,
      right_survivors integer,
      note text
    )
  loop
    if v_set.set_number is null then
      raise exception 'set_number is required';
    end if;

    if v_set.left_survivors is null or v_set.right_survivors is null then
      raise exception 'left_survivors and right_survivors are required';
    end if;

    if v_set.left_survivors < 0 or v_set.right_survivors < 0 then
      raise exception 'survivor counts must be zero or positive';
    end if;

    if v_set.left_survivors = v_set.right_survivors then
      raise exception 'dodgeball set cannot be tied';
    end if;

    insert into public.game_result_sets (
      game_result_id,
      set_number,
      left_score,
      right_score,
      duration_seconds,
      note
    )
    values (
      v_result.id,
      v_set.set_number,
      v_set.left_survivors,
      v_set.right_survivors,
      null,
      v_set.note
    );

    v_set_count := v_set_count + 1;
    if v_set.left_survivors > v_set.right_survivors then
      v_left_wins := v_left_wins + 1;
    else
      v_right_wins := v_right_wins + 1;
    end if;
  end loop;

  if v_set_count < 2 or v_set_count > 3 then
    raise exception 'dodgeball result requires 2 or 3 sets';
  end if;

  if v_left_wins = 2 and v_right_wins < 2 then
    v_winner_team_id := v_result.left_team_id;
  elsif v_right_wins = 2 and v_left_wins < 2 then
    v_winner_team_id := v_result.right_team_id;
  else
    raise exception 'dodgeball result must have exactly one team with 2 set wins';
  end if;

  perform public.invalidate_downstream_games(v_game_id);

  update public.game_results
  set left_score = v_left_wins,
      right_score = v_right_wins,
      tiebreak_type = 'none',
      left_tiebreak_score = null,
      right_tiebreak_score = null,
      winner_team_id = v_winner_team_id,
      note = v_note,
      updated_by = public.current_admin_id(),
      updated_at = now()
  where id = v_result.id;

  update public.games
  set status = 'completed',
      actual_end_time = coalesce(actual_end_time, now()),
      updated_by = public.current_admin_id(),
      updated_at = now()
  where id = v_game_id;

  v_advancement_result := public.apply_advancements_for_game(v_game_id);
  v_points_result := public.rebuild_bracket_points_for_sport(v_game.sport);

  return jsonb_build_object(
    'ok', true,
    'game_id', v_game_id,
    'winner_team_id', v_winner_team_id,
    'set_score', jsonb_build_object('left', v_left_wins, 'right', v_right_wins),
    'advancement', v_advancement_result,
    'points', v_points_result
  );
end;
$$;

create or replace function public.submit_relay_result(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game_id uuid := (payload->>'game_id')::uuid;
  v_rankings jsonb := payload->'rankings';
  v_note text := payload->>'note';
  v_game record;
  v_row_count integer;
  v_distinct_teams integer;
  v_distinct_ranks integer;
  v_expected_team_count integer;
  v_points_result jsonb;
begin
  if v_game_id is null then
    raise exception 'game_id is required';
  end if;

  if not coalesce(public.can_edit_game(v_game_id), false) then
    raise exception 'permission denied for game %', v_game_id;
  end if;

  select *
  into v_game
  from public.games
  where id = v_game_id;

  if not found then
    raise exception 'game not found: %', v_game_id;
  end if;

  if v_game.sport <> '계주' then
    raise exception 'submit_relay_result only supports 계주, got %', v_game.sport;
  end if;

  if v_rankings is null or jsonb_typeof(v_rankings) <> 'array' then
    raise exception 'rankings array is required';
  end if;

  with rows as (
    select *
    from jsonb_to_recordset(v_rankings) as x(
      team_id uuid,
      rank_order integer,
      record_value text,
      note text
    )
  )
  select count(*), count(distinct team_id), count(distinct rank_order)
  into v_row_count, v_distinct_teams, v_distinct_ranks
  from rows;

  select count(*)
  into v_expected_team_count
  from public.teams
  where is_active = true;

  if v_row_count <> v_expected_team_count then
    raise exception 'relay rankings must include exactly % active teams, got %',
      v_expected_team_count,
      v_row_count;
  end if;

  if v_row_count <> v_distinct_teams then
    raise exception 'relay rankings contain duplicate teams';
  end if;

  if v_row_count <> v_distinct_ranks then
    raise exception 'relay rankings contain duplicate ranks';
  end if;

  perform public.invalidate_downstream_games(v_game_id);

  delete from public.game_rankings
  where game_id = v_game_id;

  insert into public.game_rankings (
    game_id,
    team_id,
    rank_order,
    record_value,
    points_awarded,
    note
  )
  select
    v_game_id,
    r.team_id,
    r.rank_order,
    r.record_value,
    case r.rank_order
      when 1 then 12
      when 2 then 8
      when 3 then 5
      when 4 then 3
      when 5 then 1
      else 0
    end,
    coalesce(r.note, v_note)
  from jsonb_to_recordset(v_rankings) as r(
    team_id uuid,
    rank_order integer,
    record_value text,
    note text
  )
  order by r.rank_order;

  update public.games
  set status = 'completed',
      actual_end_time = coalesce(actual_end_time, now()),
      updated_by = public.current_admin_id(),
      updated_at = now()
  where id = v_game_id;

  insert into public.game_results (game_id)
  values (v_game_id)
  on conflict (game_id) do nothing;

  update public.game_results
  set left_team_id = null,
      right_team_id = null,
      left_score = null,
      right_score = null,
      winner_team_id = (
        select gr.team_id
        from public.game_rankings gr
        where gr.game_id = v_game_id
          and gr.rank_order = 1
        limit 1
      ),
      note = coalesce(v_note, '계주는 game_rankings로 관리'),
      updated_by = public.current_admin_id(),
      updated_at = now()
  where game_id = v_game_id;

  v_points_result := public.rebuild_relay_points(v_game_id);

  return jsonb_build_object(
    'ok', true,
    'game_id', v_game_id,
    'rankings_saved', v_row_count,
    'points', v_points_result
  );
end;
$$;

create or replace function public.can_edit_booth(target_booth_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id uuid;
  v_admin_role text;
begin
  select a.id, a.role
  into v_admin_id, v_admin_role
  from public.admins a
  where a.auth_user_id = auth.uid()
    and a.is_active = true
  limit 1;

  if v_admin_id is null then
    return false;
  end if;

  if v_admin_role = 'super_admin' then
    return true;
  end if;

  return exists (
    select 1
    from public.admin_assignments aa
    where aa.admin_id = v_admin_id
      and aa.booth_id = target_booth_id
      and aa.is_active = true
  );
end;
$$;

create or replace function public.rebuild_booth_points(p_booth_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booth record;
  v_rows integer := 0;
  v_is_weight boolean := false;
  v_is_shoe boolean := false;
  v_unit text := '점';
begin
  select *
  into v_booth
  from public.booths
  where id = p_booth_id;

  if not found then
    raise exception 'booth not found: %', p_booth_id;
  end if;

  v_is_weight := v_booth.name like '%웨이트%' or v_booth.name like '%데드%';
  v_is_shoe := v_booth.name like '%신발%';
  v_unit := case when v_is_weight then 'kg' else '점' end;

  delete from public.team_points
  where source_type = 'booth'
    and source_id = p_booth_id;

  if not (v_is_weight or v_is_shoe) then
    return jsonb_build_object(
      'ok', true,
      'booth_id', p_booth_id,
      'points_updated', false,
      'reason', 'not_a_point_booth',
      'rows_inserted', 0
    );
  end if;

  with aggregates as (
    select
      bs.team_id,
      case
        when v_is_weight then max(bs.score_value)
        else sum(bs.score_value)
      end as metric_value
    from public.booth_scores bs
    where bs.booth_id = p_booth_id
      and bs.team_id is not null
      and bs.score_value is not null
    group by bs.team_id
  ),
  ranked as (
    select
      a.team_id,
      a.metric_value,
      rank() over (order by a.metric_value desc) as rank_order
    from aggregates a
    where a.metric_value is not null
  )
  insert into public.team_points (team_id, source_type, source_id, points, reason)
  select
    r.team_id,
    'booth',
    p_booth_id,
    case r.rank_order
      when 1 then 12
      when 2 then 8
      when 3 then 5
      when 4 then 3
      when 5 then 1
      else 0
    end,
    v_booth.name || ' ' || r.rank_order || '위 (' || trim(to_char(r.metric_value, 'FM999999999.##')) || v_unit || ')'
  from ranked r
  where r.rank_order <= 5;

  get diagnostics v_rows = row_count;

  return jsonb_build_object(
    'ok', true,
    'booth_id', p_booth_id,
    'points_updated', true,
    'rows_inserted', v_rows
  );
end;
$$;

create or replace function public.submit_booth_scores(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booth_id uuid := (payload->>'booth_id')::uuid;
  v_mode text := coalesce(nullif(payload->>'mode', ''), 'replace');
  v_scores jsonb := coalesce(payload->'scores', '[]'::jsonb);
  v_note text := payload->>'note';
  v_score record;
  v_booth record;
  v_existing_score record;
  v_rows integer := 0;
  v_points_result jsonb;
begin
  if v_booth_id is null then
    raise exception 'booth_id is required';
  end if;

  if not coalesce(public.can_edit_booth(v_booth_id), false) then
    raise exception 'permission denied for booth %', v_booth_id;
  end if;

  select *
  into v_booth
  from public.booths
  where id = v_booth_id;

  if not found then
    raise exception 'booth not found: %', v_booth_id;
  end if;

  if jsonb_typeof(v_scores) <> 'array' then
    raise exception 'scores must be a json array';
  end if;

  if jsonb_array_length(v_scores) = 0 then
    raise exception 'at least one score row is required';
  end if;

  if v_mode = 'replace' and not exists (
    select 1
    from public.admins a
    where a.auth_user_id = auth.uid()
      and a.is_active = true
      and a.role = 'super_admin'
  ) then
    raise exception 'replace mode requires super_admin';
  end if;

  if v_mode = 'replace' then
    delete from public.booth_scores
    where booth_id = v_booth_id;
  elsif v_mode <> 'append' then
    raise exception 'invalid mode: %', v_mode;
  end if;

  for v_score in
    select *
    from jsonb_to_recordset(v_scores) as s(
      score_id uuid,
      team_id uuid,
      participant_name text,
      participant_student_id text,
      score_value numeric,
      score_unit text,
      attempt_count integer,
      note text
    )
  loop
    if v_score.team_id is null then
      raise exception 'team_id is required for every score row';
    end if;

    if v_score.score_value is null then
      raise exception 'score_value is required for every score row';
    end if;

    if v_score.score_value < 0 then
      raise exception 'score_value cannot be negative';
    end if;

    if position(U&'\C2E0\BC1C' in v_booth.name) > 0 and v_score.score_value > 50 then
      raise exception 'shoe throw score cannot exceed 50';
    end if;

    if v_booth.name like '%신발%' and v_score.score_value > 50 then
      raise exception 'shoe throw score cannot exceed 50';
    end if;

    if v_score.score_id is not null then
      select *
      into v_existing_score
      from public.booth_scores
      where id = v_score.score_id;

      if not found then
        raise exception 'booth score not found: %', v_score.score_id;
      end if;

      if v_existing_score.booth_id <> v_booth_id then
        raise exception 'booth score % does not belong to booth %', v_score.score_id, v_booth_id;
      end if;

      update public.booth_scores
      set
        team_id = v_score.team_id,
        participant_name = nullif(v_score.participant_name, ''),
        participant_student_id = nullif(v_score.participant_student_id, ''),
        score_value = v_score.score_value,
        score_unit = nullif(v_score.score_unit, ''),
        attempt_count = v_score.attempt_count,
        note = coalesce(nullif(v_score.note, ''), nullif(v_note, '')),
        recorded_by = public.current_admin_id(),
        updated_at = now()
      where id = v_score.score_id;
    else
      insert into public.booth_scores (
        booth_id,
        team_id,
        participant_name,
        participant_student_id,
        score_value,
        score_unit,
        attempt_count,
        note,
        recorded_by,
        updated_at
      )
      values (
        v_booth_id,
        v_score.team_id,
        nullif(v_score.participant_name, ''),
        nullif(v_score.participant_student_id, ''),
        v_score.score_value,
        nullif(v_score.score_unit, ''),
        v_score.attempt_count,
        coalesce(nullif(v_score.note, ''), nullif(v_note, '')),
        public.current_admin_id(),
        now()
      );
    end if;

    v_rows := v_rows + 1;
  end loop;

  v_points_result := public.rebuild_booth_points(v_booth_id);

  return jsonb_build_object(
    'ok', true,
    'booth_id', v_booth_id,
    'rows_saved', v_rows,
    'points', v_points_result
  );
end;
$$;

create or replace function public.submit_booth_session(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booth_id uuid := (payload->>'booth_id')::uuid;
  v_session_label text := coalesce(nullif(payload->>'session_label', ''), 'current');
  v_session_status text := coalesce(nullif(payload->>'session_status', ''), 'open');
  v_current_note text := payload->>'current_note';
  v_session_id uuid;
begin
  if v_booth_id is null then
    raise exception 'booth_id is required';
  end if;

  if not coalesce(public.can_edit_booth(v_booth_id), false) then
    raise exception 'permission denied for booth %', v_booth_id;
  end if;

  delete from public.booth_sessions
  where booth_id = v_booth_id
    and session_label = v_session_label;

  insert into public.booth_sessions (
    booth_id,
    title,
    slot_order,
    session_label,
    session_status,
    current_note,
    updated_by,
    updated_at
  )
  values (
    v_booth_id,
    v_session_label,
    1,
    v_session_label,
    v_session_status,
    nullif(v_current_note, ''),
    public.current_admin_id(),
    now()
  )
  returning id into v_session_id;

  return jsonb_build_object(
    'ok', true,
    'booth_id', v_booth_id,
    'session_id', v_session_id,
    'session_status', v_session_status
  );
end;
$$;

create or replace function public.start_event_item(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_target_id uuid := (payload->>'target_id')::uuid;
  v_target_type text := payload->>'target_type';
begin
  if v_target_id is null then
    raise exception 'target_id is required';
  end if;

  if v_target_type = 'game' then
    if not coalesce(public.can_edit_game(v_target_id), false) then
      raise exception 'permission denied for game %', v_target_id;
    end if;

    update public.games
    set status = 'in_progress',
        actual_start_time = coalesce(actual_start_time, now()),
        updated_by = public.current_admin_id(),
        updated_at = now()
    where id = v_target_id
      and coalesce(status, 'scheduled') <> 'completed';

    if not found then
      raise exception 'game not found or already completed: %', v_target_id;
    end if;

    return jsonb_build_object(
      'ok', true,
      'target_type', v_target_type,
      'target_id', v_target_id,
      'status', 'in_progress'
    );
  elsif v_target_type = 'booth' then
    if not coalesce(public.can_edit_booth(v_target_id), false) then
      raise exception 'permission denied for booth %', v_target_id;
    end if;

    update public.booths
    set status = 'in_progress'
    where id = v_target_id
      and coalesce(status, 'scheduled') <> 'completed';

    if not found then
      raise exception 'booth not found or already completed: %', v_target_id;
    end if;

    return jsonb_build_object(
      'ok', true,
      'target_type', v_target_type,
      'target_id', v_target_id,
      'status', 'in_progress'
    );
  end if;

  raise exception 'invalid target_type: %', v_target_type;
end;
$$;

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

revoke execute on function public._set_game_result_slot(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.invalidate_downstream_games(uuid) from public, anon, authenticated;
revoke execute on function public.can_edit_booth(uuid) from public, anon, authenticated;
revoke execute on function public.rebuild_booth_points(uuid) from public, anon, authenticated;
revoke execute on function public.get_scoreboard() from public;
revoke execute on function public.get_admin_context() from public, anon;
revoke execute on function public.apply_advancements_for_game(uuid) from public, anon, authenticated;
revoke execute on function public.apply_group_advancement(text) from public, anon, authenticated;
revoke execute on function public.rebuild_bracket_points_for_sport(text) from public, anon, authenticated;
revoke execute on function public.rebuild_relay_points(uuid) from public, anon, authenticated;

revoke execute on function public.submit_score_game_result(jsonb) from public, anon;
revoke execute on function public.submit_rope_game_result(jsonb) from public, anon;
revoke execute on function public.submit_dodgeball_game_result(jsonb) from public, anon;
revoke execute on function public.submit_relay_result(jsonb) from public, anon;
revoke execute on function public.submit_booth_scores(jsonb) from public, anon;
revoke execute on function public.submit_booth_session(jsonb) from public, anon;
revoke execute on function public.start_event_item(jsonb) from public, anon;
revoke execute on function public.override_group_advancement(text, uuid, uuid) from public, anon;

grant execute on function public.get_scoreboard() to anon, authenticated;
grant execute on function public.get_admin_context() to authenticated;
grant execute on function public.submit_score_game_result(jsonb) to authenticated;
grant execute on function public.submit_rope_game_result(jsonb) to authenticated;
grant execute on function public.submit_dodgeball_game_result(jsonb) to authenticated;
grant execute on function public.submit_relay_result(jsonb) to authenticated;
grant execute on function public.submit_booth_scores(jsonb) to authenticated;
grant execute on function public.submit_booth_session(jsonb) to authenticated;
grant execute on function public.start_event_item(jsonb) to authenticated;
grant execute on function public.override_group_advancement(text, uuid, uuid) to authenticated;

grant usage on schema public to anon, authenticated;

revoke all privileges on table
  public.admins,
  public.admin_assignments,
  public.teams,
  public.games,
  public.game_results,
  public.game_result_sets,
  public.game_rankings,
  public.game_advancements,
  public.booths,
  public.booth_scores,
  public.booth_sessions,
  public.team_points,
  public.team_scoreboard
from public, anon, authenticated;

revoke all privileges on all sequences in schema public from public, anon, authenticated;

alter default privileges in schema public
  revoke all on tables from public, anon, authenticated;

alter default privileges in schema public
  revoke all on sequences from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
