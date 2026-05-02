# 학생용 웹 프론트 인수인계서

이 문서는 다음 AI가 `행운제` 학생용 웹을 이어서 만들 때 필요한 현재 상태, 백엔드 구조, 주의사항을 정리한 것이다. 현재 운영진 웹과 Supabase 백엔드는 상당 부분 구현되어 있고, 학생용 웹은 새로 만드는 것이 좋다.

## 1. 프로젝트 목적

- 행운제/체육대회 당일 학생들이 모바일에서 보는 공개 웹을 만든다.
- 학생은 로그인하지 않는다.
- 학생 화면은 읽기 전용이다.
- 보여줘야 할 핵심 정보는 현재 진행 중인 경기/부스, 다음 일정, 경기 결과, 종합 점수판, 부스 운영 상태다.
- 운영진 입력/수정 기능은 `admin.html` 쪽에서 이미 따로 관리한다.

## 2. 현재 파일 상태

현재 작업 폴더:

```text
C:\Users\hyunjin\Documents\Codex\2026-04-30\new-chat
```

중요 파일:

```text
index.html                  학생용 웹 현재 진입점. 지금은 오래된 정적 목업이며 한글 깨짐이 있음.
app.js                      학생용 웹 현재 JS. Supabase 미연결 정적 목업이며 새로 작성 권장.
data.js                     학생용 목업 데이터. 실제 서비스에서는 의존하지 않는 것이 좋음.
styles.css                  관리자/학생 공용 CSS. 관리자 스타일도 들어 있으므로 수정 시 조심.
admin.html                  운영진 전용 페이지.
admin.js                    운영진 웹 로직. Supabase Auth/RPC 연결 완료.
supabase_rpc_functions.sql  현재 백엔드 RPC 함수 모음.
netlify.toml                Netlify 정적 배포 설정.
assets/                     이미지/아이콘 등 정적 리소스.
```

현재 `index.html`, `app.js`, `data.js`는 학생용 실서비스 코드로 보기 어렵다. 한글이 깨져 있고, 정적 목업 데이터 기반이다. 학생용 웹은 기존 파일을 조금 고치기보다 새 구조로 재작성하는 편이 빠르고 안전하다.

## 3. Supabase 연결 정보

프론트에서 사용하는 공개 publishable anon key:

```js
const SUPABASE_URL = "https://texlipqnzkoylzeowvyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_S63yxUuVD_ld3bV0-aACUw_sck9ipiF";
```

주의:

- 이 key는 프론트에 들어가도 되는 공개 anon key다.
- service role key는 절대 프론트에 넣으면 안 된다.
- 학생용 웹은 로그인 없이 `anon` 권한으로 공개 RPC만 호출해야 한다.
- 관리자용 `get_admin_context()`는 authenticated 전용이므로 학생용에서 쓰면 안 된다.

## 4. 현재 운영진 웹 완료 범위

운영진 전용 페이지는 `admin.html` + `admin.js`로 분리되어 있다.

현재 구현된 주요 기능:

- Supabase Auth 로그인/로그아웃.
- `admins.auth_user_id`와 로그인 유저 연결.
- `admin_assignments` 기반 권한 확인.
- 대표 운영진은 전체 입력 가능.
- 일반 운영진은 배정된 경기/부스만 입력 가능.
- 전체 대시보드 읽기 가능.
- 경기 시작 버튼: `start_event_item` RPC 호출.
- 경기 결과 저장:
  - 농구/풋살: `submit_score_game_result`
  - 줄다리기: `submit_rope_game_result`
  - 피구: `submit_dodgeball_game_result`
  - 계주: `submit_relay_result`
- 부스 기록 저장:
  - 웨이트/신발던지기: `submit_booth_scores`
  - 일반 부스 세션: `submit_booth_session`
- 결과 저장 후 advancement와 team_points 자동 재계산.
- 점수판 조회 및 팀별 상세 펼침.
- 웨이트/신발던지기 기록은 한 명씩 입력/수정 가능.
- 신발던지기 점수는 50점 초과 방지.
- 경기/부스 상태는 `scheduled`, `in_progress`, `completed` 흐름으로 관리.

다음 AI가 학생용 웹을 만들 때 관리자 입력 로직을 다시 만들 필요는 없다.

## 5. 현재 백엔드/RPC 구조

`supabase_rpc_functions.sql`에 현재 핵심 RPC가 들어 있다.

공개 또는 공개 가능성이 있는 RPC:

```sql
public.get_scoreboard()
```

- 현재 `anon`, `authenticated`에 execute grant 되어 있음.
- 종합 점수판 JSON을 반환한다.
- 반환값에는 `rankings`, `point_sources`, `generated_at` 등이 있다.
- 학생용 종합 점수판은 우선 이 RPC를 사용하면 된다.

관리자 전용 RPC:

```sql
public.get_admin_context()
public.submit_score_game_result(jsonb)
public.submit_rope_game_result(jsonb)
public.submit_dodgeball_game_result(jsonb)
public.submit_relay_result(jsonb)
public.submit_booth_scores(jsonb)
public.submit_booth_session(jsonb)
public.start_event_item(jsonb)
```

내부 계산용 함수:

```sql
public.apply_advancements_for_game(uuid)
public.apply_group_advancement(text)
public.rebuild_bracket_points_for_sport(text)
public.rebuild_relay_points(uuid)
public.rebuild_booth_points(uuid)
```

학생용 웹에 필요한 정보가 `get_scoreboard()`만으로는 부족하다. 일정, 진행 상태, 경기 결과, 부스 상태까지 보려면 공개 읽기 전용 RPC를 새로 추가하는 것이 좋다.

추천 새 RPC:

```sql
public.get_public_event_context()
```

권장 반환 데이터:

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
  "booth_score_summaries": [],
  "scoreboard": {}
}
```

이 RPC는 `security definer`로 만들되, 학생에게 공개해도 되는 컬럼만 JSON으로 골라서 반환해야 한다. 운영진 이름, 이메일, admin assignment, 내부 메모, updated_by 같은 정보는 공개하지 않는다.

## 6. 주요 DB 테이블 의미

### teams

- 22학번, 23학번, 24학번, 25학번, 26학번 팀 정보.
- 점수판과 경기 결과 표시의 기준.

### games

- 경기/행사 일정 및 상태.
- 주요 컬럼 개념:
  - `title`: 예: 풋살 예선 1, 농구 결승
  - `sport`: 농구, 풋살, 줄다리기, 피구, 계주 등
  - `round`: 예선, 부결승, 결승 등
  - `kind`: 실제 경기 여부 구분
  - `location`
  - `scheduled_start_time`, `scheduled_end_time`
  - `status`: `scheduled`, `in_progress`, `completed`
  - `actual_start_time`, `actual_end_time`

### game_results

- 1대1 경기 결과.
- `left_team_id`, `right_team_id`, `left_score`, `right_score`, `winner_team_id`.
- 농구/풋살 동점 시:
  - `tiebreak_type`: `free_throw` 또는 `penalty_shootout`
  - `left_tiebreak_score`, `right_tiebreak_score`

### game_result_sets

- 세트 단위 결과.
- 줄다리기, 피구에서 사용.
- 줄다리기는 세트 승자와 시간 기록이 중요하다.
- 피구는 세트별 생존 인원 수가 중요하다.

### game_rankings

- 계주처럼 전체 팀이 같이 뛰고 순위가 나오는 종목에 사용.
- 계주는 `game_results.left/right` 구조를 쓰지 않는다.

### game_advancements

- 예선/부결승/결승 대진 자동 반영용 테이블.
- `from_game_id`: 어느 경기 결과를 보고
- `to_game_id`: 어느 다음 경기로 보낼지
- `to_slot`: 다음 경기의 `left` 또는 `right`
- `rule_type`: `better_winner`, `weaker_winner`, `direct_winner`
- `group_key`: 같은 비교 묶음. 예: 풋살 예선 1/2를 같은 그룹으로 비교

현재 규칙:

- 예선 두 경기 승자 중 강한 팀은 결승 left로 간다.
- 예선 두 경기 승자 중 약한 팀은 부결승 left로 간다.
- 부전승 팀은 부결승 right에 미리 들어간다.
- 부결승 승자는 결승 right로 간다.
- 부전승 팀이 결승에 직접 들어가면 잘못된 상태다.

### team_points

- 종합 점수판의 원천 테이블.
- 경기 결과나 부스 기록이 수정되면 기존 점수 source를 지우고 다시 계산하는 방식이다.
- 그래서 결승까지 넣은 뒤 중간 점수를 수정해도 재계산이 제대로 되도록 설계되어 있다.

### booths / booth_sessions / booth_scores

- `booths`: 부스 기본 정보와 운영 시간/상태.
- `booth_sessions`: 경찰과 도둑 같은 타임 세션, 부스 운영 상태.
- `booth_scores`: 웨이트 챌린지, 신발던지기 개인 기록.

웨이트/신발던지기는 운영 시간 동안 계속 기록이 들어올 수 있으므로 단순히 한 번 입력했다고 `completed`처럼 보여주면 안 된다.

## 7. 종목별 계산 규칙

### 농구

- 정규 점수로 승패 결정.
- 동점이면 자유투 결과를 입력한다.
- 자유투 점수까지 비교해서 승자를 정한다.

### 풋살

- 정규 점수로 승패 결정.
- 동점이면 승부차기 결과를 입력한다.
- 승부차기 점수까지 비교해서 승자를 정한다.

### 줄다리기

- 3판 2선승.
- 예선 승자 비교 기준:
  1. 무패 팀 우선
  2. 세트 득실
  3. 총 소요 시간이 더 짧은 팀
  4. 그래도 같으면 수동 결정 필요

### 피구

- 3판 2선승.
- 예선 승자 비교 기준:
  1. 패수가 적은 팀
  2. 모든 경기에서 자기 팀 생존 인원 합이 많은 팀
  3. 그래도 같으면 수동 결정 필요

### 계주

- 1대1 경기가 아니다.
- 전체 팀이 같이 뛰고 1등~5등 순위가 나온다.
- `game_rankings`와 `rebuild_relay_points`로 점수를 계산한다.

### 웨이트 챌린지

- 개인 기록을 입력한다.
- 팀별 최고 기록으로 순위를 만든다.
- 공동 순위는 dense rank가 아니라 competition rank 방식이어야 한다.
  - 공동 1위가 2팀이면 다음은 3위.

### 신발던지기

- 개인 점수를 입력한다.
- 팀별 합산 점수로 순위를 만든다.
- 만점은 50점이다.
- 50점 초과는 프론트와 백엔드 모두에서 막아야 한다.
- 공동 순위는 competition rank 방식이어야 한다.

## 8. 학생용 웹에서 보여줄 추천 화면

모바일 우선으로 만드는 것이 좋다.

추천 탭:

```text
지금
일정
부스
결과
```

### 지금 탭

- 현재 진행 중인 경기/부스.
- 곧 시작하는 다음 경기/부스.
- 경기 상태:
  - 시작 전
  - 진행 중
  - 종료
- 운영진이 `시작` 버튼을 누르면 DB의 `status = in_progress`, `actual_start_time`이 바뀐다. 학생 화면은 이 값을 보고 “진행 중”으로 보여주면 된다.
- 결과가 입력되면 `status = completed`, `actual_end_time`이 들어간다.

### 일정 탭

- 시간순 경기/부스 일정.
- 스포츠별/장소별 필터가 있으면 좋다.
- 학생에게는 운영진 내부 메모를 보여주지 않는다.
- 시상식/출석체크 같은 행사는 실제 시작 시간이 아니라 고정 예정 시간을 보여주는 편이 맞다는 의견이 있었다.

### 부스 탭

- 미니부스, 푸드트럭, 웨이트 챌린지, 신발던지기.
- 경찰과 도둑은 현재 몇 타임인지 보여주면 좋다.
- 웨이트/신발던지기는 실시간 랭킹 또는 팀별 요약을 보여주면 좋다.

### 결과 탭

- 종합 점수판.
- 팀 하나를 누르면 상세 점수 내역이 아래로 펼쳐지는 UI가 좋다.
- 농구/풋살은 동점 후 자유투/승부차기 결과도 같이 표시한다.
- 줄다리기/피구는 세트별 결과를 표시하면 좋다.
- 계주는 순위표로 표시한다.

## 9. 시간 처리 주의사항

DB 시간은 `timestamptz`일 가능성이 높다. 프론트에서는 반드시 한국 시간으로 표시한다.

권장 JS:

```js
const formatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});
```

주의:

- 예전에 DB 시간이 UTC 기준으로 들어가서 화면에서 9시간 밀리는 문제가 있었다.
- 프론트에서 임의로 9시간을 더하거나 빼는 방식은 금지.
- Supabase에서 받은 timestamp를 `Date`로 파싱하고 `Asia/Seoul` formatter로 표시한다.
- 그래도 시간이 틀리면 프론트가 아니라 DB 값을 먼저 확인한다.

## 10. 보안 주의사항

학생용 웹은 공개 페이지다.

하면 안 되는 것:

- `admins`, `admin_assignments`를 학생용에서 조회.
- 관리자 RPC 호출.
- 학생용에서 direct table select 권한을 열기.
- service role key 사용.
- 운영진 이메일, 이름, 배정 정보, 내부 메모 공개.

권장 방식:

- 공개 읽기 전용 RPC를 만든다.
- `anon`에게는 그 RPC execute 권한만 준다.
- RPC 내부에서 공개해도 되는 컬럼만 JSON으로 반환한다.
- `get_scoreboard()`처럼 필요한 최소 데이터만 공개한다.

Supabase SQL linter에서 `SECURITY DEFINER` view 경고가 뜰 수 있다. `team_scoreboard` view는 현재 `security_invoker = true`로 작성되어 있다. 그래도 배포 전 Supabase Security Advisor를 한 번 더 확인한다.

## 11. Netlify 배포 상태

현재 `netlify.toml`:

```toml
[build]
  command = """
    rm -rf dist
    mkdir -p dist
    cp index.html admin.html app.js admin.js data.js styles.css dist/
    cp -R assets dist/assets
  """
  publish = "dist"

[[redirects]]
  from = "/admin"
  to = "/admin.html"
  status = 200
```

현재 방식은 순수 HTML/CSS/JS 정적 배포다.

만약 학생용을 React/Vite로 갈아타면 `netlify.toml`을 다음 방향으로 바꿔야 한다.

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

그리고 `/admin`을 계속 정적 HTML로 유지할지, React 라우팅 안으로 넣을지 결정해야 한다. 시간이 촉박하면 관리자 페이지는 그대로 두고 학생용만 정적 JS 또는 Vite로 만드는 것이 안전하다.

## 12. 다음 AI에게 추천하는 작업 순서

1. `index.html`, `app.js`의 한글 깨짐과 목업 구조를 확인한다.
2. 학생용을 순수 HTML/CSS/JS로 유지할지, Vite/React로 새로 만들지 결정한다.
3. Supabase 공개 RPC `get_public_event_context()`를 추가한다.
4. 학생용 앱에서 `get_public_event_context()`와 `get_scoreboard()`를 호출한다.
5. `지금`, `일정`, `부스`, `결과` 화면을 만든다.
6. 모든 시간 표시가 한국 시간과 DB 예정 시간에 맞는지 확인한다.
7. 운영진 웹 `/admin`이 깨지지 않는지 확인한다.
8. Netlify 배포 후 `/`, `/admin` 모두 접속 테스트한다.

## 13. 학생용 공개 RPC 초안 방향

학생용 웹을 만들기 전에 다음 SQL을 별도 파일로 작성하는 것을 추천한다.

필요한 정보만 예시로 적으면:

```sql
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
        jsonb_build_object(
          'id', id,
          'name', name,
          'display_order', display_order
        )
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
    'scoreboard', public.get_scoreboard()
  );
end;
$$;

grant execute on function public.get_public_event_context() to anon, authenticated;
```

실제 구현에서는 `game_results`, `game_result_sets`, `game_rankings`, `booths`, `booth_sessions`, `booth_score_summaries`도 추가해야 한다. 단, 공개하면 안 되는 컬럼은 빼야 한다.

## 14. 최종 주의사항

- 관리자 웹은 이미 꽤 많은 로직이 붙어 있으므로 학생용 작업 중 건드릴 때 매우 조심한다.
- `styles.css`는 공용이므로 학생 UI 수정이 관리자 UI를 깨뜨릴 수 있다.
- 가능하면 학생용 CSS class prefix를 따로 둔다. 예: `student-*`.
- 지금 프로젝트는 마감이 가까우므로, 새로운 프레임워크 도입보다 “작동하는 공개 읽기 화면”을 우선한다.
- 학생용 웹은 예쁘게 설명하는 랜딩페이지가 아니라, 당일 바로 보는 실시간 정보판이어야 한다.
