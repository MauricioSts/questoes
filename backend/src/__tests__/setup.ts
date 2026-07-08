// Define env vars dummy para os testes (env.ts valida na importação).
process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/test?schema=public";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-1234567890";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-1234567890";
