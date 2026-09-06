# MyCoins

MyCoins es una aplicación de finanzas personales para registrar ingresos, ordenar gastos, controlar cuentas y visualizar el balance desde un dashboard claro.

## Experiencia

La página principal presenta balance total, indicadores de ingresos y gastos, movimientos recientes por categoría y cuentas de efectivo, bancos, tarjetas y ahorros.

## Puesta en marcha

Requisitos: Node.js 22 o superior, Yarn, PostgreSQL y las variables de entorno definidas en `.env`.

```bash
yarn install
yarn generate
yarn migrate-dev
yarn dev
```

Abre `http://localhost:3000`. La aplicación solicita autenticación cuando no existe una sesión válida.

## API financiera

- `GET/POST /api/finanzas/accounts`
- `GET/POST /api/finanzas/categories`
- `GET/POST /api/finanzas/transactions`
- `GET/POST /api/finanzas/budgets`
- `GET /api/finanzas/dashboard`

Cada consulta se limita al usuario autenticado. Los montos se almacenan como `Decimal(18, 2)`.

## Verificación

```bash
yarn lint
yarn typecheck
yarn test
yarn build
```
