### `Auth` 23/08/2026
- [x] Enable bcrypt password verification (`bcrypt.compare`) instead of plain text comparison (in file: `src/infrastructure/services/auth.service.ts`) and ensure users are seeded/created with hashed passwords (**Done 01/09/2026**)
- [x] Standardize error handling: Map invalid credentials/unauthorized errors to HTTP 401 instead of HTTP 500 (in file: `src/application/use-cases/login.use-case.ts`) (**Done 02/09/2026**)
- [ ] Implement Account Status Check: Check user status (active, banned, unverified) during login (in files: `src/domain/entities/user.entity.ts`, `src/infrastructure/database/drizzle/schema.ts`, `src/application/use-cases/login.use-case.ts`)
- [ ] Implement Rate Limiting / Brute-force Protection: Protect `/auth/login` endpoint against brute-force attacks (in files: `src/presentation/app.module.ts`, `src/presentation/controllers/auth.controller.ts`)

### `Login` 06/08/2026 | **Done 23/08/2026**
- [x] Change session from class to interface (in file: `src/domain/entities/session.entity.ts`) (**Done 12/08/2026**)
- [x] Remove password from UserOutput (in file: `src/application/repositories/user.repository.ts`) (**Done 12/08/2026**)
- [x] `AppConfigModule` has no reason to be imported twice (in file: `src/presentation/app.module.ts` and `src/infrastructure/services/services.module.ts`) (**Done 23/08/2026**)
- [x] Write test cases for controller (check get ip and user agent) (**Done 23/08/2026**)
- [x] Write test cases for use-case (check throw errors) (**Done 23/08/2026**)
