# Informe — Taller de Optimización del Backend (Semana 8)

Este documento resume qué se implementó, dónde está el código y cómo demostrarlo en el video y con Postman/Insomnia.

## 0. Veredicto rápido

El proyecto (MyCoins / MyCoins backend, Next.js API Routes + Prisma + PostgreSQL) ya tenía resuelta la mayor parte del taller de una sesión de trabajo anterior: caché cache-aside, corrección de N+1 y optimización de autenticación. **Lo único que faltaba era la tarea asíncrona (cola de trabajo)**, que es lo que se agregó en esta sesión. También se agregó instrumentación para poder mostrar evidencia de "antes vs. después" en el video.

| Criterio de la rúbrica | Estado | Dónde |
|---|---|---|
| Caché y corrección de N+1 | ✅ Ya existía | `lib/cache.ts`, `services/auth/session.service.ts`, `database/organizaciones-sedes/organizacion.db.ts` |
| Autenticación sin consultas redundantes | ✅ Ya existía | `middleware/auth.ts` + `sessionService.resolve` |
| Cola de trabajo (async) | 🆕 Agregado hoy | `lib/queue.ts` (`auditQueueService`), `workers/audit.worker.ts`, hook en `pages/api/auth/callback.ts` |
| Lazy vs Eager justificado | ✅ Ya documentado | `spec/features/011-taller-optimizaciones/plan.md` §5 |
| Pruebas antes/después | 🆕 Instrumentado hoy | `PRISMA_LOG_QUERIES=true` en `database/client.ts` + esta guía |

---

## 1. Diagnóstico (operación costosa + riesgo de N+1)

- **Operación costosa/repetida:** en `middleware/auth.ts`, **cada** petición autenticada necesitaba reconstruir la sesión: 1 consulta a `UserSession` + 1 consulta a `User` con sus roles y permisos. En una API que atiende dispositivos móviles, eso son 2 queries por request sólo para autenticar.
- **Riesgo de N+1:** al listar organizaciones y querer mostrar cuántas sedes (`venues`) tiene cada una, el patrón ingenuo sería 1 query para traer las organizaciones + 1 query adicional por cada organización para contar sus sedes (`1 + N`).

## 2. Caché (cache-aside) — `lib/cache.ts` + `services/auth/session.service.ts`

`CacheService` implementa `get/set/getOrSet/invalidate`. Usa Redis (`ioredis`) si `REDIS_URL` está disponible, y si falla la conexión cae automáticamente a un `Map` en memoria con TTL — así el proyecto funciona igual sin Redis levantado.

- **Claves y TTL:** `session:${sessionId}` y `user:${userId}`, ambas con TTL de 300s (5 min).
- **Cache-aside en acción:** `sessionService.resolve(sessionId)` usa `cacheService.getOrSet(...)`: si la clave no está en caché, ejecuta la consulta real y la guarda; si está, no toca la base de datos.
- **Invalidación explícita:**
  - `sessionService.revoke()` (logout) borra `session:*` y `user:*` de inmediato.
  - `userService.update/assignRolesToUser/addRoleToUser/removeRoleFromUser` borran `user:${userId}` para que el cambio de permisos surta efecto en la siguiente petición, no en 5 minutos.

## 3. Corrección de N+1 — `database/organizaciones-sedes/organizacion.db.ts`

`getAll()` trae las organizaciones y el conteo de sedes activas en **una sola consulta SQL** usando `_count` de Prisma:

```ts
prisma.organization.findMany({
  where,
  select: { ...selectOrganizationFields, _count: { select: { venues: { where: { deletedAt: null } } } } },
  skip, take, orderBy,
})
```

Esto reemplaza el patrón `1 + N` por una sola consulta con subconsulta agregada.

## 4. Tarea asíncrona (cola de trabajo) — **lo nuevo de hoy**

Se agregó `auditQueueService` en `lib/queue.ts`, una cola BullMQ llamada `audit-logs`, con el mismo patrón de resiliencia que el resto del proyecto (si no hay Redis, procesa el job en memoria en vez de perderlo).

- **Jobs soportados:** `REGISTER_ACCESS_AUDIT` (registra el acceso: usuario, email, IP, user-agent, timestamp) y `SEND_SECURITY_ALERT` (simula el envío de una alerta de seguridad por nuevo inicio de sesión).
- **Dónde se encola:** `pages/api/auth/callback.ts`, justo después de crear la sesión. **No se hace `await`** al encolar — la respuesta HTTP (el redirect al frontend) no espera a que el job termine.
- **Worker dedicado:** `workers/audit.worker.ts`, se levanta con `yarn worker:audit`. Consume la cola `audit-logs` y procesa los jobs con la misma lógica (`processAuditJob`) que usa el fallback en memoria, para no duplicar código.

## 5. Lazy-loading vs. Eager-loading (justificación)

- **Eager loading** en el middleware de auth: roles y permisos del usuario se cargan siempre junto con la sesión (vía caché), porque el 100% de las peticiones autenticadas los necesita para autorizar.
- **Lazy loading** en sedes de una organización: el listado de organizaciones **no** trae las sedes completas, sólo el conteo (`_count`). Las sedes se piden bajo demanda en `GET /api/organizaciones/:id/sedes` sólo cuando el cliente realmente las necesita — evita transferir listados potencialmente grandes en una pantalla que no los muestra.

## 6. Cómo demostrar el "antes vs. después" en el video

No es necesario levantar infraestructura extra: basta con **prender el log de queries de Prisma** para contar consultas.

1. En `.env`, agrega `PRISMA_LOG_QUERIES=true`.
2. Levanta el proyecto normalmente (`yarn dev`, con Postgres y Keycloak corriendo vía `docker-compose up`).
3. **Autenticación (antes = sin caché tibia, después = con caché tibia):**
   - Haz login y luego una primera petición a un endpoint protegido (p. ej. `GET /api/users` en Postman con la cookie de sesión). En la consola verás las 2 queries (`UserSession`, `User`) porque la caché estaba vacía.
   - Repite la misma petición: ya no aparecen esas 2 queries en consola (se resuelve desde caché) — la latencia baja notablemente. Puedes cronometrar con la pestaña "Time" de Postman.
4. **N+1 en organizaciones:**
   - Llama a `GET /api/organizaciones`. En consola verás **una sola query** con subconsulta de conteo, no una query por organización. Si quieres mostrar visualmente el "antes", puedes comentar temporalmente el bloque `_count` y reemplazarlo por un `for` que llame `prisma.venue.count()` por cada organización — verás 1+N queries en consola — y luego revertir el cambio para mostrar la versión optimizada.
5. **Cola asíncrona:**
   - En una terminal aparte: `yarn worker:audit`.
   - Haz login desde el navegador/Postman. La respuesta (redirect) regresa de inmediato; unos milisegundos después, en la terminal del worker (o en la consola de la app si no hay Redis) verás los logs `[Audit] Acceso registrado...` y `[Audit] Alerta de seguridad simulada...`. Eso demuestra que el trabajo no bloqueó la respuesta HTTP.
6. **Postman/Insomnia:** arma una colección con: `GET /api/auth/login` (redirige a Keycloak), tras el login copia la cookie de sesión, y prueba `GET /api/organizaciones`, `GET /api/users`, `POST /api/auth/logout`. Compara los tiempos de respuesta (columna "Time" de Postman) en frío vs. en caliente.

## 7. Nota sobre deuda técnica existente (no forma parte de este taller)

El `roadmap.md` del proyecto ya tenía documentados 3 defectos abiertos previos a este taller (inconsistencia de nombres de permisos en español/inglés, deriva del historial de migraciones de Prisma, y un error de tipos en `role.db.ts` que rompe `yarn build`). No se tocaron porque son un ítem de roadmap aparte (deuda técnica de permisos), pero si el docente pregunta por `yarn build` en el video, vale la pena mencionarlos con honestidad en vez de ocultarlos.
