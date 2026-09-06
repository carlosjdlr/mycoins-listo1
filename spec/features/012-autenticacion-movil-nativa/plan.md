# 012 · Autenticación móvil nativa — Plan

_Cómo se implementa lo descrito en `spec.md`._

## Enfoque

Reutilizar `sessionService`, `encrypt`/`decrypt`, `findOrSyncByOAuth`, `verifyIdToken` — la misma infraestructura que ya usa el flujo web de cookie. El único cambio real es *cómo* se obtienen los tokens de Keycloak: `grant_type=password` (ROPC) en vez de `grant_type=authorization_code` (PKCE). Todo lo demás (sesión, Bearer, refresh, logout, `clientId` guardado por sesión) es idéntico al flujo web.

## Implementación

1. **`keycloak/realm-mycoins.json`** — nuevo cliente `mycoins-mobile` con `publicClient: true` y `directAccessGrantsEnabled: true`. `mycoins-api` no se toca.
2. **`lib/oauth/index.ts`** — nueva función `passwordGrant(username, password)` (POST a `OAUTH_TOKEN_URL`, `grant_type=password`, `client_id=OAUTH_MOBILE_CLIENT_ID`, sin `Authorization: Basic`, porque el cliente público no tiene secreto). `verifyIdToken` ahora trata `nonce` como opcional en `OAuthMetadata` — ROPC no lo tiene. `refreshAccessToken` y `revokeToken` reciben un `clientId` opcional para no mandar Basic Auth cuando el cliente es público.
3. **`validations/auth/mobile-login.validation.ts`** (nuevo) — `{ username: string().min(1), password: string().min(1) }`.
4. **`pages/api/auth/mobile/login.ts`** (nuevo) — valida body, `passwordGrant`, mapea cualquier error a un `401` genérico en español (nunca el detalle de Keycloak), `verifyIdToken` sin `nonce`, `findOrSyncByOAuth`, `sessionService.create` con `clientId`, sella y devuelve `sessionToken`.
5. **`middleware/auth.ts`** — lee `Authorization: Bearer <token>` antes que la cookie; si viene, es la fuente de verdad.
6. **`pages/api/auth/refresh.ts`** y **`logout.ts`** — pasan `req.session.tokens.clientId` a `refreshAccessToken`/`revokeToken`.
7. **`lib/config/env.ts`** — se agrega `OAUTH_MOBILE_CLIENT_ID`.
8. **`proxy.ts`** (nuevo, raíz del proyecto) — habilita CORS abierto (`*`) solo en `/api/*`. Es seguro porque el flujo móvil no usa cookies: no hay credenciales que un origen ajeno pueda robar mediante CORS.
9. **`documentation/schemas/auth.ts`** — agrega `MobileLoginRequest/Response` y el `registry.registerPath()` de `/auth/mobile/login`, con la advertencia del riesgo ROPC en la descripción.
10. **Tests** — `tests/integration/auth/mobile-login.test.ts` nuevo (camino feliz, validación de body, credenciales incorrectas con mensaje genérico).

## Decisiones

- **ROPC solo para `mycoins-mobile`, nunca para `mycoins-api`** — el cliente web sigue con el estándar de la industria (Authorization Code + PKCE); el riesgo se acota al mínimo necesario.
- **Mensaje de error genérico, nunca el texto real de Keycloak** — evita enumeración de cuentas y no expone detalles internos del proveedor de identidad.
- **`nonce` opcional en `verifyIdToken` en vez de una segunda función de verificación** — ROPC y Authorization Code comparten toda la lógica de verificación de firma/issuer/audience; solo difieren en si hay `nonce` que comprobar.
- **CORS abierto (`*`) solo en `/api/*` y solo porque el flujo móvil es sin cookies** — si el backend dependiera de cookies para este flujo, un CORS abierto sería inseguro. Como la app manda el token en `Authorization`, no hay nada que un origen ajeno pueda "robar" con una petición cruzada.

## Riesgos

- **La contraseña pasa por el código de la app y por este endpoint** — a diferencia de Authorization Code, donde solo Keycloak la ve. Mitigación: HTTPS obligatorio en producción, la contraseña nunca se loguea ni se persiste, solo se reenvía a Keycloak y se descarta.
- **Sin protección CSRF/replay adicional** — ROPC es una llamada API directa, no un handshake de redirección; no aplica el mismo modelo de amenaza que Authorization Code. Mitigación: HTTPS + rate limiting de Keycloak a nivel de realm (no verificado en esta feature, ver "Fuera de alcance" en `spec.md`).
- **MFA/social login futuro requeriría reabrir esta decisión** — ROPC no tiene forma limpia de soportarlos.
