# Misión

_Ayudar a las personas a entender y cuidar su dinero mediante una experiencia clara para registrar ingresos, ordenar gastos y tomar decisiones financieras con información confiable._

## Qué construimos

MyCoins es una aplicación de finanzas personales centrada en una vista simple y accionable del dinero cotidiano. El producto combina una API REST segura con un dashboard web responsive para:

1. Registrar ingresos y gastos con fecha, cuenta, categoría y moneda.
2. Consultar el balance, los ingresos y los gastos sin hojas de cálculo dispersas.
3. Organizar cuentas de efectivo, bancos, tarjetas y ahorros.
4. Definir presupuestos por categoría y detectar desvíos antes de que se conviertan en problemas.
5. Preparar una base extensible para consejos financieros personalizados con IA, sin delegar decisiones sensibles a un modelo sin supervisión.

## Para quién

- Personas que necesitan una visión cotidiana de sus finanzas sin una herramienta contable compleja.
- Estudiantes y famlias que desean crear hábitos de presupuesto y ahorro.
- Equipos de desarrollo que necesitan una API tipada, documentada y segura para futuras experiencias web o móvil.

## Principios

- **Claridad antes que ruido** — Cada pantalla prioriza balance, movimiento y próximo paso.
- **El usuario es dueño de sus datos** — Todas las entidades financieras se filtran por el usuario autenticado y no se exponen entre cuentas.
- **El contrato es la ley** — Las entradas externas se validan con Zod y las respuestas siguen una forma consistente.
- **Seguridad por defecto** — La sesión se resuelve en servidor, y la aplicación distingue autenticación (401) de autorización (403).
- **Decisiones explicables** — Los cálculos del dashboard son trazables a movimientos y no esconden reglas financieras detrás de una caja negra.

## Qué no es

- No es asesoría financiera profesional ni una promesa de rendimiento.
- No es una aplicación bancaria: no mueve dinero ni almacena credenciales bancarias.
- No reemplaza la revisión humana de recomendaciones generadas por IA.
