# ☕ Coffee Duty

여러 명이 번갈아 커피를 살 때 누가 언제 샀는지 기록하고, 다음 당번을 알려주는 웹 애플리케이션입니다.

- `backend/`: Spring Boot API
- `frontend/`: Next.js 웹 화면

## 개발

각 폴더의 README에 실행 방법과 테스트 방법이 있습니다. PR과 `main` push마다 GitHub Actions(`.github/workflows/ci.yml`)가 다음을 검사합니다.
- 백엔드 테스트 (H2와 PostgreSQL 16 각각)
- 백엔드 Docker 이미지 빌드
- 프론트엔드 lint, 타입 검사, 테스트, 빌드
- E2E 테스트

## 배포

Supabase(DB), Render(백엔드), Vercel(프론트엔드) 무료 요금제로 배포합니다. 순서는 [DEPLOY.md](DEPLOY.md)를 따라 주세요.
