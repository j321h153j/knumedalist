begin;

create or replace function public.get_booth_ranking_summary(p_booth_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booth record;
  v_is_weight boolean := false;
  v_is_shoe boolean := false;
  v_unit text := U&'\C810';
begin
  select *
  into v_booth
  from public.booths
  where id = p_booth_id
    and coalesce(visible, true) = true;

  if not found then
    return '[]'::jsonb;
  end if;

  v_is_weight :=
    position(U&'\C6E8\C774\D2B8' in v_booth.name) > 0
    or position(U&'\B370\B4DC' in v_booth.name) > 0
    or lower(v_booth.name) like '%weight%'
    or lower(v_booth.name) like '%deadlift%';

  v_is_shoe :=
    position(U&'\C2E0\BC1C' in v_booth.name) > 0
    or lower(v_booth.name) like '%shoe%';

  v_unit := case when v_is_weight then 'kg' else U&'\C810' end;

  if not (v_is_weight or v_is_shoe) then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
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
          t.name as team_name,
          a.metric_value,
          rank() over (order by a.metric_value desc) as rank_order
        from aggregates a
        join public.teams t on t.id = a.team_id
        where a.metric_value is not null
          and coalesce(t.is_active, true) = true
      )
      select jsonb_agg(
        jsonb_build_object(
          'rank_order', r.rank_order,
          'team_id', r.team_id,
          'team_name', r.team_name,
          'score_value', r.metric_value,
          'score_unit', v_unit,
          'score_display',
            case
              when r.metric_value = trunc(r.metric_value) then trunc(r.metric_value)::text
              else trim(to_char(r.metric_value, 'FM999999999.99'))
            end || v_unit
        )
        order by r.rank_order, r.team_name
      )
      from ranked r
      where r.rank_order <= 5
    ),
    '[]'::jsonb
  );
end;
$$;

revoke execute on function public.get_booth_ranking_summary(uuid) from public;
grant execute on function public.get_booth_ranking_summary(uuid) to anon, authenticated;

notify pgrst, 'reload schema';

commit;

select
  b.name as booth_name,
  public.get_booth_ranking_summary(b.id) as ranking_summary
from public.booths b
where position(U&'\C6E8\C774\D2B8' in b.name) > 0
  or position(U&'\B370\B4DC' in b.name) > 0
  or position(U&'\C2E0\BC1C' in b.name) > 0
  or lower(b.name) like '%weight%'
  or lower(b.name) like '%deadlift%'
  or lower(b.name) like '%shoe%'
order by b.name;
