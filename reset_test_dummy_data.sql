begin;

-- ============================================================
-- 행운제 실전 전 테스트 더미 데이터 초기화 SQL
--
-- 지우는 것:
-- - 경기 점수/승자/세트 기록/계주 순위
-- - 부스 테스트 기록
-- - 테스트로 계산된 team_points
-- - 테스트로 시작/종료 처리된 상태
--
-- 남기는 것:
-- - teams
-- - games
-- - booths
-- - admins / admin_assignments
-- - game_advancements
-- - 예선 기본 대진
-- - 부결승 right에 들어간 부전승 팀
-- - 경찰과 도둑 booth_sessions 시간표
-- ============================================================

-- 1. 점수 산출물과 상세 기록 삭제
delete from public.game_result_sets;
delete from public.game_rankings;
delete from public.booth_scores;
delete from public.team_points;

-- 2. 모든 경기 상태를 시작 전으로 되돌림
update public.games
set
  status = 'scheduled',
  actual_start_time = null,
  actual_end_time = null,
  updated_at = now()
where kind = 'game';

-- 3. 경기 결과값 초기화
-- left_team_id/right_team_id는 일단 유지하고,
-- 아래 단계에서 부결승/결승의 자동 배정 슬롯만 따로 비움.
update public.game_results
set
  left_score = null,
  right_score = null,
  winner_team_id = null,
  tiebreak_type = 'none',
  left_tiebreak_score = null,
  right_tiebreak_score = null,
  note = null,
  updated_at = now();

-- 4. 부결승/결승 left 슬롯 비움
-- 부결승 left: 예선 weaker_winner가 나중에 들어오는 자리
-- 결승 left: 예선 better_winner가 나중에 들어오는 자리
update public.game_results gr
set
  left_team_id = null,
  updated_at = now()
from public.games g
where g.id = gr.game_id
  and g.kind = 'game'
  and (
    g.title like '%부결승'
    or g.title like '% 결승'
  );

-- 5. 결승 right 슬롯 비움
-- 결승 right: 부결승 승자가 나중에 들어오는 자리
-- 주의: 부결승 right는 부전승 팀이므로 절대 지우지 않음.
update public.game_results gr
set
  right_team_id = null,
  updated_at = now()
from public.games g
where g.id = gr.game_id
  and g.kind = 'game'
  and g.title like '% 결승';

-- 6. 계주는 1대1 대진이 아니므로 팀/점수 모두 비움
update public.game_results gr
set
  left_team_id = null,
  right_team_id = null,
  left_score = null,
  right_score = null,
  winner_team_id = null,
  tiebreak_type = 'none',
  left_tiebreak_score = null,
  right_tiebreak_score = null,
  note = '계주는 game_rankings로 관리',
  updated_at = now()
from public.games g
where g.id = gr.game_id
  and g.title = '계주';

-- 7. 부스 상태 초기화
update public.booths
set
  status = 'scheduled',
  updated_at = now();

-- 8. booth_sessions 상태 보정
-- 시간표는 지우지 않고, 현재 시각 기준으로 scheduled/open/closed만 다시 계산.
-- 경찰과 도둑 타임표 같은 데이터는 유지됨.
with computed_sessions as (
  select
    id,
    case
      when coalesce(scheduled_start_time, start_time) is null
        or coalesce(scheduled_end_time, end_time) is null
        then 'scheduled'
      when now() < coalesce(scheduled_start_time, start_time)
        then 'scheduled'
      when now() >= coalesce(scheduled_end_time, end_time)
        then 'closed'
      else 'open'
    end as computed_status
  from public.booth_sessions
)
update public.booth_sessions bs
set
  status = cs.computed_status,
  session_status = cs.computed_status,
  updated_at = now()
from computed_sessions cs
where cs.id = bs.id;

notify pgrst, 'reload schema';

commit;

-- ============================================================
-- 확인 결과
-- 아래 4개 테이블 count가 0이면 테스트 결과/기록은 삭제 완료.
-- ============================================================

select 'game_result_sets' as table_name, count(*) as row_count from public.game_result_sets
union all
select 'game_rankings', count(*) from public.game_rankings
union all
select 'booth_scores', count(*) from public.booth_scores
union all
select 'team_points', count(*) from public.team_points;

