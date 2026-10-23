-- Índices de consulta del esquema de identidad (Better Auth).
--
-- ── Por qué la app no tiene tablas que indexar ──────────────────────────────
-- La despensa, las listas, los precios y las fotos viven en el almacenamiento
-- del teléfono (zustand + localStorage). La base de datos solo existe para el
-- inicio de sesión opcional (migrations/auth/0001_auth.sql). Por eso esta
-- revisión no agrega índices de «productos» ni de «listas»: no hay filas. Si
-- algún día se sincroniza entre dispositivos, el índice va en la migración de
-- esa tabla nueva, empezando por `user_id` y luego `updated_at`.
--
-- ── Qué se agrega y por qué ─────────────────────────────────────────────────
-- 1. `session (userId, expiresAt)` — las dos consultas calientes de sesión:
--    «las sesiones vigentes de esta persona» y «borra las vencidas». El índice
--    actual `session_userId_idx` es su prefijo, así que se retira para no pagar
--    dos veces el costo de escritura.
-- 2. `account (userId, providerId)` — resolver la cuenta del proveedor al
--    iniciar sesión federado, ya acotado por persona (reemplaza al índice
--    simple `account_userId_idx`, que es su prefijo).
-- 3. `user (lower(email))` — búsqueda de cuenta por correo sin distinguir
--    mayúsculas; Better Auth compara en minúsculas y el UNIQUE de `email` no
--    sirve para `lower(email)`.
--
-- Todo es idempotente y defensivo: si el esquema de auth no existe (una base
-- sin sesión), cada bloque es un no-op. Se aplica solo, en orden, después de
-- 0002_auth_indexes.sql.

DO $$
BEGIN
  IF to_regclass('public.session') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "session_userId_expiresAt_idx"
      ON "session" ("userId", "expiresAt");
    -- Redundante con el prefijo compuesto de arriba.
    DROP INDEX IF EXISTS "session_userId_idx";
  END IF;

  IF to_regclass('public.account') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "account_userId_providerId_idx"
      ON "account" ("userId", "providerId");
    DROP INDEX IF EXISTS "account_userId_idx";
  END IF;

  IF to_regclass('public.user') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "user_email_lower_idx"
      ON "user" (lower("email"));
  END IF;
END $$;
