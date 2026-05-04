# 운영진 사용자 등록 가이드

이 문서는 `당일교육자료_3차수정.pptx`에서 운영진 이름과 담당 경기/부스를 추출해서, 현재 Supabase 백엔드에 등록하는 방법을 정리한 것이다.

## 만든 파일

```text
admin_users_from_training_ppt.sql
```

이 SQL은 다음을 처리한다.

- `admins`에 운영진 행 추가 또는 업데이트
- `admin_assignments`에 경기/부스 담당 배정 추가 또는 업데이트
- 이미 Supabase Auth에 존재하는 이메일은 `admins.auth_user_id`까지 자동 연결
- DB에 없는 `games.title` 또는 `booths.name`이 있으면 중단
- 현재 DB의 `admins_role_check`가 허용하는 일반 운영진 role 값을 자동으로 사용
- 현재 DB의 `admin_assignments_role_check`가 허용하는 배정 role 값을 자동으로 사용

## 중요한 점

이 SQL은 Supabase Auth 유저를 직접 만들지는 않는다.

즉, 아래 두 단계가 필요하다.

1. Supabase Dashboard에서 Auth 유저를 만든다.
2. `admin_users_from_training_ppt.sql`을 SQL Editor에서 실행한다.

이미 SQL을 먼저 실행해도 괜찮다. 그 경우 `admins`와 `admin_assignments`는 만들어지고, `auth_user_id`만 비어 있다. 나중에 Auth 유저를 만든 뒤 SQL을 다시 실행하면 자동 연결된다.

## Auth 유저 생성 방법

Supabase Dashboard에서:

```text
Authentication > Users > Add user
```

여기서 아래 이메일들을 생성한다. 비밀번호는 네가 운영진에게 전달할 임시 비밀번호로 통일해도 된다.

권장 설정:

```text
Auto Confirm User: 켜기
```

## 등록 계정 목록

### 대표/총괄

| 이름 | 이메일 | 권한 |
| --- | --- | --- |
| 김동휘 | lead@test.local | super_admin |

### 구역 총괄

| 이름 | 이메일 | 권한 | 배정 |
| --- | --- | --- | --- |
| 정훈 | stadium1@test.local | staff | 대운동장 경기/부스 전체 |
| 한경원 | stadium2@test.local | staff | 대운동장 경기/부스 전체 |
| 김범진 | multipurpose1@test.local | staff | 농구/풋살 전체 |
| 임정연 | multipurpose2@test.local | staff | 농구/풋살 전체 |

표의 `staff`는 설명용 표현이다. 실제 DB에는 `admins_role_check`가 허용하는 일반 운영진 role 값으로 저장된다.

`assignment_role`도 설명용으로는 경기 담당/부스 담당/구역 총괄을 나누지만, 실제 DB에는 `admin_assignments_role_check`가 허용하는 값으로 자동 변환해서 저장된다. 현재 권한 판단은 `assignment_role` 문자열이 아니라 활성 배정 존재 여부를 기준으로 한다.

대운동장 부스 배정은 현재 DB와 이름이 확실히 맞고 입력이 필요한 `경찰과 도둑`, `웨이트 챌린지`, `신발 던지기`만 넣었다. 푸드트럭은 별도 담당자 계정을 만들지 않는다.

### 농구

| 이름 | 이메일 | 배정 |
| --- | --- | --- |
| 김유정 | basketball1@test.local | 농구 예선 1 |
| 박연준 | basketball2@test.local | 농구 예선 2 |
| 이성현 | basketball3@test.local | 농구 부결승 |
| 김정우 | basketball4@test.local | 농구 결승 |

### 풋살

| 이름 | 이메일 | 배정 |
| --- | --- | --- |
| 이진우 | futsal1@test.local | 풋살 예선 1 |
| 손관우 | futsal2@test.local | 풋살 예선 2 |
| 오신형 | futsal3@test.local | 풋살 부결승 |
| 김정효 | futsal4@test.local | 풋살 결승 |

`futsal1@test.local`은 이미 등록해둔 계정이므로, SQL 실행 시 이름과 배정이 PPT 기준으로 맞춰진다.

### 줄다리기

| 이름 | 이메일 | 배정 |
| --- | --- | --- |
| 배준성 | rope1@test.local | 줄다리기 예선 1 |
| 권수안 | rope2@test.local | 줄다리기 예선 2 |
| 성시윤 | rope3@test.local | 줄다리기 부결승 |
| 이상영 | rope4@test.local | 줄다리기 결승 |

### 피구

| 이름 | 이메일 | 배정 |
| --- | --- | --- |
| 이선호 | dodgeball1@test.local | 남자 피구 예선 1 |
| 강지인 | dodgeball2@test.local | 남자 피구 예선 2 |
| 윤서형 | dodgeball3@test.local | 여자 피구 예선 1 |
| 현주용 | dodgeball4@test.local | 여자 피구 예선 2 |
| 이민주 | dodgeball5@test.local | 남자 피구 부결승 |
| 이호영 | dodgeball6@test.local | 여자 피구 부결승 |
| 김정균 | dodgeball7@test.local | 남자 피구 결승 |
| 이창규 | dodgeball8@test.local | 여자 피구 결승 |

### 계주

| 이름 | 이메일 | 배정 |
| --- | --- | --- |
| 장유담 | relay1@test.local | 계주 |
| 홍찬양 | relay2@test.local | 계주 |

### 미니게임부스

PPT에는 미니게임부스 담당 실명이 없다. `종목당 4명, 자율배치`라고만 되어 있다.

점수 입력이 중요한 부스는 계정을 분리한다.

| 이름 | 이메일 | 배정 |
| --- | --- | --- |
| 신발던지기 담당 | booth1@test.local | 신발 던지기 |
| 데드리프트 담당 | booth2@test.local | 웨이트 챌린지 |

`booth1@test.local`은 이미 있던 테스트 계정이므로, SQL 실행 시 기존 공용 배정을 비활성화하고 신발 던지기만 남긴다.

## 실행 순서

1. Supabase Auth에서 위 이메일로 유저를 만든다.
2. SQL Editor에서 [admin_users_from_training_ppt.sql](admin_users_from_training_ppt.sql)을 실행한다.
3. 결과에서 `Auth 연결됨`인지 확인한다.
4. 각 계정으로 로그인해서 자기 담당 경기/부스만 쓰기 가능하고, 대시보드/점수판은 읽히는지 확인한다.

## 기존 futsal1 / booth1 계정 주의

SQL은 기본적으로 대부분의 기존 배정을 삭제하지 않는다. 다만 `booth1@test.local`, `booth2@test.local`은 점수형 부스 하나씩만 맡도록 기존 부스 배정을 자동 비활성화한다.

정확히 PPT 기준 배정만 남기고 싶으면 SQL 안의 아래 값을 바꾼다.

```sql
reset_existing_assignments boolean := false;
```

이걸 `true`로 바꾸면, SQL에 포함된 계정들의 기존 배정을 먼저 비활성화하고 PPT 기준 배정만 다시 넣는다.

기존에 `food1@test.local` ~ `food4@test.local`을 만들었다면 SQL 실행 시 해당 계정과 배정은 비활성화된다.

## 제외한 사람

PPT에 나온 사람 중 앱에서 결과 입력/부스 상태 입력을 하지 않는 역할은 기본 등록에서 제외했다.

- 용달운영위
- 점심식사운영위
- 푸드트럭/간식차 전용 담당자
- 대표/부대표 출결 담당
- 자원봉사자

이 사람들도 관리자 앱 로그인이 필요하면 별도 계정을 만들어서 특정 부스나 전체 읽기용 권한으로 추가하면 된다.
