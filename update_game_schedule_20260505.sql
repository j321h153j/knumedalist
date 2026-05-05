-- 2026-05-06 revised schedule.
-- Times are written as absolute KST timestamps, so rerunning this SQL will not
-- move the schedule by another 10 minutes.

begin;

-- 1) Game/support schedule shown in the main event timeline.
with new_game_schedule(title, start_at, end_at) as (
  values
    ('개회사 및 체조',      timestamptz '2026-05-06 13:00:00+09', timestamptz '2026-05-06 13:10:00+09'),

    ('줄다리기 예선 1',    timestamptz '2026-05-06 13:10:00+09', timestamptz '2026-05-06 13:25:00+09'),
    ('줄다리기 예선 2',    timestamptz '2026-05-06 13:10:00+09', timestamptz '2026-05-06 13:25:00+09'),
    ('줄다리기 부결승',    timestamptz '2026-05-06 13:25:00+09', timestamptz '2026-05-06 13:40:00+09'),
    ('줄다리기 결승',      timestamptz '2026-05-06 13:40:00+09', timestamptz '2026-05-06 13:55:00+09'),

    ('남자 피구 예선 1',   timestamptz '2026-05-06 13:55:00+09', timestamptz '2026-05-06 14:30:00+09'),
    ('남자 피구 예선 2',   timestamptz '2026-05-06 13:55:00+09', timestamptz '2026-05-06 14:30:00+09'),
    ('여자 피구 예선 1',   timestamptz '2026-05-06 13:55:00+09', timestamptz '2026-05-06 14:30:00+09'),
    ('여자 피구 예선 2',   timestamptz '2026-05-06 13:55:00+09', timestamptz '2026-05-06 14:30:00+09'),

    ('남자 피구 부결승',   timestamptz '2026-05-06 14:30:00+09', timestamptz '2026-05-06 15:05:00+09'),
    ('여자 피구 부결승',   timestamptz '2026-05-06 14:30:00+09', timestamptz '2026-05-06 15:05:00+09'),

    ('풋살 결승',          timestamptz '2026-05-06 15:10:00+09', timestamptz '2026-05-06 15:45:00+09'),
    ('농구 결승',          timestamptz '2026-05-06 15:10:00+09', timestamptz '2026-05-06 15:45:00+09'),

    ('남자 피구 결승',     timestamptz '2026-05-06 15:50:00+09', timestamptz '2026-05-06 16:25:00+09'),
    ('여자 피구 결승',     timestamptz '2026-05-06 15:50:00+09', timestamptz '2026-05-06 16:25:00+09'),
    ('계주',               timestamptz '2026-05-06 16:25:00+09', timestamptz '2026-05-06 16:45:00+09'),

    ('시상식 및 출석체크', timestamptz '2026-05-06 16:45:00+09', timestamptz '2026-05-06 17:10:00+09')
)
update public.games as g
set
  scheduled_start_time = s.start_at,
  scheduled_end_time = s.end_at
from new_game_schedule as s
where g.title = s.title;

-- Two rows may both be titled "이동시간", so update them by their old/new time.
update public.games
set
  scheduled_start_time = timestamptz '2026-05-06 15:05:00+09',
  scheduled_end_time = timestamptz '2026-05-06 15:10:00+09'
where title = '이동시간'
  and (scheduled_start_time at time zone 'Asia/Seoul')::time in (time '15:15', time '15:05');

update public.games
set
  scheduled_start_time = timestamptz '2026-05-06 15:45:00+09',
  scheduled_end_time = timestamptz '2026-05-06 15:50:00+09'
where title = '이동시간'
  and (scheduled_start_time at time zone 'Asia/Seoul')::time in (time '15:55', time '15:45');

-- 2) Mini booth / snack truck block in the revised image.
-- If a booth name does not exist in your DB, it is simply skipped.
update public.booths
set
  scheduled_start_time = timestamptz '2026-05-06 13:10:00+09',
  scheduled_end_time = timestamptz '2026-05-06 16:25:00+09'
where name in (
  '물놀이존',
  '페이스페인팅',
  '경찰과 도둑',
  '웨이트 챌린지',
  '신발 던지기',
  '푸드트럭'
);

-- 3) Police-and-thieves time sessions are derived from the new booth time.
-- This keeps the student-facing "current time slot" display aligned.
with police_booth as (
  select
    id as booth_id,
    scheduled_start_time,
    scheduled_end_time,
    (scheduled_end_time - scheduled_start_time) / 5.0 as slot_interval
  from public.booths
  where name = '경찰과 도둑'
    and scheduled_start_time is not null
    and scheduled_end_time is not null
),
police_slots as (
  select
    pb.booth_id,
    gs.slot_order,
    pb.scheduled_start_time + pb.slot_interval * (gs.slot_order - 1) as slot_start,
    pb.scheduled_start_time + pb.slot_interval * gs.slot_order as slot_end
  from police_booth as pb
  cross join generate_series(1, 5) as gs(slot_order)
)
update public.booth_sessions as bs
set
  start_time = ps.slot_start,
  end_time = ps.slot_end,
  scheduled_start_time = ps.slot_start,
  scheduled_end_time = ps.slot_end,
  session_status = case
    when now() < ps.slot_start then 'scheduled'
    when now() >= ps.slot_end then 'closed'
    else 'open'
  end
from police_slots as ps
where bs.booth_id = ps.booth_id
  and bs.slot_order = ps.slot_order;

commit;

-- Verification: run after the update. Supabase SQL editor will show this result.
select
  title,
  to_char(scheduled_start_time at time zone 'Asia/Seoul', 'HH24:MI') as start_kst,
  to_char(scheduled_end_time at time zone 'Asia/Seoul', 'HH24:MI') as end_kst
from public.games
where title in (
  '개회사 및 체조',
  '줄다리기 예선 1',
  '줄다리기 예선 2',
  '줄다리기 부결승',
  '줄다리기 결승',
  '남자 피구 예선 1',
  '남자 피구 예선 2',
  '여자 피구 예선 1',
  '여자 피구 예선 2',
  '남자 피구 부결승',
  '여자 피구 부결승',
  '이동시간',
  '풋살 결승',
  '농구 결승',
  '남자 피구 결승',
  '여자 피구 결승',
  '계주',
  '시상식 및 출석체크'
)
order by scheduled_start_time, title;
