# 012 · Autenticación móvil nativa (cliente público + Bearer token)

**Estado:** implementado ✅

## Qué hace

Habilita `directAccessGrantsEnabled: true` **únicamente** en un nuevo cliente público de Keycloak, `mycoins-mobile`, y expone `POST /api/auth/mobile/login` para que la app móvil `mycoins-ionic` mande usuario/contraseña directo desde un formulario nativo y reciba un **token de sesión opaco en el body JSON** — sin cookie, sin navegador externo, sin redirección. `middleware/auth.ts` acepta ese token vía `Authorization: Bearer <token>` como alternativa a la cookie, resolviendo exactamente la misma tabla `user_sessions` que ya usa el flujo web.

Se agrega además `proxy.ts` (convención de archivo raíz de Next.js 16) para habilitar CORS en `/api/*`: sin esto, la app móvil empaquetada (que llama al backend desde un origen distinto al navegador) no podía completar la petición.

## Por qué

El proyecto integrador necesita que la aplicación móvil (framework multiplataforma, taller Semana 9) se autentique contra el backend propio de MyCoins. El flujo web existente (Authorization Code + PKCE, redirección a una pantalla de Keycloak en el navegador) no es viable dentro de una app empaquetada: no hay "misma sesión de navegador" en la que apoyarse, y abrir un navegador externo para el login rompe la experiencia nativa esperada en una app móvil. Se optó por que la app pida usuario/contraseña en un formulario propio y el backend haga el intercambio con Keycloak por ella.

## Contrato de API

```
POST /api/auth/mobile/login
Body: { "username": string, "password": string }
```

- Sin autenticación previa.
- Llama a Keycloak con `grant_type=password` (Resource Owner Password Credentials — ROPC), cliente público `mycoins-mobile`, sin `client_secret`.
- Si Keycloak rechaza las credenciales, responde `401` con un mensaje genérico en español (`"Usuario o contraseña incorrectos."`) — **nunca** el `error_description` real de Keycloak (evita filtrar detalles y enumeración de cuentas).
- Verifica el `id_token` devuelto (firma, issuer, audience = `mycoins-mobile`) — **sin `nonce`**: ROPC no tiene handshake de redirección al que fijárselo (`verifyIdToken` trata `nonce` como opcional, solo lo exige cuando el llamador lo pasa).
- Crea/sincroniza el usuario (`findOrSyncByOAuth`) y la sesión (`sessionService.create`, con `clientId: OAUTH_MOBILE_CLIENT_ID`) exactamente igual que el flujo web.
- Responde `{ "data": { "sessionToken": string, "expiresAt": string } }` — mismo payload sellado (`@hapi/iron`) que hoy viaja en la cookie del flujo web.

`middleware/auth.ts`, `/api/auth/refresh` y `/api/auth/logout` no cambiaron en su contrato — siguen resolviendo la sesión desde `Authorization: Bearer` o cookie indistintamente, y usando el `clientId` guardado en la sesión para saber con qué cliente hablarle a Keycloak al refrescar/revocar.

## Riesgo aceptado (ROPC)

Resource Owner Password Credentials expone la contraseña al código de la app (no solo a Keycloak) y no soporta bien MFA/social login futuro. Se activó **únicamente** para el cliente público `mycoins-mobile` — el cliente web (`mycoins-api`) sigue exigiendo Authorization Code + PKCE sin excepción — como decisión de alcance acotado para el proyecto integrador, no por negligencia.

## Criterios de aceptación

- [x] `mycoins-mobile` es el único cliente del realm con `directAccessGrantsEnabled: true`; `mycoins-api` (web) sigue en `false`.
- [x] `POST /api/auth/mobile/login` con credenciales reales (`futbolista`/`mycoins123`) devuelve un `sessionToken` válido.
- [x] `GET /api/auth/session`, `POST /api/auth/refresh`, `POST /api/auth/logout` funcionan con `Authorization: Bearer <sessionToken>`.
- [x] Tras `logout`, el mismo `sessionToken` reenviado responde `401`.
- [x] Credenciales incorrectas → `401` con mensaje genérico en español, **sin** el texto real de Keycloak, y sin crear sesión.
- [x] El flujo de cookie del cliente web (`mycoins-api`) sigue funcionando sin cambios.
- [x] `/api/*` responde con cabeceras CORS (`proxy.ts`) para que un origen distinto (WebView de la app) pueda completar la petición.

### Documentación (obligatorio)

- [x] `POST /api/auth/mobile/login` registrado en `documentation/schemas/auth.ts` vía `registry.registerPath()`, con la advertencia explícita del riesgo de ROPC en la descripción.
- [x] Schemas de entrada (`username`, `password`) y salida (`sessionToken`, `expiresAt`) registrados.
- [x] Visible y correcto en `GET /api/docs`.

## Fuera de alcance

- Cambiar el cliente web/confidencial existente — sigue Authorization Code + PKCE sin excepción.
- MFA/social login para el cliente móvil.
- Rate limiting específico del login móvil más allá del `bruteForceProtected` que Keycloak ya aplica a nivel de realm.
- El código de la app móvil (`mycoins-ionic`) — vive en su propio proyecto/repositorio.
