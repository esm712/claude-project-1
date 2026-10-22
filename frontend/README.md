# Coffee Duty Frontend

커피 당번 웹 화면 (Next.js 16, React 19, Tailwind CSS 4).

`/api/*` 요청은 Next.js rewrite로 Spring Boot 백엔드(`BACKEND_URL`, 기본값 `http://localhost:8080`)에 전달됩니다.

```bash
npm install
npm run dev        # http://localhost:3000 (백엔드: ../backend 에서 ./gradlew bootRun)
npm test           # 단위/컴포넌트 테스트 (Vitest + Testing Library)
npm run lint
npm run typecheck
```
