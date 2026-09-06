# Feature 013: Finanzas personales

## Objetivo

Permitir que una persona registre y consulte sus ingresos y gastos, organice sus cuentas y categorías, y vea un resumen financiero desde el dashboard.

## Alcance

- Cuentas financieras personales.
- Categorías de ingresos y egresos.
- Movimientos con monto decimal, fecha, cuenta y categoría.
- Presupuestos por categoría y periodo.
- Resumen de balance, ingresos, gastos y cantidad de movimientos.
- Dashboard web responsive.

## Seguridad

Todas las rutas financieras requieren sesión válida. Cada consulta usa el `userId` resuelto por el middleware de autenticación. Una sesión ausente responde 401; una sesión válida sin permiso futuro responderá 403.

## Criterios de aceptación

- Un usuario puede crear cuentas, categorías, movimientos y presupuestos.
- Un usuario sólo puede consultar sus propios registros.
- El balance se calcula como saldo inicial + ingresos - gastos.
- Los montos se conservan con dos decimales en PostgreSQL.
- El dashboard funciona en desktop y móvil.
