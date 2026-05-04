-- 부스 안내 문구 업데이트 SQL
-- 실행 위치: Supabase SQL Editor
--
-- 실제 부스 데이터는 public.booths에 저장하고,
-- 학생용 React 화면에서 필요한 guide 필드도 public.get_public_event_context()로 공개한다.
-- "학번 우승 상금", "미니게임 경품", "승부 예측의 신"은 부스 안내 카드에서 제외한다.

begin;

alter table public.booths
  add column if not exists guide text;

alter table public.booths
  add column if not exists visible boolean not null default true;

update public.booths
set
  summary = '남자 100kg / 여자 60kg 성공 시 하리보, 남녀 랭킹 1~3위에게 배민 상품권!',
  guide = E'🏋️ 웨이트 챌린지 (The Iron Will)\n• 성공 기준: 남자 100kg / 여자 60kg 성공 시 하리보 젤리 증정!\n• 랭킹 이벤트: 남/여 각 기록 1~3위에게는 배민 상품권 3만원권을 드립니다! (총 6명)\n• 남녀 랭킹 1~3위가 속한 학번에게는 체육대회 전체 점수도 부여!'
where name like '%웨이트%'
   or name like '%데드리프트%';

update public.booths
set
  summary = '30점 이상이면 하리보, 만점자 중 추첨으로 스타벅스 상품권!',
  guide = E'👟 신발 던지기\n• 성공 기준: 과녁에 신발을 던져 30점 이상 획득 시 하리보 젤리 증정!\n• 랭킹 이벤트: 만점자 중 추첨을 통해 스타벅스 상품권 1만원권을 드립니다! (총 10명)'
where name like '%신발%';

update public.booths
set
  summary = '페이스페인팅 받고 인증샷 올리면 배민/스타벅스 경품 추첨!',
  guide = E'📸 [SNS Event] 인증샷 찍고 팔로우!\n아름다운 페이스페인팅 받고 추억도 남기세요! 🎨\n• 방법: 페이스페인팅 후 체육대회 인증샷 찰칵! 📸 -> 혜윰 인스타 팔로우 + 태그해서 스토리 업로드!\n• 경품: 추첨을 통해 배민 상품권 3만원(5명) & 스타벅스 1만원(10명) ☕️'
where name like '%페이스%';

update public.booths
set
  summary = '체육대회 열기를 식혀줄 시원한 물총 싸움 타임!',
  guide = E'💦 시원하게 한 판! 물놀이 타임\n체육대회 당일, 열기를 식혀줄 시원한 물총 싸움이 가능합니다! 🔫\n• 학생회에서도 물총을 일부 구비해 두었으나, 수량이 넉넉하지 않아요! 😢\n• 제대로 즐기고 싶은 학우분들은 개인 물총을 지참해 주시는 센스! 부탁드립니다. 🌊\n뜨거운 열정과 즐거움이 가득할 이번 체육대회, 우리 모두 다치지 말고 신나게 즐겨봐요! 여러분의 많은 참여 부탁드립니다! 💙'
where name like '%물%';

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
      from public.teams
      where is_active = true
    ),
    'games', (
      select coalesce(jsonb_agg(
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
      ), '[]'::jsonb)
      from public.games
    ),
    'game_results', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'game_id', game_id,
          'left_team_id', left_team_id,
          'right_team_id', right_team_id,
          'left_score', left_score,
          'right_score', right_score,
          'winner_team_id', winner_team_id
        )
      ), '[]'::jsonb)
      from public.game_results
    ),
    'booths', (
      select coalesce(jsonb_agg(
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
      ), '[]'::jsonb)
      from public.booths
      where coalesce(visible, true) = true
    ),
    'scoreboard', public.get_scoreboard()
  );
end;
$$;

grant execute on function public.get_public_event_context() to anon, authenticated;

commit;

select
  name,
  summary,
  left(guide, 80) as guide_preview
from public.booths
where name like '%웨이트%'
   or name like '%데드리프트%'
   or name like '%신발%'
   or name like '%페이스%'
   or name like '%물%'
order by name;
