---
paths:
  - "src/**/*.test.ts"
  - "src/test/**"
---

# Testing Rules

- Framework: Vitest 4 with `@vitest/coverage-v8`
- Database isolation: in-memory libSQL via `_setTestDb()` — never use the real database
- Each test file must call `_setTestDb(testDb)` in `beforeAll` and `_resetDb()` in `afterAll`
- Session mocking: `vi.mock('next/headers')` with `mockLoggedIn(userId)` / `mockLoggedOut()` helpers
- Request builders: use helpers from `src/test/api-helpers.ts`
- When fixing a bug, always add a regression test
- Run `npm test` before committing
