# Base de datos e índices

Revisión del **23 de octubre de 2026**: ¿conviene agregar índices? Respuesta
corta: **a los datos de la app no, porque no están en SQL**; a las tablas de
sesión que sí existen, **sí**, y ya quedaron.

## 1. Dónde vive cada dato

| Dato | Dónde vive | Se indexa |
|---|---|---|
| Despensa, listas, precios, fotos, lecturas, preferencias | Almacenamiento local del teléfono (zustand + `localStorage`) | No aplica |
| Respaldo | Archivo JSON que descarga la persona | No aplica |
| Inicio de sesión **opcional** (Better Auth) | `migrations/auth/0001_auth.sql` → tablas `user`, `session`, `account`, `verification` | Sí (ver abajo) |

La app **no escribe** ninguna fila de despensa: `src/lib/db.ts` solo existe para
el módulo de identidad del template y para PGLite en la vista previa. Por eso
agregar índices a «productos» o «listas» sería trabajo inútil: no hay tablas ni
consultas.

## 2. Consultas que sí corren contra SQL

| Consulta | Frecuencia | Índice |
|---|---|---|
| `session` por `token` al validar la cookie | cada petición autenticada | `session_token_key` (UNIQUE, ya existía) |
| `session` por `userId` (+ `expiresAt`) | al abrir sesión / listar sesiones | **nuevo** `session_userId_expiresAt_idx` |
| Borrar sesiones vencidas por `expiresAt` | tarea de limpieza | `session_expiresAt_idx` (0002) |
| `account` por `(providerId, accountId)` al entrar con proveedor | cada inicio federado | `account_providerId_accountId_idx` (0002) |
| `account` por `(userId, providerId)` | inicio de sesión / cuentas vinculadas | **nuevo** `account_userId_providerId_idx` |
| `user` por `email` | alta y búsqueda de cuenta | `user_email_key` (UNIQUE) + **nuevo** `user_email_lower_idx` |
| `verification` por `identifier` (+ `expiresAt`) | códigos y enlaces mágicos | `verification_identifier_expiresAt_idx` (0002) |

### Qué cambia `migrations/0003_auth_consulta_indices.sql`

1. Crea `session (userId, expiresAt)` y **retira** `session_userId_idx`: el
   índice compuesto ya cubre las consultas que usaban solo `userId`, y mantener
   los dos solo encarece cada `INSERT`/`UPDATE` de sesión.
2. Crea `account (userId, providerId)` y retira `account_userId_idx` por la
   misma razón (es su prefijo).
3. Crea un índice único sobre `lower(email)`: Better Auth compara el correo en
   minúsculas y el `UNIQUE(email)` no sirve para esa expresión.
4. Todo va dentro de `DO $$ … IF to_regclass(...) IS NOT NULL`, así que en una
   base **sin** esquema de auth la migración no hace nada, y en una con auth crea
   solo lo que falta. Es idempotente: se puede aplicar dos veces sin error (se
   verificó con PGLite, con y sin las tablas).

## 3. Cómo comprobarlo

- Con `DATABASE_URL` definido, `npm run build` aplica `migrations/*.sql` en orden
  y registra cada archivo en `_migrations` (no se repite).
- Sin `DATABASE_URL`, la vista previa usa PGLite y aplica los mismos archivos al
  arrancar (`src/lib/db.ts`).
- Para mirar el plan de una consulta concreta:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM session WHERE "userId" = $1 AND "expiresAt" > now();
```

Debe decir `Index Scan using session_userId_expiresAt_idx`.

## 4. Si algún día se sincroniza entre dispositivos

Cuando se agregue una tabla de la app (por ejemplo `pantry_items`), la migración
debe crear primero `user_id` como columna indexada y luego el compuesto que las
consultas necesiten: `(user_id, updated_at)` para sincronizar y
`(user_id, expires_at)` para caducidades. Antes de crearlo, correr
`EXPLAIN ANALYZE` con datos reales; este repositorio no agrega índices
«por si acaso».
