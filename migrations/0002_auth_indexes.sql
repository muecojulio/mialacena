-- Índices para el esquema de identidad (Better Auth).
--
-- Análisis: los datos de la APP (despensa, listas, precios) viven en el
-- almacenamiento del teléfono, no en SQL — ahí no hay tablas que indexar. Lo
-- único en la base de datos es el esquema de `migrations/auth/0001_auth.sql`
-- (cuenta, sesión, verificación). Ese archivo ya trae sus índices básicos
-- (session.userId, account.userId, verification.identifier y los UNIQUE de
-- email/token), pero a las consultas que más corren les faltan dos:
--
--   1. account (providerId, accountId) — Better Auth la ejecuta en CADA inicio
--      de sesión federado para hallar la cuenta del proveedor. Sin índice es un
--      seq scan sobre la tabla de cuentas.
--   2. session (expiresAt) — la limpieza de sesiones vencidas filtra por esta
--      columna; con sesiones acumuladas cada barrido se encarece. Ítem
--      equivalente: verification (expiresAt) para el barrido de códigos vencidos.
--
-- El esquema de auth es OPT-IN (migrations/auth/ no se aplica solo), así que
-- cada índice se crea solo si su tabla ya existe: en una base sin auth esta
-- migración es un no-op seguro, y si más adelante se copia 0001_auth.sql a
-- migrations/, el orden 0001 → 0002 garantiza tablas antes que índices.

DO $$
BEGIN
  IF to_regclass('public.account') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "account_providerId_accountId_idx"
      ON "account" ("providerId", "accountId");
  END IF;

  IF to_regclass('public.session') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "session_expiresAt_idx"
      ON "session" ("expiresAt");
  END IF;

  IF to_regclass('public.verification') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "verification_expiresAt_idx"
      ON "verification" ("expiresAt");
    CREATE INDEX IF NOT EXISTS "verification_identifier_expiresAt_idx"
      ON "verification" ("identifier", "expiresAt");
  END IF;
END $$;
