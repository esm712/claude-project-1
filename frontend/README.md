# Coffee Duty Frontend

커피 당번 웹 화면 (Next.js 16, React 19, Tailwind CSS 4).

- 오늘 출석 체크 → 다음 당번과 멤버별 잔액 표시
- "커피 샀어요"로 구매 기록 (당번과 오늘 출석자가 미리 채워짐)
- 구매 기록 수정/삭제, 멤버 추가/이름 변경/비활성화

## 실행

```bash
npm install
npm run dev        # http://localhost:3000 (백엔드: ../backend 에서 ./gradlew bootRun)
```

`/api/*` 요청은 Next.js rewrite로 Spring Boot 백엔드(`BACKEND_URL`, 기본값 `http://localhost:8080`)에 전달됩니다.

> **CORS 주의:** rewrite는 브라우저의 `Origin` 헤더를 그대로 전달하므로, 이 화면이 서비스되는 주소(예: `https://coffee.example.com`)를 백엔드의 `CORS_ALLOWED_ORIGINS`에 넣어야 POST/PUT/PATCH/DELETE가 403 없이 동작합니다. 로컬 기본값은 `http://localhost:3000`입니다.

## 테스트

```bash
npm test           # 단위/컴포넌트 테스트 (Vitest + Testing Library, API는 mock)
npm run test:e2e   # E2E: 실제 백엔드(인메모리 DB)와 Next.js를 띄워 브라우저로 시나리오 검증
npm run lint
npm run typecheck
```

E2E는 `../backend`의 Gradle과 Java 21이 필요합니다. Playwright 브라우저가 설치되지 않은 환경이라면 `npx playwright install chromium`을 실행하거나, 이미 설치된 Chromium을 `PW_CHROMIUM_PATH=/path/to/chrome`으로 지정하세요.
