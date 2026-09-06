# Plan: Finanzas personales

1. Extender Prisma con `FinancialAccount`, `Category`, `FinancialTransaction` y `Budget`.
2. Crear una migración sin modificar migraciones históricas.
3. Implementar validaciones Zod y acceso a datos filtrado por usuario.
4. Exponer rutas REST bajo `/api/finanzas`.
5. Calcular el resumen financiero desde la base de datos.
6. Presentar los datos en la página raíz con estado local y manejo de sesión.
7. Documentar la API y verificar lint, tipos, pruebas y build.
