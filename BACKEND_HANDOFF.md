# 행운제 백엔드 인수인계서

이 문서는 프론트엔드 담당자가 Supabase 백엔드 구조를 이해하고 안전하게 연동하기 위한 설명서다. 현재 백엔드는 “테이블을 직접 수정하는 방식”이 아니라, 대부분 RPC를 통해 저장/계산/권한 검사를 처리하도록 설계되어 있다.

## 1. 핵심 요약

- DB는 Supabase Postgres를 사용한다.
- 운영진 로그인은 Supabase Auth를 사용한다.
- 운영진 권한은 `admins`, `admin_assignments` 테이블로 관리한다.
- 프론트는 대부분 테이블을 직접 읽거나 쓰지 않는다.
- 관리자 화면은 `get_admin_context()`로 필요한 데이터를 한 번에 가져온다.
- 결과 저장은 종목별 submit RPC를 호출한다.
- 점수 계산과 다음 대진 반영은 서버 RPC가 자동 처리한다.
- 학생용 공개 화면에서 현재 바로 쓸 수 있는 공개 RPC는 `get_scoreboard()` 정도다.
- 학생용 전체 일정/결과 공개 API가 필요하면 별도 `get_public_event_context()` 같은 공개 읽기 RPC를 추가하는 것이 좋다.

## 2. 주요 파일

```text
supabase_rpc_functions.sql
```

현재 백엔드의 메인 SQL 파일이다. 테이블 보강, 인덱스, view, RPC, 권한 revoke/grant가 들어 있다.

```text
manual_advancement_override_patch.sql
```

수동 대진 결정 RPC만 빠르게 재적용할 수 있는 패치 SQL이다. 현재 `supabase_rpc_functions.sql`에도 같은 함수가 포함되어 있다.

```text
admin.js
```

관리자 프론트에서 실제로 호출하는 RPC 이름과 payload 구조를 볼 수 있다.

## 3. Supabase 연결

프론트에서 사용하는 공개 anon key:

```js
const SUPABASE_URL = "https://texlipqnzkoylzeowvyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_S63yxUuVD_ld3bV0-aACUw_sck9ipiF";
```

주의:

- 이 key는 공개 프론트에 들어가도 되는 publishable anon key다.
- service role key는 절대 프론트에 넣으면 안 된다.
- 관리자 기능은 Supabase Auth 세션이 있어야 RPC 호출이 가능하다.

## 4. 주요 테이블

### `teams`

학번 팀 정보다.

예상 팀:

```text
22학번
23학번
24학번
25학번
26학번
```

점수판, 경기 결과, 부스 점수 모두 `team_id`를 기준으로 연결된다.

### `admins`

운영진 계정 정보다.

중요 컬럼:

```text
id
name
email
role
auth_user_id
is_active
```

`auth_user_id`가 Supabase Auth 유저 id와 연결된다.

`role`:

```text
super_admin  대표 운영진
staff        일반 운영진
```

### `admin_assignments`

일반 운영진이 어떤 경기/부스를 담당하는지 저장한다.

중요 컬럼:

```text
admin_id
game_id
booth_id
assignment_role
is_active
```

대표 운영진은 모든 경기/부스를 수정할 수 있다. 일반 운영진은 배정된 `game_id` 또는 `booth_id`만 수정할 수 있다.

### `games`

경기/행사 일정과 상태를 저장한다.

중요 컬럼:

```text
id
title
sport
round
kind
location
summary
scheduled_start_time
scheduled_end_time
status
actual_start_time
actual_end_time
updated_by
updated_at
```

`status` 흐름:

```text
scheduled -> in_progress -> completed
```

운영진이 시작 버튼을 누르면 `start_event_item()`이 `status = in_progress`, `actual_start_time = now()`로 바꾼다.

결과 저장 RPC가 성공하면 `status = completed`, `actual_end_time = now()`로 바꾼다.

### `game_results`

1대1 경기의 현재 대진과 결과를 저장한다.

중요 컬럼:

```text
game_id
left_team_id
right_team_id
left_score
right_score
winner_team_id
tiebreak_type
left_tiebreak_score
right_tiebreak_score
note
updated_by
updated_at
```

농구/풋살/줄다리기/피구의 최종 승자는 `winner_team_id`에 들어간다.

계주는 1대1 구조가 아니므로 `game_rankings`를 기준으로 관리한다.

### `game_result_sets`

세트 단위 결과를 저장한다.

사용 종목:

```text
줄다리기
피구
```

줄다리기:

```text
set_number
left_score
right_score
duration_seconds
```

피구:

```text
set_number
left_score   왼쪽 팀 생존자 수
right_score  오른쪽 팀 생존자 수
```

### `game_rankings`

순위형 경기 결과를 저장한다.

현재 대표 사용처:

```text
계주
```

중요 컬럼:

```text
game_id
team_id
rank_order
record_value
points_awarded
```

### `game_advancements`

다음 대진 자동 배정을 위한 테이블이다.

중요 컬럼:

```text
from_game_id
to_game_id
to_slot
rule_type
group_key
```

한 줄의 의미:

```text
from_game_id 경기 결과를 보고,
to_game_id 경기의
to_slot(left/right)에
rule_type 규칙으로 뽑힌 팀을 넣는다.
```

`rule_type`:

```text
better_winner   예선 승자 2팀 중 더 강한 팀
weaker_winner   예선 승자 2팀 중 더 약한 팀
direct_winner   해당 경기 승자 그대로 다음 경기로 이동
```

현재 bracket 규칙:

```text
예선 1, 예선 2 승자 중 better_winner -> 결승 left
예선 1, 예선 2 승자 중 weaker_winner -> 부결승 left
부전승 팀 -> 부결승 right
부결승 winner -> 결승 right
```

중요:

- 부전승 팀은 결승에 바로 들어가지 않는다.
- 부전승 팀은 부결승 right에만 미리 들어간다.
- 부결승 승자가 결승 right로 간다.

### `team_points`

종합 점수판의 원천 테이블이다.

중요 컬럼:

```text
team_id
source_type
source_id
points
reason
```

점수는 경기 결과나 부스 기록 저장 시 자동으로 다시 계산된다.

`source_type` 예시:

```text
game
ranking
booth
```

프론트는 점수판을 직접 계산하지 않는 것이 좋다. `team_points`를 기반으로 한 `get_scoreboard()` 결과를 사용한다.

### `booths`

부스 기본 정보와 운영 상태를 저장한다.

중요 컬럼:

```text
id
name
location
summary
guide
scheduled_start_time
scheduled_end_time
status
```

### `booth_scores`

점수형 부스의 개인 기록을 저장한다.

사용 부스:

```text
웨이트 챌린지
데드리프트
신발던지기
```

중요 컬럼:

```text
booth_id
team_id
participant_name
participant_student_id
score_value
score_unit
attempt_count
recorded_by
created_at
updated_at
```

현재 프론트에서는 참가자 이름, 팀, 기록/점수만 받는다. 학번 입력은 제거되어 있다.

### `booth_sessions`

일반 부스의 운영 상태/세션을 저장한다.

사용 예:

```text
경찰과 도둑 현재 타임
일반 부스 운영 중/일시중단/종료
```

중요 컬럼:

```text
booth_id
title
slot_order
session_label
session_status
scheduled_start_time
scheduled_end_time
current_note
updated_by
```

## 5. View와 공개 점수판

### `team_scoreboard`

`team_points`를 팀별로 합산한 view다.

현재 SQL에서는:

```sql
create or replace view public.team_scoreboard
with (security_invoker = true)
```

로 정의되어 있다.

### `get_scoreboard()`

공개 점수판 RPC다.

권한:

```sql
grant execute on function public.get_scoreboard() to anon, authenticated;
```

반환 구조:

```json
{
  "ok": true,
  "generated_at": "...",
  "rankings": [
    {
      "team_id": "...",
      "team_name": "22학번",
      "rank_order": 1,
      "total_points": 30,
      "sources": [
        {
          "source_type": "game",
          "source_id": "...",
          "source_title": "줄다리기 결승",
          "points": 8,
          "reason": "줄다리기 1위"
        }
      ]
    }
  ],
  "point_sources": []
}
```

주의:

- `source_title`은 실제 점수 source가 된 경기명이라 `줄다리기 결승`처럼 나올 수 있다.
- 관리자 프론트에서는 화면에서 이를 `줄다리기`처럼 정리해서 보여준다.
- 학생용 프론트도 표시용 이름은 프론트에서 정리하거나, 별도 공개 RPC에서 가공해서 주는 것이 좋다.

## 6. 관리자 Auth 흐름

관리자 로그인:

```js
supabase.auth.signInWithPassword({ email, password })
```

로그인 후:

```js
supabase.rpc("get_admin_context")
```

현재 관리자 프론트는 세션 유지가 켜져 있다.

```js
persistSession: true
autoRefreshToken: true
detectSessionInUrl: false
```

새로고침 시:

```js
supabase.auth.getSession()
```

으로 기존 세션을 복구한 뒤 `get_admin_context()`를 다시 호출한다.

로그아웃:

```js
supabase.auth.signOut()
```

## 7. 관리자 context RPC

### `get_admin_context()`

관리자 화면에서 필요한 대부분의 데이터를 한 번에 가져온다.

권한:

```sql
grant execute on function public.get_admin_context() to authenticated;
```

반환 데이터:

```json
{
  "ok": true,
  "admin": {},
  "assignments": [],
  "games": [],
  "booths": [],
  "teams": [],
  "game_results": [],
  "game_result_sets": [],
  "game_rankings": [],
  "booth_scores": [],
  "booth_sessions": [],
  "scoreboard": {}
}
```

중요:

- 일반 운영진도 전체 현황을 읽을 수 있다.
- 쓰기 권한은 submit RPC 내부에서 다시 검사한다.
- 학생용 공개 프론트에서 이 RPC를 쓰면 안 된다.

## 8. 경기 시작 RPC

### `start_event_item(payload jsonb)`

경기/부스 시작 상태를 저장한다.

payload:

```json
{
  "target_id": "uuid",
  "target_type": "game"
}
```

또는:

```json
{
  "target_id": "uuid",
  "target_type": "booth"
}
```

처리:

- `game`이면 `games.status = in_progress`
- `game`이면 `actual_start_time = now()`
- `booth`이면 `booths.status = in_progress`
- 권한이 없으면 실패

## 9. 경기 결과 저장 RPC

### 농구/풋살: `submit_score_game_result(payload jsonb)`

payload:

```json
{
  "game_id": "uuid",
  "regular_score": {
    "left": 10,
    "right": 8
  },
  "tiebreak": {
    "type": "none",
    "left": null,
    "right": null
  },
  "note": null
}
```

동점이면:

농구:

```json
{
  "tiebreak": {
    "type": "free_throw",
    "left": 3,
    "right": 2
  }
}
```

풋살:

```json
{
  "tiebreak": {
    "type": "penalty_shootout",
    "left": 4,
    "right": 3
  }
}
```

처리:

- 정규 점수로 승자 결정
- 정규 점수가 동점이면 자유투/승부차기 점수로 승자 결정
- 결과 저장 후 `apply_advancements_for_game()`
- 점수 재계산 `rebuild_bracket_points_for_sport()`

### 줄다리기: `submit_rope_game_result(payload jsonb)`

payload:

```json
{
  "game_id": "uuid",
  "sets": [
    {
      "set_number": 1,
      "left_score": 1,
      "right_score": 0,
      "duration_seconds": 42,
      "note": ""
    }
  ],
  "note": null
}
```

규칙:

- 3판 2선승
- 2:0이면 2세트만 입력
- 2:1이면 3세트 입력
- 승자 비교 시 무패, 세트 득실, 총 소요 시간 순으로 better/worse를 결정

### 피구: `submit_dodgeball_game_result(payload jsonb)`

payload:

```json
{
  "game_id": "uuid",
  "sets": [
    {
      "set_number": 1,
      "left_survivors": 5,
      "right_survivors": 2,
      "note": ""
    }
  ],
  "note": null
}
```

규칙:

- 3판 2선승
- 각 세트는 생존자 수가 더 많은 팀이 승리
- 예선 승자 비교 시 패수 적은 팀 우선
- 패수가 같으면 모든 경기의 자기 팀 생존자 합이 많은 팀 우선

### 계주: `submit_relay_result(payload jsonb)`

payload:

```json
{
  "game_id": "uuid",
  "rankings": [
    {
      "team_id": "uuid",
      "rank_order": 1,
      "record_value": "1:23.45",
      "note": ""
    }
  ],
  "note": null
}
```

처리:

- `game_rankings`에 순위 저장
- `game_results`에는 winner 정도만 보조로 저장
- `rebuild_relay_points()`로 점수 재계산

## 10. 대진 자동 반영

### `apply_advancements_for_game(p_game_id uuid)`

결과가 저장된 경기 기준으로 다음 경기 대진을 반영한다.

처리:

- `direct_winner`는 해당 경기 승자를 다음 경기 슬롯에 바로 넣는다.
- `better_winner`, `weaker_winner` 그룹은 `apply_group_advancement(group_key)`로 처리한다.

### `apply_group_advancement(p_group_key text)`

예선 2경기의 승자를 비교해서 better/worse를 결정한다.

농구/풋살 비교:

```text
득실차
다득점
자유투/승부차기 득실
자유투/승부차기 득점
완전 동률이면 manual review
```

줄다리기 비교:

```text
무패 여부
세트 득실
총 소요 시간 짧은 팀
완전 동률이면 manual review
```

피구 비교:

```text
패수 적은 팀
자기 팀 생존자 총합 많은 팀
완전 동률이면 manual review
```

결과:

```text
better_winner -> 결승 left
weaker_winner -> 부결승 left
```

## 11. 수동 대진 결정

### `override_group_advancement(p_group_key, p_better_winner_team_id, p_weaker_winner_team_id)`

자동 비교가 동률이거나 운영진이 직접 결정해야 할 때 사용한다.

권한:

```text
super_admin만 가능
```

현재 관리자 UI는 “부결승 진출 팀”을 고르게 되어 있다.

프론트 처리:

```text
운영진이 선택한 팀 -> weaker_winner
남은 팀 -> better_winner
```

서버 처리:

- 선택된 두 팀이 실제 예선 승자인지 확인
- downstream 부결승/결승 결과 초기화
- better_winner를 결승 left에 배치
- weaker_winner를 부결승 left에 배치

주의:

- RPC 파라미터 이름은 여전히 `p_better_winner_team_id`, `p_weaker_winner_team_id`다.
- 프론트 UI에서 “부결승 진출 팀”을 선택하면 프론트가 남은 팀을 better로 계산해서 보낸다.

## 12. 점수 계산

### bracket 종목

사용 함수:

```text
rebuild_bracket_points_for_sport(p_sport)
```

현재 점수:

```text
1위 8점
2위 5점
참가 2점
```

대상:

```text
농구
풋살
줄다리기
피구
```

점수는 결승이 completed일 때만 반영된다.

### 계주

사용 함수:

```text
rebuild_relay_points(p_game_id)
```

현재 점수:

```text
1위 12점
2위 8점
3위 5점
4위 3점
5위 1점
```

### 부스 점수

사용 함수:

```text
rebuild_booth_points(p_booth_id)
```

웨이트/데드리프트:

```text
팀별 최고 기록 기준
```

신발던지기:

```text
팀별 개인 점수 합산 기준
```

현재 점수:

```text
1위 12점
2위 8점
3위 5점
4위 3점
5위 1점
```

동점:

- SQL에서 `rank()`를 사용한다.
- 공동 1위 다음은 3위가 된다.

## 13. 부스 저장 RPC

### `submit_booth_scores(payload jsonb)`

웨이트/신발던지기 같은 점수형 부스 기록을 저장한다.

payload:

```json
{
  "booth_id": "uuid",
  "mode": "append",
  "scores": [
    {
      "score_id": null,
      "team_id": "uuid",
      "participant_name": "홍길동",
      "participant_student_id": null,
      "score_value": 40,
      "score_unit": "kg",
      "attempt_count": null,
      "note": null
    }
  ],
  "note": null
}
```

수정 시:

```json
{
  "score_id": "기존 booth_scores.id"
}
```

신발던지기:

- 50점 초과는 서버에서 막는다.
- 프론트에서도 `max=50`으로 막고 있다.

### `submit_booth_session(payload jsonb)`

일반 부스 상태 저장.

payload:

```json
{
  "booth_id": "uuid",
  "session_label": "current",
  "session_status": "open",
  "current_note": null
}
```

`session_status`:

```text
open
paused
closed
```

## 14. 권한 구조

현재 SQL 마지막에는 테이블 direct access를 대부분 revoke한다.

핵심:

```sql
revoke all privileges on table ...
from public, anon, authenticated;
```

그리고 필요한 RPC만 grant한다.

관리자용:

```sql
grant execute on function public.get_admin_context() to authenticated;
grant execute on function public.submit_score_game_result(jsonb) to authenticated;
grant execute on function public.submit_rope_game_result(jsonb) to authenticated;
grant execute on function public.submit_dodgeball_game_result(jsonb) to authenticated;
grant execute on function public.submit_relay_result(jsonb) to authenticated;
grant execute on function public.submit_booth_scores(jsonb) to authenticated;
grant execute on function public.submit_booth_session(jsonb) to authenticated;
grant execute on function public.start_event_item(jsonb) to authenticated;
grant execute on function public.override_group_advancement(text, uuid, uuid) to authenticated;
```

공개용:

```sql
grant execute on function public.get_scoreboard() to anon, authenticated;
```

## 15. 프론트에서 중요한 주의사항

### 관리자 프론트

관리자 프론트는 다음 순서로 움직이면 된다.

```text
1. Supabase Auth 로그인
2. get_admin_context()
3. 사용자가 시작 버튼 클릭
4. start_event_item()
5. 사용자가 결과 입력
6. 종목별 submit RPC
7. 서버가 대진/점수 자동 계산
8. get_admin_context() 재조회
```

결과 저장 후 프론트에서 직접 다음 대진이나 점수를 계산하지 말 것.

### 학생 프론트

현재 학생 프론트에서 안전하게 쓸 수 있는 공개 RPC는:

```text
get_scoreboard()
```

뿐이다.

학생용으로 일정/현재 진행/경기 결과/부스 상태까지 보여주려면 새 공개 RPC가 필요하다.

추천 이름:

```text
get_public_event_context()
```

이 RPC는 다음만 공개해야 한다.

```text
teams
games 중 공개 가능한 컬럼
game_results 중 공개 가능한 결과 컬럼
game_result_sets
game_rankings
booths
booth_sessions
scoreboard
```

공개하면 안 되는 정보:

```text
admins
admin_assignments
updated_by
운영진 이메일
내부 권한 정보
```

## 16. 시간 처리

DB의 시간은 `timestamptz`다.

프론트는 한국 시간으로 표시해야 한다.

추천:

```js
new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});
```

주의:

- 프론트에서 임의로 9시간을 더하거나 빼지 말 것.
- 시간이 틀리면 DB 값이 한국 기준으로 들어갔는지 먼저 확인할 것.

## 17. 자주 헷갈리는 포인트

### `games`와 `game_results` 차이

`games`:

```text
경기 자체의 일정/상태
```

`game_results`:

```text
그 경기의 대진/점수/승자
```

### `game_result_sets`는 왜 필요한가

줄다리기와 피구는 단순 최종 점수만으로 비교할 수 없다.

줄다리기:

```text
세트 승패와 시간
```

피구:

```text
세트별 생존자 수
```

가 필요하다.

### `game_advancements`는 점수가 아니다

이 테이블은 “누가 다음 경기에 들어가는지”를 나타내는 이동 규칙이다.

점수판은 `team_points`가 담당한다.

### `team_points`는 누적 insert가 아니다

결과가 수정될 수 있으므로, 각 rebuild 함수는 기존 source 점수를 지우고 다시 계산한다.

그래서 중간 결과를 수정해도 점수판이 비교적 안전하다.

### 부결승/결승 구조

많이 헷갈리는 규칙:

```text
부전승 팀은 결승 직행이 아니다.
부전승 팀은 부결승 right에 들어간다.
예선 better_winner가 결승 left로 간다.
예선 weaker_winner가 부결승 left로 간다.
부결승 승자가 결승 right로 간다.
```

## 18. 현재 남은 백엔드 추천 작업

학생용 프론트를 제대로 만들려면 다음 RPC를 추가하는 것이 좋다.

```text
get_public_event_context()
```

목적:

```text
로그인 없이 학생 화면에서 필요한 공개 데이터만 한 번에 조회
```

반환 추천:

```json
{
  "ok": true,
  "generated_at": "...",
  "teams": [],
  "games": [],
  "game_results": [],
  "game_result_sets": [],
  "game_rankings": [],
  "booths": [],
  "booth_sessions": [],
  "scoreboard": {}
}
```

이 RPC를 만들기 전까지 학생용 프론트가 관리자용 `get_admin_context()`를 사용하면 안 된다.

## 19. 실행/반영 주의

Supabase SQL Editor에서 전체 재적용이 필요하면:

```text
supabase_rpc_functions.sql
```

수동 대진 함수만 빠르게 고치려면:

```text
manual_advancement_override_patch.sql
```

SQL 적용 후 PostgREST schema cache 문제를 피하기 위해 파일 끝에 다음이 포함되어 있다.

```sql
notify pgrst, 'reload schema';
```

## 20. 프론트 AI에게 한 문장으로 설명

이 백엔드는 “프론트가 점수/대진을 계산하는 구조”가 아니다. 프론트는 입력값만 RPC로 보내고, 서버가 권한 확인, 결과 저장, 다음 대진 배정, 점수판 재계산을 모두 처리한다.
