# 011 · Taller de Optimizaciones de Backend

**Estado:** completo ✅

## Qué hace

Implementa un conjunto de optimizaciones de rendimiento y robustez en el backend de MyCoins, cubriendo:
1. **Estrategia Cache-Aside:** Caché de alto rendimiento para sesiones y usuarios activos con TTL y mecanismos de invalidación explícita (al hacer logout o actualizar roles).
2. **Prevención de Consultas N+1:** Optimización en el listado de organizaciones para precargar la cantidad de sedes activas en una sola consulta agrupada (eager loading).
3. **Procesamiento Asíncrono de Tareas:** Implementación de colas de trabajo basadas en BullMQ para procesar en segundo plano tareas pesadas (como auditorías de acceso o reportes).
4. **Optimización de Autenticación:** Integración de la carga de usuario y sesión en una consulta única/célula de caché de manera que se reduzcan consultas redundantes en el middleware de autenticación.
5. **Decisión Arquitectural Lazy-Loading vs Eager-Loading:** Análisis y aplicación justificada de la estrategia de carga adecuada para las relaciones del modelo.

## Por qué

En una arquitectura de backend multi-tenant que atiende miles de peticiones de usuarios y dispositivos móviles, la eficiencia en la base de datos es clave. 
- La validación de la sesión del usuario se ejecuta en **cada petición**, por lo que optimizarla y meterla en caché reduce drásticamente la latencia.
- Evitar consultas N+1 previene la degradación lineal del rendimiento al listar registros.
- Delegar operaciones de no-bloqueo (como envío de correos, registros de auditoría o procesamiento de reportes) a una cola asíncrona asegura tiempos de respuesta mínimos para los endpoints móviles.

## Criterios de aceptación

### 1. Diagnóstico e Identificación de Operaciones
- [x] Identificar de forma explícita las operaciones de base de datos más recurrentes e ineficientes.
- [x] Identificar patrones con riesgo de consultas N+1 en el listado de organizaciones o sedes.

### 2. Implementación de Caché (Cache-Aside)
- [x] Crear un `CacheService` resiliente con soporte de Redis (`ioredis`) y un fallback automático en memoria para el entorno local.
- [x] Implementar la estrategia cache-aside para recuperar sesiones (`session:${id}`) y perfiles de usuario (`user:${id}`) con un TTL adecuado (ej. 5 minutos).
- [x] Implementar invalidación de caché explícita:
  - Al revocar la sesión (logout).
  - Al actualizar o asignar roles a un usuario.

### 3. Corrección de Consulta N+1 (Eager Loading)
- [x] Modificar el listado de organizaciones para cargar en una única operación (`_count` o `include`) el recuento de sedes activas de cada una, evitando realizar consultas dentro de bucles.

### 4. Tareas Asíncronas (BullMQ)
- [x] Implementar un sistema de colas (`QueueService`) usando BullMQ.
- [x] Crear un worker en segundo plano (`workers/audit.worker.ts`) que procese tareas asíncronas como logs de auditoría o correos de seguridad al iniciar sesión.
- [x] Proveer stubs de ejecución en memoria si no hay una conexión activa a Redis para que la aplicación sea robusta en todos los entornos.

### 5. Optimización del Flujo de Autenticación
- [x] Eliminar la redundancia de consultas en `middleware/auth.ts` mediante el uso del caché unificado y la optimización de los servicios.

### 6. Pruebas y Verificación de Rendimiento
- [x] Ejecutar linting y validación de TypeScript para asegurar que todo el código optimizado cumpla con las políticas del proyecto.
- [x] Comparar de forma cualitativa el comportamiento del sistema antes y después de las optimizaciones.
