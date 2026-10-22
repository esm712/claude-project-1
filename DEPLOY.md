# 배포 가이드

| 구성 | 서비스 | 요금제 |
|---|---|---|
| DB | Supabase PostgreSQL (싱가포르) | Free |
| 백엔드 | Render Web Service, Docker (싱가포르) | Free |
| 프론트엔드 | Vercel | Hobby (무료) |

브라우저는 Vercel 주소로만 접속합니다. `/api/*` 요청은 Vercel이 Render 백엔드로 넘기고, 백엔드는 Supabase에 저장합니다.

아래 순서대로 진행하세요. 3단계에서 Vercel 주소가 정해진 뒤 4단계에서 백엔드 CORS 설정을 마무리합니다.

## 1. Supabase: 데이터베이스

1. [supabase.com](https://supabase.com)에서 **New project**를 만듭니다.
   - Region: **Southeast Asia (Singapore)** (백엔드와 같은 지역이라 응답이 빠릅니다)
   - Database Password를 정하고 따로 보관하세요.
2. 프로젝트 화면 상단의 **Connect**를 누르고 **Session pooler** 연결 문자열을 복사합니다.
   - Direct connection은 IPv6 전용이라 Render에서 접속할 수 없습니다. 반드시 Session pooler를 쓰세요.
   - Transaction pooler(포트 6543)도 쓰지 마세요.
   - 복사한 문자열은 다음과 같은 모양입니다.
     ```
     postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
     ```
3. 이 문자열을 Spring이 쓰는 세 값으로 나눕니다.

   | 변수 | 값 (위 예시 기준) |
   |---|---|
   | `DB_URL` | `jdbc:postgresql://aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require` |
   | `DB_USERNAME` | `postgres.abcdefgh` |
   | `DB_PASSWORD` | 1번에서 정한 비밀번호 |

테이블은 백엔드가 처음 시작할 때 Flyway가 자동으로 만듭니다.

## 2. Render: 백엔드

1. [render.com](https://render.com)에서 **New → Blueprint**를 선택하고 이 GitHub 저장소를 연결합니다.
2. 저장소 루트의 `render.yaml`이 인식되고, `coffee-duty-backend` 서비스 생성 화면이 나옵니다.
3. 환경 변수를 입력합니다.
   - `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`: 1단계의 값
   - `CORS_ALLOWED_ORIGINS`: 아직 Vercel 주소가 없으니 일단 `https://example.com`을 넣고 4단계에서 바꿉니다.
4. **Apply**를 누르면 Docker 이미지 빌드와 배포가 시작됩니다. 첫 빌드는 5분 정도 걸립니다.
5. 서비스 주소(예: `https://coffee-duty-backend.onrender.com`) 뒤에 `/actuator/health`를 붙여 열어 보세요. `{"status":"UP"}`이 나오면 DB 연결까지 정상입니다.

`main`에 `backend/` 변경이 병합되면 자동으로 다시 배포됩니다.

## 3. Vercel: 프론트엔드

1. [vercel.com](https://vercel.com)에서 **Add New → Project**를 선택하고 이 저장소를 Import합니다.
2. **Root Directory**를 `frontend`로 지정합니다. Framework는 Next.js로 자동 인식됩니다.
3. **Environment Variables**에 다음을 추가합니다.
   - `BACKEND_URL` = 2단계의 Render 주소 (예: `https://coffee-duty-backend.onrender.com`, 끝에 `/` 없이)
4. **Deploy**를 누릅니다. 완료되면 주소(예: `https://coffee-duty.vercel.app`)가 나옵니다.

> `BACKEND_URL`은 빌드할 때 읽힙니다. 나중에 값을 바꾸면 Vercel에서 **Redeploy**를 해야 반영됩니다.

## 4. CORS 마무리

Render 대시보드에서 `coffee-duty-backend` → **Environment**를 열고, `CORS_ALLOWED_ORIGINS`를 3단계의 Vercel 주소로 바꿉니다(예: `https://coffee-duty.vercel.app`, 끝에 `/` 없이). 저장하면 자동으로 재시작됩니다.

- 여러 주소를 허용하려면 쉼표로 구분합니다. 예: `https://coffee-duty.vercel.app,https://coffee.example.com`
- Vercel은 브라우저의 `Origin` 헤더를 그대로 백엔드에 넘깁니다. 이 값이 틀리면 화면 조회는 되지만 기록 저장, 수정, 삭제가 **403**으로 실패합니다.
- Vercel의 PR 미리보기 배포는 주소가 매번 달라서, 저장 기능이 403으로 막힙니다. 운영 주소만 허용하는 것이 안전합니다.

## 5. (권장) 서버 깨워두기

무료 요금제의 제약이 두 가지 있습니다.
- **Render:** 15분간 요청이 없으면 잠들고, 다음 첫 요청에 30초~1분이 걸립니다.
- **Supabase:** 7일간 활동이 없으면 프로젝트가 일시 정지됩니다.

`.github/workflows/keepalive.yml`이 평일 08:00~20:00(한국 시간)에 10분마다 health check를 호출해서 둘 다 막아 줍니다. health check는 DB도 함께 확인합니다.

켜는 방법: GitHub 저장소 **Settings → Secrets and variables → Actions → Variables**에서 `BACKEND_URL` 변수를 Render 주소로 추가하세요. **Actions** 탭에서 "Keep backend awake"를 수동으로 실행해 동작을 확인할 수 있습니다.

> GitHub은 저장소에 60일간 활동이 없으면 예약 워크플로를 자동으로 끕니다. 그 경우 Actions 탭에서 다시 켜 주세요.

## 6. 확인

1. Vercel 주소에 접속하면 "아직 등록된 멤버가 없어요"가 보입니다.
2. 멤버 세 명을 추가하면 오늘의 당번이 표시됩니다.
3. "커피 샀어요"로 기록하면 당번이 바뀝니다.
4. 새로고침해도 기록이 남아 있으면 완료입니다.

## 문제 해결

| 증상 | 원인과 해결 |
|---|---|
| 저장할 때 "HTTP 403" | `CORS_ALLOWED_ORIGINS`가 접속한 주소와 정확히 같은지 확인하세요 (https, 끝 `/` 없음). |
| 첫 접속에 "서버에 연결하지 못했어요" | Render가 잠에서 깨는 중입니다. 1분 뒤 새로고침하세요. 5단계를 켜두면 근무 시간에는 거의 생기지 않습니다. |
| Render 로그에 `Connection refused` 또는 `Network is unreachable` | Supabase **Direct connection** 주소를 쓴 경우입니다. **Session pooler** 주소로 바꾸세요. |
| Render 로그에 `password authentication failed` | `DB_USERNAME`이 `postgres.<프로젝트ID>` 형식인지 확인하세요. |
| 화면은 뜨는데 모든 데이터 요청이 실패 | Vercel의 `BACKEND_URL`이 Render 주소와 같은지 확인하고 Redeploy하세요. |
