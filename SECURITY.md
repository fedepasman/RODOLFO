# Seguridad — Sistema de Seguimiento de Licitaciones

Guía de buenas prácticas para evitar filtraciones de credenciales, accesos no
autorizados y abuso de la webapp. **Leer antes de tocar autenticación, datos o
secretos.** Al final hay un [checklist pre-deploy](#checklist-pre-deploy).

Principio rector: **defensa en profundidad**. Ninguna capa por sí sola alcanza —
combinamos RLS en la base, auth en el servidor, validación de input y headers.

---

## 1. Gestión de secretos (credenciales en variables de entorno)

**Regla de oro: ningún secreto en el código ni en git.** Todo va en variables de
entorno.

- Los valores reales viven en `.env.local` (ignorado por git). La plantilla sin
  valores es `.env.example` (sí se versiona). Para empezar: `cp .env.example .env.local`.
- En producción (Vercel): cargar las env vars en **Project → Settings → Environment
  Variables**, con scope por entorno (Production / Preview / Development).
- **Rotar** claves periódicamente y de inmediato si se filtran (Supabase → Settings →
  API → "Reset"). Cambiar también en Vercel y n8n.
- Nunca pegar claves en commits, issues, capturas, logs ni chats.

### ⚠️ Lo más importante: `anon key` vs `service_role key`

| Clave | Prefijo | Dónde puede estar | Qué puede hacer |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_` (pública) | navegador y servidor | Solo lo que permita **RLS** |
| `SUPABASE_SERVICE_ROLE_KEY` | **sin** `NEXT_PUBLIC_` | **solo servidor / n8n** | **Todo: bypassa RLS** |

- Toda variable con prefijo `NEXT_PUBLIC_` queda **embebida en el bundle del
  navegador**: es pública por diseño. La `anon key` es segura ahí *porque RLS la limita*.
- El `service_role key` **NUNCA** lleva `NEXT_PUBLIC_`, **nunca** se importa en un
  Client Component y **nunca** se devuelve al cliente. Si se filtra, expone toda la base.
- En este repo, `lib/supabase/admin.ts` usa `import "server-only"`: el build **falla**
  si alguien lo importa desde el cliente. No remover esa línea.

Verificación rápida antes de deployar:
```bash
grep -rn "SERVICE_ROLE" app components        # no debe aparecer en cliente
grep -rn "NEXT_PUBLIC_.*SERVICE" .             # jamás debe existir
git status                                     # .env.local NO debe figurar
```

---

## 2. Supabase Row Level Security (RLS)

RLS es la barrera real de datos: aunque la `anon key` sea pública, sin política no se
accede a nada.

- **Toda tabla con RLS habilitado** (`enable row level security`) y políticas
  explícitas. Modelo deny-by-default: sin política = sin acceso. Ver `lib/supabase/rls.sql`.
- Las notas de `seguimientos` están aisladas por usuario (`auth.uid() = user_id`).
- Nunca confiar solo en validaciones del frontend: un atacante llama a la API de
  Supabase directo con la `anon key`. La autorización real está en las políticas.
- `select` de **columnas mínimas** necesarias; no traer datos sensibles "por las dudas".
- Performance: envolver funciones en subquery — `(select auth.uid())` en vez de
  `auth.uid()` — para que se evalúen una vez por query, no por fila.
- La ingesta de n8n usa `service_role` (bypassa RLS) **a propósito**, porque corre en un
  entorno de servidor controlado. Esa clave no debe salir de n8n.

---

## 3. Autenticación

- Supabase Auth con email/contraseña. Dos usuarios admin creados desde el panel.
- **En el servidor usar siempre `getUser()`**, no `getSession()`: `getUser()` valida el
  JWT contra Supabase; `getSession()` confía en la cookie (falsificable).
- `proxy.ts` protege rutas y refresca la sesión, **pero no es suficiente solo**: según
  los docs de Next 16, mover un Server Action a otra ruta puede dejar de pasar por el
  proxy. Por eso **cada server action y cada página protegida re-verifica el usuario**
  (`requireUser()` en `lib/actions/auth.ts`).
- Mensajes de login **genéricos** ("Email o contraseña incorrectos") para no permitir
  enumeración de usuarios.
- Contraseñas fuertes (mínimo razonable + configurar en Supabase Auth los requisitos).
  Considerar activar MFA en Supabase para los admins.

---

## 4. Rate limiting (límite de peticiones)

Evita fuerza bruta de login, scraping de la app y abuso de endpoints.

- **Supabase Auth** ya trae rate limits por IP en login/signup; revisarlos y ajustarlos
  en Authentication → Rate Limits.
- **Server actions / route handlers** sensibles (login, mutaciones): agregar rate
  limiting propio. Opción recomendada: [`@upstash/ratelimit`](https://github.com/upstash/ratelimit)
  con Redis (sliding window por IP o por usuario). Aplicar en `proxy.ts` o al inicio de
  la action.
- **Vercel**: activar **Firewall / Attack Challenge Mode** y reglas de rate limit ante
  picos de tráfico.
- **Webhooks de n8n**: ver punto 6 — deben requerir auth y, si son públicos, limitarse.

> Nota: el `proxy.ts` de Next corre por request; es un buen lugar para un rate limiter
> global con un store externo (Upstash), ya que el proxy no comparte estado entre
> invocaciones.

---

## 5. Validación y saneamiento de input

- **Zod en cada server action**, validando del lado del servidor (no confiar en la
  validación del browser). Ver `lib/validations/`.
- El cliente de Supabase parametriza las queries → protege de SQL injection siempre que
  **no** se arme SQL por concatenación de strings. Evitar `rpc` con SQL dinámico.
- Escapar/normalizar cualquier dato externo (scraping de portales) antes de mostrarlo;
  React escapa por defecto, pero nunca usar `dangerouslySetInnerHTML` con contenido de
  los portales o del usuario.
- Validar tipos y rangos (ej. `score` 0–100) tanto en Zod como con CHECK en la BD.

---

## 6. Seguridad de n8n (self-hosted)

n8n maneja el `service_role` de Supabase y los tokens de Telegram/Gmail: es un objetivo
de alto valor. (Para el detalle de deployment, usar la skill `n8n-self-hosting`.)

- **HTTPS obligatorio** detrás de un reverse proxy (Caddy/Nginx) con certificado válido.
- **No exponer el editor de n8n a internet** sin protección: owner account + basic auth,
  o restringir por IP / VPN. Idealmente el panel no es público.
- Setear **`N8N_ENCRYPTION_KEY`** (cifra las credenciales guardadas en n8n). Guardarla
  fuera del repo; si se pierde, se pierden las credenciales.
- **Webhooks con autenticación**: header auth o token en la URL; nunca un webhook
  público que escriba en la base sin verificar. Validar el origen.
- Firewall (ufw) cerrando todo menos 80/443/SSH; `fail2ban` para SSH.
- Mantener n8n y el SO **actualizados**. Backups del volumen de datos.
- Las credenciales de Supabase/Telegram/Gmail viven en el **credential store de n8n**,
  nunca hardcodeadas en los nodos ni en los JSON exportados a `n8n/workflows/`.

---

## 7. Headers de seguridad

Configurados en `next.config.ts` para todas las respuestas:

- `Strict-Transport-Security` (HSTS) — fuerza HTTPS.
- `X-Frame-Options: DENY` — anti-clickjacking.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy` — desactiva cámara/micrófono/geolocalización.

**Content-Security-Policy (CSP):** no está activa por defecto porque una CSP estricta
requiere nonces para los scripts inline de Next y rompe fácil en dev. Para producción,
agregar una CSP con nonce siguiendo la guía oficial de Next.js (`Content-Security-Policy`
en `proxy.ts` generando un nonce por request). Hacerlo con cuidado y probar bien.

---

## 8. No exponer datos sensibles

- No devolver columnas internas ni PII en respuestas/JSON que no se usen en la UI.
- **No loguear** secretos, tokens, cookies de sesión ni datos personales. Cuidado con
  `console.log` de objetos completos de request/usuario.
- Mensajes de error al usuario: genéricos. Los detalles van a logs del servidor, no al
  cliente.
- Revisar que las respuestas de error de Supabase no se reenvíen crudas al frontend.

---

## 9. Dependencias

- `npm audit` periódico; resolver vulnerabilidades altas/críticas.
- Activar **Dependabot** (o Renovate) en GitHub para PRs de actualización.
- Fijar versiones y revisar antes de actualizar mayores (este proyecto usa Next 16 con
  breaking changes).

---

## 10. Telegram / Email / Google Drive

- `TELEGRAM_BOT_TOKEN`, credenciales SMTP/Gmail y OAuth de Drive viven **solo en n8n**,
  nunca en este repo ni en el bundle.
- Los links de Google Drive se guardan en Supabase; los archivos no. Controlar los
  permisos de compartido en Drive (no "cualquiera con el link" para pliegos sensibles).

---

## 11. Vercel / Deploy

- Env vars con scope correcto; el `service_role` solo donde haga falta (idealmente la
  webapp no lo necesita en runtime si toda la ingesta la hace n8n).
- **Proteger los Preview Deployments** (Vercel → Deployment Protection) para que las
  ramas no queden públicas con datos reales.
- Revisar que los logs de build/runtime no impriman secretos.

---

## Checklist pre-deploy

- [ ] `git status` no lista `.env.local` ni ningún archivo con secretos.
- [ ] `.env.example` no tiene valores reales.
- [ ] `grep -rn "SERVICE_ROLE" app components` → sin resultados en cliente.
- [ ] Ninguna variable `NEXT_PUBLIC_*` contiene un secreto real.
- [ ] RLS habilitado y con políticas en **todas** las tablas (`rls.sql` aplicado).
- [ ] Cada server action protegida re-verifica el usuario (no depende solo del proxy).
- [ ] Login con mensajes genéricos; rate limiting de Auth revisado.
- [ ] Rate limiting propio en endpoints sensibles (Upstash) o Vercel Firewall activo.
- [ ] Security headers respondiendo (verificar con `curl -I`).
- [ ] n8n: HTTPS, editor no público, `N8N_ENCRYPTION_KEY` seteada, webhooks con auth.
- [ ] `npm audit` sin vulnerabilidades altas/críticas; Dependabot activo.
- [ ] Preview Deployments de Vercel protegidos.
- [ ] Claves rotadas si alguna estuvo expuesta durante el desarrollo.
