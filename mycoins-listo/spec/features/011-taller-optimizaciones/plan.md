# Plan de Implementación — Taller de Optimizaciones (011)

Este documento define la arquitectura, diseño técnico y decisiones de implementación para el Taller de Optimizaciones del Backend.

---

## 1. Estrategia de Caché Resiliente (Cache-Aside)

### Diseño del `CacheService` (`lib/cache.ts`)
Dado que el entorno de desarrollo y pruebas puede no contar con una instancia activa de Redis, diseñamos un servicio híbrido:
1. **Conexión a Redis:** Utiliza `ioredis` para conectarse usando `process.env.REDIS_URL` o fallback a `redis://localhost:6379`.
2. **Resiliencia ante Fallos:** Si Redis no está disponible o falla al conectar:
   - Captura el error de conexión.
   - Activa de forma transparente un **proveedor en memoria (`Map`)** con soporte de expiración por tiempo (TTL).
   - Loggea la advertencia sin tumbar el servidor (Lazy Initialization & Graceful Fallback).
3. **API Unificada:**
   - `get<T>(key: string): Promise<T | null>`
   - `set<T>(key: string, value: T, ttlSeconds: number): Promise<void>`
   - `getOrSet<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T>` (Soporte directo de Cache-Aside)
   - `invalidate(key: string): Promise<void>`

### Puntos de Caché e Invalidación
- **Caché de sesión activa:** Clave `session:${sessionId}` (TTL: 5 min). Se guarda el registro de la sesión verificado.
  - *Invalidación:* En `sessionService.revoke(sessionId)`, se borra la clave `session:${sessionId}` de inmediato.
- **Caché de usuario con accesos:** Clave `user:${userId}` (TTL: 5 min). Guarda el payload de `SessionUser` (roles y permisos cargados).
  - *Invalidación:* En `userService.assignRolesToUser(userId, ...)` y métodos de actualización de roles, se borra `user:${userId}` de inmediato para forzar la recarga en la siguiente petición.

---

## 2. Corrección del N+1 en Organizaciones

### Diagnóstico del Problema
Si deseáramos listar organizaciones y adjuntar el recuento o listado de sus sedes (`venues`), el patrón ineficiente sería:
1. Obtener la lista de organizaciones: `SELECT * FROM "Organization" WHERE "deletedAt" IS NULL LIMIT 20;` (1 consulta).
2. Para cada una de las $N$ organizaciones, contar sus sedes: `SELECT count(*) FROM "Venue" WHERE "organizationId" = $1 AND "deletedAt" IS NULL;` ($N$ consultas).
Tener $1 + N$ llamadas a base de datos escala fatalmente con el volumen de registros.

### Solución: Eager Loading con Prisma
Aprovechamos que Prisma puede resolver la agregación de relaciones directamente en la consulta principal usando subconsultas SQL compiladas de forma óptima a través de `_count`:
```ts
prisma.organization.findMany({
  where,
  select: {
    ...selectOrganizationFields,
    _count: {
      select: {
        venues: {
          where: { deletedAt: null }
        }
      }
    }
  },
  ...
})
```
Esto genera **una sola consulta SQL con LEFT JOIN o subconsulta agrupada**, solucionando el riesgo de N+1 por completo.

---

## 3. Tareas Asíncronas con BullMQ

### Cola de Auditoría y Fallback
1. **Configuración de Cola (`lib/queue.ts`):**
   - Configura una cola de BullMQ (`audit-logs`) que utiliza la misma conexión resiliente de Redis.
   - Si Redis no está disponible, el sistema interceptará las llamadas y procesará las tareas síncronamente en memoria o las registrará en los logs para evitar que se pierdan o que rompan la petición del usuario.
2. **Worker (`workers/audit.worker.ts`):**
   - Un worker independiente que procesa trabajos de la cola `audit-logs`.
   - Trabajos a soportar: `REGISTER_ACCESS_AUDIT` (registro asíncrono de un acceso de usuario para auditoría) e `SEND_SECURITY_ALERT` (simula el envío asíncrono de un correo de seguridad ante inicio de sesión).

---

## 4. Optimización de la Autenticación

En `middleware/auth.ts`, reduciremos consultas redundantes:
- Usamos el `CacheService` con la firma `getOrSet`.
- En lugar de consultar `sessionDb` y `getSessionUser` por separado de forma redundante y directa en cada petición, pasamos por la abstracción de caché de `sessionService.resolve(sessionId)`, que utiliza el Cache-Aside híbrido.
- Esto significa que para la gran mayoría de las peticiones HTTP, el impacto en la base de datos para autenticación y carga de permisos pasa de **2 consultas a 0 consultas** debido al caché en memoria/Redis de las claves `session` y `user`.

---

## 5. Justificación de Lazy Loading vs Eager Loading en Relaciones

En Prisma, la carga de datos relacionados se puede manejar de dos maneras:
1. **Eager Loading (Carga ansiosa):** Cargar los datos relacionados de forma explícita en la misma consulta utilizando `include` o `select` (ej: cargar un usuario incluyendo su perfil y roles).
   - *Justificación de uso:* Excelente cuando sabemos con certeza que el 100% de las veces necesitaremos esos datos relacionados en el flujo (ej: el middleware `auth` siempre necesita saber los roles y permisos del usuario para autorizar la petición).
2. **Lazy Loading / On-Demand Loading (Carga bajo demanda):** No incluir los datos relacionados en la consulta principal y, en su lugar, recuperarlos mediante endpoints o consultas separadas solo si el cliente lo solicita específicamente (ej: al listar organizaciones, no cargar todas las sedes ni canchas; solo devolver la organización y proveer un endpoint secundario `GET /api/organizaciones/:id/sedes`).
   - *Justificación de uso:* Previene la transferencia masiva de datos y el uso inútil de memoria en base de datos para relaciones grandes (ej: una organización puede tener cientos de sedes o reservas; cargarlas ansiosamente en la lista general de organizaciones degradaría el ancho de banda y la memoria innecesariamente).
