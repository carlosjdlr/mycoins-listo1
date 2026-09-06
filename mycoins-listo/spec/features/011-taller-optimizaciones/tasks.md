# Tareas — Taller de Optimizaciones

Checklist granular de las tareas de optimización de rendimiento:

- [x] **Fase 1: Infraestructura de Caché Resiliente**
  - [x] Crear el servicio de caché unificado (`lib/cache.ts`) con soporte Redis (`ioredis`) y fallback transparente en memoria.
  - [x] Exportar y probar el ciclo de vida del caché (get, set, invalidate).

- [x] **Fase 2: Optimización del Listado de Organizaciones (Prevención de N+1)**
  - [x] Identificar y documentar el punto ineficiente.
  - [x] Editar `/database/organizaciones-sedes/organizacion.db.ts` para usar eager loading de los recuentos de sedes (`_count`).
  - [x] Validar que el formato de respuesta del listado de organizaciones se mantenga intacto o enriquecido de manera segura.

- [x] **Fase 3: Procesamiento Asíncrono con BullMQ**
  - [x] Configurar el cliente y cola de BullMQ (`lib/queue.ts`) con comportamiento resiliente.
  - [x] Implementar el worker (`workers/audit.worker.ts`) para procesar el log de auditoría asíncrono y la simulación de correos masivos / alertas.
  - [x] Agregar un script/endpoint o gancho en la autenticación para encolar la tarea de auditoría (`REGISTER_ACCESS_AUDIT`) de manera asíncrona al iniciar sesión.

- [x] **Fase 4: Optimización del Middleware de Autenticación**
  - [x] Modificar `/services/auth/session.service.ts` para aplicar cache-aside sobre la sesión y los detalles del usuario.
  - [x] Añadir invalidación explícita de caché al destruir la sesión (logout).
  - [x] Modificar `/database/users/index.ts` o `/services/users/index.ts` para invalidar el caché de usuario cuando se modifican o asignan roles.

- [x] **Fase 5: Verificación e Informes de Rendimiento**
  - [x] Ejecutar `yarn lint` sobre los archivos nuevos/modificados (`lib/queue.ts`, `workers/audit.worker.ts`, `pages/api/auth/callback.ts`, `database/client.ts`) — sin errores.
  - [x] Ejecutar `yarn typecheck` — no se introducen errores nuevos (los únicos existentes vienen de `@/generated/prisma/client`, que requiere `yarn generate` con acceso a Postgres/binarios de Prisma, no disponible en este entorno de verificación).
  - [x] Ejecutar `yarn test` sobre las suites que no dependen de una base de datos activa (`tests/unit/oauth.test.ts`, `tests/unit/pkce.test.ts`) — 4/4 pasan.
  - [ ] Ejecutar la suite completa (`yarn test`) y las pruebas manuales con Postman/Insomnia contra el backend real (con Postgres, Redis y Keycloak levantados) — pendiente para el estudiante en su entorno local, ver `informe-optimizacion.md`.
  - [x] Completar y reportar los resultados cualitativos de la optimización del backend (ver `informe-optimizacion.md` en esta misma carpeta).
  - [x] Actualizar el `roadmap.md` promocionando la tarea a completado.
