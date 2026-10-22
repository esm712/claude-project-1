# Coffee Duty Backend

커피 당번 기록 API (Spring Boot 4.1, Java 21).

## 당번 규칙 (잔 수 잔액)

- N잔을 산 구매자는 **+(N−1)**, 함께 마신 나머지 사람은 각각 **−1**
- 그날 빠진 사람은 잔액이 변하지 않습니다 (빚도 혜택도 생기지 않음)
- 다음 당번은 **오늘 있는 사람 중 잔액이 가장 낮은 사람**입니다
  - 동률이면 가장 오래전에 산 사람(한 번도 안 산 사람이 우선), 그래도 같으면 id가 낮은 사람
- 구매자는 항상 참여자에 포함되며, 한 번 살 때 최소 2명이어야 합니다

규칙은 `com.coffeeduty.duty.DutyCalculator`에 Spring 의존 없이 구현되어 있습니다.

## 실행

```bash
./gradlew bootRun          # http://localhost:8080, H2 파일 DB(./data)
./gradlew test             # 단위 + API 통합 테스트
```

운영 환경(PostgreSQL)에서는 `SPRING_PROFILES_ACTIVE=prod`로 실행하고 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `CORS_ALLOWED_ORIGINS`를 설정합니다.

`CORS_ALLOWED_ORIGINS`에는 프론트엔드가 서비스되는 주소를 넣어야 합니다. 프론트엔드가 Next.js rewrite로 요청을 중계하더라도 브라우저의 `Origin` 헤더가 그대로 전달되기 때문입니다.

## API

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/members?includeInactive=false` | 멤버 목록 |
| POST | `/api/members` | `{"name"}` 멤버 추가 |
| PATCH | `/api/members/{id}` | `{"name"?, "active"?}` 이름 변경 / 비활성화 |
| GET | `/api/purchases` | 구매 기록 (최신순) |
| GET | `/api/purchases/{id}` | 구매 기록 하나 |
| POST | `/api/purchases` | `{"buyerId", "participantIds", "purchasedAt"?, "memo"?}` 기록 추가 (날짜 기본값: 오늘, Asia/Seoul) |
| PUT | `/api/purchases/{id}` | 기록 수정 |
| DELETE | `/api/purchases/{id}` | 기록 삭제 |
| GET | `/api/duty?present=1,2` | 다음 당번 + 멤버별 잔액. `present`를 생략하면 활성 멤버 전원 |

`/api/duty`의 `nextDuty`는 참여자가 2명 미만이면 `null`입니다. 오류는 RFC 9457 Problem Detail(`{"status","title","detail"}`) 형식으로 응답합니다.
