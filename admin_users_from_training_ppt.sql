-- 행운제 운영진 계정/admin_assignments 등록 SQL
-- source: 당일교육자료_3차수정.pptx
--
-- 중요:
-- 1. 이 SQL은 public.admins / public.admin_assignments를 등록한다.
-- 2. Supabase Auth 유저 자체는 Dashboard > Authentication > Users에서 먼저/나중에 생성해야 한다.
-- 3. Auth 유저를 만든 뒤 이 SQL을 다시 실행하거나, 맨 아래 auth_user_id 연결 UPDATE만 다시 실행하면 된다.
-- 4. @test.local 이메일은 실제 메일 수신용이 아니라 운영진 로그인 ID 용도다.

begin;

drop table if exists pg_temp._admin_seed_users;
drop table if exists pg_temp._admin_seed_assignments;
drop table if exists pg_temp._admin_role_config;
drop table if exists pg_temp._assignment_role_config;

create temp table _admin_seed_users (
  name text not null,
  email text not null,
  role text not null
) on commit preserve rows;

create temp table _admin_seed_assignments (
  email text not null,
  game_title text,
  booth_name text,
  assignment_role text not null
) on commit preserve rows;

create temp table _admin_role_config (
  super_admin_role text not null,
  staff_role text not null
) on commit preserve rows;

create temp table _assignment_role_config (
  manager_role text not null,
  operator_role text not null
) on commit preserve rows;

-- 현재 DB의 admins_role_check가 허용하는 일반 운영진 role 값을 자동으로 맞춘다.
-- 프론트/서버는 role이 super_admin이면 대표, 그 외에는 일반 운영진으로 처리한다.
insert into _admin_role_config (super_admin_role, staff_role)
with constraint_roles as (
  select distinct matched.role[1] as role
  from pg_constraint c
  cross join lateral regexp_matches(
    pg_get_constraintdef(c.oid),
    '''([^'']+)''',
    'g'
  ) as matched(role)
  where c.conrelid = 'public.admins'::regclass
    and c.conname = 'admins_role_check'
)
select
  coalesce(
    (select role from constraint_roles where role = 'super_admin' limit 1),
    'super_admin'
  ) as super_admin_role,
  coalesce(
    (
      select role
      from constraint_roles
      where role in ('staff', 'operator', 'admin', 'member', 'general_admin', 'user')
      order by array_position(array['staff', 'operator', 'admin', 'member', 'general_admin', 'user'], role)
      limit 1
    ),
    (select role from constraint_roles where role <> 'super_admin' limit 1),
    'staff'
  ) as staff_role;

-- 현재 DB의 admin_assignments_role_check가 허용하는 배정 role 값을 자동으로 맞춘다.
-- 권한 판단은 assignment_role 문자열 자체가 아니라 active assignment 존재 여부로 처리된다.
insert into _assignment_role_config (manager_role, operator_role)
with constraint_roles as (
  select distinct matched.role[1] as role
  from pg_constraint c
  cross join lateral regexp_matches(
    pg_get_constraintdef(c.oid),
    '''([^'']+)''',
    'g'
  ) as matched(role)
  where c.conrelid = 'public.admin_assignments'::regclass
    and c.conname = 'admin_assignments_role_check'
)
select
  coalesce(
    (
      select role
      from constraint_roles
      where role in ('area_manager', 'manager', 'lead', 'supervisor', 'admin', 'owner', 'operator', 'editor', 'staff', 'member')
      order by array_position(
        array['area_manager', 'manager', 'lead', 'supervisor', 'admin', 'owner', 'operator', 'editor', 'staff', 'member'],
        role
      )
      limit 1
    ),
    (select role from constraint_roles limit 1),
    'operator'
  ) as manager_role,
  coalesce(
    (
      select role
      from constraint_roles
      where role in ('game_operator', 'booth_operator', 'operator', 'staff', 'member', 'editor', 'assigned')
      order by array_position(
        array['game_operator', 'booth_operator', 'operator', 'staff', 'member', 'editor', 'assigned'],
        role
      )
      limit 1
    ),
    (select role from constraint_roles limit 1),
    'operator'
  ) as operator_role;

insert into _admin_seed_users (name, email, role)
values
  -- 대표/총괄
  ('김동휘', 'lead@test.local', 'super_admin'),

  -- 구역 총괄
  ('정훈', 'stadium1@test.local', 'staff'),
  ('한경원', 'stadium2@test.local', 'staff'),
  ('김범진', 'multipurpose1@test.local', 'staff'),
  ('임정연', 'multipurpose2@test.local', 'staff'),

  -- 농구
  ('김유정', 'basketball1@test.local', 'staff'),
  ('박연준', 'basketball2@test.local', 'staff'),
  ('이성현', 'basketball3@test.local', 'staff'),
  ('김정우', 'basketball4@test.local', 'staff'),

  -- 풋살
  ('이진우', 'futsal1@test.local', 'staff'),
  ('손관우', 'futsal2@test.local', 'staff'),
  ('오신형', 'futsal3@test.local', 'staff'),
  ('김정효', 'futsal4@test.local', 'staff'),

  -- 줄다리기
  ('배준성', 'rope1@test.local', 'staff'),
  ('권수안', 'rope2@test.local', 'staff'),
  ('성시윤', 'rope3@test.local', 'staff'),
  ('이상영', 'rope4@test.local', 'staff'),

  -- 피구
  ('이선호', 'dodgeball1@test.local', 'staff'),
  ('강지인', 'dodgeball2@test.local', 'staff'),
  ('윤서형', 'dodgeball3@test.local', 'staff'),
  ('현주용', 'dodgeball4@test.local', 'staff'),
  ('이민주', 'dodgeball5@test.local', 'staff'),
  ('이호영', 'dodgeball6@test.local', 'staff'),
  ('김정균', 'dodgeball7@test.local', 'staff'),
  ('이창규', 'dodgeball8@test.local', 'staff'),

  -- 계주
  ('장유담', 'relay1@test.local', 'staff'),
  ('홍찬양', 'relay2@test.local', 'staff'),

  -- 미니게임 점수형 부스
  ('신발던지기 담당', 'booth1@test.local', 'staff'),
  ('데드리프트 담당', 'booth2@test.local', 'staff');

-- 다목적구장 총괄: 농구/풋살 전체 수정 가능
insert into _admin_seed_assignments (email, game_title, booth_name, assignment_role)
select manager.email, game_title, null, 'area_manager'
from (
  values
    ('multipurpose1@test.local'),
    ('multipurpose2@test.local')
) as manager(email)
cross join (
  values
    ('농구 예선 1'),
    ('농구 예선 2'),
    ('농구 부결승'),
    ('농구 결승'),
    ('풋살 예선 1'),
    ('풋살 예선 2'),
    ('풋살 부결승'),
    ('풋살 결승')
) as games(game_title);

-- 대운동장 총괄: 줄다리기/피구/계주/부스 전체 수정 가능
insert into _admin_seed_assignments (email, game_title, booth_name, assignment_role)
select manager.email, game_title, null, 'area_manager'
from (
  values
    ('stadium1@test.local'),
    ('stadium2@test.local')
) as manager(email)
cross join (
  values
    ('줄다리기 예선 1'),
    ('줄다리기 예선 2'),
    ('줄다리기 부결승'),
    ('줄다리기 결승'),
    ('남자 피구 예선 1'),
    ('남자 피구 예선 2'),
    ('남자 피구 부결승'),
    ('남자 피구 결승'),
    ('여자 피구 예선 1'),
    ('여자 피구 예선 2'),
    ('여자 피구 부결승'),
    ('여자 피구 결승'),
    ('계주')
) as games(game_title);

insert into _admin_seed_assignments (email, game_title, booth_name, assignment_role)
select manager.email, null, booth_name, 'area_manager'
from (
  values
    ('stadium1@test.local'),
    ('stadium2@test.local')
) as manager(email)
cross join (
  values
    ('경찰과 도둑'),
    ('웨이트 챌린지'),
    ('신발 던지기')
) as booths(booth_name);

-- 경기별 직접 담당자
insert into _admin_seed_assignments (email, game_title, booth_name, assignment_role)
values
  ('basketball1@test.local', '농구 예선 1', null, 'game_operator'),
  ('basketball2@test.local', '농구 예선 2', null, 'game_operator'),
  ('basketball3@test.local', '농구 부결승', null, 'game_operator'),
  ('basketball4@test.local', '농구 결승', null, 'game_operator'),

  ('futsal1@test.local', '풋살 예선 1', null, 'game_operator'),
  ('futsal2@test.local', '풋살 예선 2', null, 'game_operator'),
  ('futsal3@test.local', '풋살 부결승', null, 'game_operator'),
  ('futsal4@test.local', '풋살 결승', null, 'game_operator'),

  ('rope1@test.local', '줄다리기 예선 1', null, 'game_operator'),
  ('rope2@test.local', '줄다리기 예선 2', null, 'game_operator'),
  ('rope3@test.local', '줄다리기 부결승', null, 'game_operator'),
  ('rope4@test.local', '줄다리기 결승', null, 'game_operator'),

  ('dodgeball1@test.local', '남자 피구 예선 1', null, 'game_operator'),
  ('dodgeball2@test.local', '남자 피구 예선 2', null, 'game_operator'),
  ('dodgeball3@test.local', '여자 피구 예선 1', null, 'game_operator'),
  ('dodgeball4@test.local', '여자 피구 예선 2', null, 'game_operator'),
  ('dodgeball5@test.local', '남자 피구 부결승', null, 'game_operator'),
  ('dodgeball6@test.local', '여자 피구 부결승', null, 'game_operator'),
  ('dodgeball7@test.local', '남자 피구 결승', null, 'game_operator'),
  ('dodgeball8@test.local', '여자 피구 결승', null, 'game_operator'),

  ('relay1@test.local', '계주', null, 'game_operator'),
  ('relay2@test.local', '계주', null, 'game_operator');

-- 부스 담당자
insert into _admin_seed_assignments (email, game_title, booth_name, assignment_role)
values
  ('booth1@test.local', null, '신발 던지기', 'booth_operator'),
  ('booth2@test.local', null, '웨이트 챌린지', 'booth_operator');

-- 등록하려는 경기/부스명이 실제 DB에 없으면 중단한다.
do $$
declare
  missing_games text;
  missing_booths text;
begin
  select string_agg(w.game_title, ', ' order by w.game_title)
  into missing_games
  from (
    select distinct game_title
    from _admin_seed_assignments
    where game_title is not null
  ) w
  where not exists (
    select 1
    from public.games g
    where g.title = w.game_title
  );

  if missing_games is not null then
    raise exception 'DB에 없는 games.title: %', missing_games;
  end if;

  select string_agg(w.booth_name, ', ' order by w.booth_name)
  into missing_booths
  from (
    select distinct booth_name
    from _admin_seed_assignments
    where booth_name is not null
  ) w
  where not exists (
    select 1
    from public.booths b
    where b.name = w.booth_name
  );

  if missing_booths is not null then
    raise exception 'DB에 없는 booths.name: %', missing_booths;
  end if;
end $$;

-- admins 업데이트
update public.admins a
set
  name = s.name,
  role = case
    when s.role = 'super_admin' then (select super_admin_role from _admin_role_config)
    else (select staff_role from _admin_role_config)
  end,
  is_active = true
from _admin_seed_users s
where lower(a.email) = lower(s.email);

-- admins 신규 삽입
insert into public.admins (name, email, role, is_active)
select
  s.name,
  s.email,
  case
    when s.role = 'super_admin' then (select super_admin_role from _admin_role_config)
    else (select staff_role from _admin_role_config)
  end,
  true
from _admin_seed_users s
where not exists (
  select 1
  from public.admins a
  where lower(a.email) = lower(s.email)
);

-- 더 이상 로그인/입력이 필요 없는 푸드트럭 전용 테스트 계정은 비활성화한다.
update public.admin_assignments aa
set is_active = false
from public.admins a
where aa.admin_id = a.id
  and lower(a.email) in (
    'food1@test.local',
    'food2@test.local',
    'food3@test.local',
    'food4@test.local'
  );

update public.admins a
set is_active = false
where lower(a.email) in (
  'food1@test.local',
  'food2@test.local',
  'food3@test.local',
  'food4@test.local'
);

-- booth1/booth2는 정확히 점수형 부스 하나씩만 맡도록 기존 테스트 배정을 정리한다.
update public.admin_assignments aa
set is_active = false
from public.admins a
where aa.admin_id = a.id
  and lower(a.email) in ('booth1@test.local', 'booth2@test.local');

-- 같은 운영진의 기존 배정을 전부 비활성화하고 싶으면 아래 false를 true로 바꿔서 실행한다.
-- 기본값 false는 기존 테스트 배정을 건드리지 않는다.
do $$
declare
  reset_existing_assignments boolean := false;
begin
  if reset_existing_assignments then
    update public.admin_assignments aa
    set is_active = false
    where aa.admin_id in (
      select a.id
      from public.admins a
      join _admin_seed_users s on lower(s.email) = lower(a.email)
    );
  end if;
end $$;

-- admin_assignments 기존 행 활성화/수정
with resolved_assignments as (
  select distinct
    a.id as admin_id,
    g.id as game_id,
    null::uuid as booth_id,
    case
      when s.assignment_role = 'area_manager' then (select manager_role from _assignment_role_config)
      else (select operator_role from _assignment_role_config)
    end as assignment_role
  from _admin_seed_assignments s
  join public.admins a on lower(a.email) = lower(s.email)
  join public.games g on g.title = s.game_title
  where s.game_title is not null

  union

  select distinct
    a.id as admin_id,
    null::uuid as game_id,
    b.id as booth_id,
    case
      when s.assignment_role = 'area_manager' then (select manager_role from _assignment_role_config)
      else (select operator_role from _assignment_role_config)
    end as assignment_role
  from _admin_seed_assignments s
  join public.admins a on lower(a.email) = lower(s.email)
  join public.booths b on b.name = s.booth_name
  where s.booth_name is not null
)
update public.admin_assignments aa
set
  assignment_role = r.assignment_role,
  is_active = true
from resolved_assignments r
where aa.admin_id = r.admin_id
  and aa.game_id is not distinct from r.game_id
  and aa.booth_id is not distinct from r.booth_id;

-- admin_assignments 신규 삽입
with resolved_assignments as (
  select distinct
    a.id as admin_id,
    g.id as game_id,
    null::uuid as booth_id,
    case
      when s.assignment_role = 'area_manager' then (select manager_role from _assignment_role_config)
      else (select operator_role from _assignment_role_config)
    end as assignment_role
  from _admin_seed_assignments s
  join public.admins a on lower(a.email) = lower(s.email)
  join public.games g on g.title = s.game_title
  where s.game_title is not null

  union

  select distinct
    a.id as admin_id,
    null::uuid as game_id,
    b.id as booth_id,
    case
      when s.assignment_role = 'area_manager' then (select manager_role from _assignment_role_config)
      else (select operator_role from _assignment_role_config)
    end as assignment_role
  from _admin_seed_assignments s
  join public.admins a on lower(a.email) = lower(s.email)
  join public.booths b on b.name = s.booth_name
  where s.booth_name is not null
)
insert into public.admin_assignments (
  admin_id,
  game_id,
  booth_id,
  assignment_role,
  is_active
)
select
  r.admin_id,
  r.game_id,
  r.booth_id,
  r.assignment_role,
  true
from resolved_assignments r
where not exists (
  select 1
  from public.admin_assignments aa
  where aa.admin_id = r.admin_id
    and aa.game_id is not distinct from r.game_id
    and aa.booth_id is not distinct from r.booth_id
);

-- 이미 Supabase Auth에 만들어진 유저는 자동 연결한다.
-- 아직 Auth 유저를 만들지 않은 이메일은 auth_user_id가 null로 남는다.
update public.admins a
set auth_user_id = u.id
from auth.users u
where lower(u.email) = lower(a.email)
  and a.email in (select email from _admin_seed_users)
  and a.auth_user_id is distinct from u.id;

commit;

-- 등록 확인
select
  a.name,
  a.email,
  a.role,
  case when a.auth_user_id is null then 'Auth 미연결' else 'Auth 연결됨' end as auth_status,
  count(aa.id) filter (where aa.is_active) as active_assignment_count
from public.admins a
left join public.admin_assignments aa on aa.admin_id = a.id
where a.email in (
  select email
  from _admin_seed_users
)
group by a.id, a.name, a.email, a.role, a.auth_user_id
order by a.role desc, a.email;
