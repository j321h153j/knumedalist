begin;

-- 경찰과 도둑 부스 타임 세션 보정.
-- 기존 행이 있으면 업데이트하고, 없으면 삽입합니다.
-- 예전 컬럼(start_time/end_time/status)과
-- 새 컬럼(scheduled_start_time/scheduled_end_time/session_status)을 모두 채웁니다.

with target_booth as (
  select
    id,
    scheduled_start_time,
    scheduled_end_time,
    (scheduled_end_time - scheduled_start_time) / 5.0 as slot_interval
  from public.booths
  where name = U&'\ACBD\CC30\ACFC \B3C4\B451'
  limit 1
),
slots as (
  select
    tb.id as booth_id,
    gs.slot_order,
    tb.scheduled_start_time + tb.slot_interval * (gs.slot_order - 1) as slot_start,
    tb.scheduled_start_time + tb.slot_interval * gs.slot_order as slot_end,
    case
      when now() < tb.scheduled_start_time + tb.slot_interval * (gs.slot_order - 1) then 'scheduled'
      when now() >= tb.scheduled_start_time + tb.slot_interval * gs.slot_order then 'closed'
      else 'open'
    end as computed_status
  from target_booth tb
  cross join generate_series(1, 5) as gs(slot_order)
  where tb.scheduled_start_time is not null
    and tb.scheduled_end_time is not null
    and tb.scheduled_end_time > tb.scheduled_start_time
)
insert into public.booth_sessions (
  booth_id,
  title,
  slot_order,
  start_time,
  end_time,
  status,
  session_label,
  session_status,
  scheduled_start_time,
  scheduled_end_time,
  updated_at
)
select
  booth_id,
  slot_order || U&'\D0C0\C784',
  slot_order,
  slot_start,
  slot_end,
  computed_status,
  'time-' || slot_order,
  computed_status,
  slot_start,
  slot_end,
  now()
from slots
on conflict (booth_id, slot_order)
do update set
  title = excluded.title,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  status = excluded.status,
  session_label = excluded.session_label,
  session_status = excluded.session_status,
  scheduled_start_time = excluded.scheduled_start_time,
  scheduled_end_time = excluded.scheduled_end_time,
  updated_at = now();

notify pgrst, 'reload schema';

commit;

select
  b.name as booth_name,
  bs.title,
  bs.slot_order,
  bs.status,
  bs.session_status,
  bs.start_time,
  bs.end_time,
  bs.scheduled_start_time,
  bs.scheduled_end_time
from public.booth_sessions bs
join public.booths b on b.id = bs.booth_id
where b.name = U&'\ACBD\CC30\ACFC \B3C4\B451'
order by bs.slot_order;
