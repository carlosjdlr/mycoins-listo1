# 012 · Autenticación móvil nativa — Tareas

## Backend

- [x] `keycloak/realm-mycoins.json`: nuevo cliente `mycoins-mobile` con `directAccessGrantsEnabled = true`.
- [x] `lib/config/env.ts`: agregar `OAUTH_MOBILE_CLIENT_ID`.
- [x] `lib/oauth/index.ts`: nueva `passwordGrant`; `verifyIdToken` con `nonce` opcional; `refreshAccessToken`/`revokeToken` aceptan `clientId`.
- [x] `lib/session/index.ts`: campo `clientId` opcional en `SessionTokenSet`.
- [x] `validations/auth/mobile-login.validation.ts` nuevo.
- [x] `pages/api/auth/mobile/login.ts` nuevo, con mensaje de error genérico (nunca el de Keycloak).
- [x] `middleware/auth.ts`: acepta `Authorization: Bearer` además de la cookie.
- [x] `pages/api/auth/refresh.ts` y `logout.ts`: pasan `clientId` al refrescar/revocar.
- [x] `proxy.ts` nuevo en la raíz: CORS abierto en `/api/*`.
- [x] `.env`: agregar `OAUTH_MOBILE_CLIENT_ID="mycoins-mobile"`.

## Documentación Swagger

- [x] Agregar `MobileLoginRequest/Response` en `documentation/schemas/auth.ts`.
- [x] Registrar `POST /auth/mobile/login`, con la advertencia del riesgo ROPC en la descripción.
- [ ] Verificar en `GET /api/docs` (pendiente — requiere levantar el proyecto localmente).

## Validación real (pendiente — requiere Docker/Keycloak local)

- [ ] Recrear Keycloak (`docker compose down && up -d`) para tomar `directAccessGrantsEnabled`.
- [ ] `POST /api/auth/mobile/login` con `futbolista`/`mycoins123` real → `sessionToken` válido.
- [ ] `GET /api/auth/session`, `POST /api/auth/refresh` con ese Bearer → funcionan.
- [ ] Contraseña incorrecta → `401` con mensaje genérico en español.
- [ ] `POST /api/auth/logout` con Bearer → `204`, y el mismo token reenviado después → `401`.
- [ ] Flujo de cookie del cliente web (`mycoins-api`) sigue funcionando sin cambios (regresión).

## Tests

- [x] `tests/integration/auth/mobile-login.test.ts`: camino feliz, validación de body, credenciales incorrectas con mensaje genérico (3 tests).

## App móvil (proyecto separado, `mycoins-ionic`)

- [ ] Instalar entorno (Node, Ionic CLI, Capacitor, Android Studio/JDK).
- [ ] Crear proyecto base con Ionic + React + Capacitor.
- [ ] Pantalla de login nativo que llame a `POST /api/auth/mobile/login`.
- [ ] Configurar `VITE_API_BASE_URL` según el destino de ejecución (emulador Android usa `10.0.2.2`, dispositivo físico usa la IP LAN de la máquina de desarrollo).
- [ ] Ejecutar sobre un destino real (emulador o dispositivo físico) y demostrar la petición exitosa.
- [ ] Documentar versiones y pasos en el README del proyecto móvil.

## Cierre

- [ ] `yarn lint && yarn typecheck && yarn test` en `mycoins-listo` — confirmar que no hay errores nuevos.
- [ ] Grabar el video del taller siguiendo `spec/features/012-autenticacion-movil-nativa/spec.md` y la guía del proyecto móvil.
