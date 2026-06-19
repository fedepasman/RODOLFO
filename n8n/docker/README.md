# n8n con Chromium (Puppeteer) en Easypanel

Imagen custom de n8n que agrega **Chromium** para poder scrapear el portal BAC CABA
con un navegador real (ver [Dockerfile](./Dockerfile)).

> ⚠️ **Antes de empezar — no rompas tu instancia actual:**
> - Anotá tu **`N8N_ENCRYPTION_KEY`** actual. Si se pierde, las credenciales
>   guardadas (Supabase, Telegram) dejan de funcionar.
> - Conservá el **mismo volumen** montado en `/home/node/.n8n` (ahí viven workflows
>   y credenciales). El rebuild cambia la imagen, NO los datos — siempre que no
>   borres el volumen.
> - Fijá en el Dockerfile la **misma versión de n8n** que ya corrés (reemplazá
>   `latest` por tu tag), así el rebuild no te mete un upgrade sorpresa.

---

## Paso 1 — Subir el Dockerfile

Ya está versionado en este repo (`n8n/docker/Dockerfile`). Easypanel puede buildearlo
desde GitHub. Asegurate de que el repo RODOLFO esté pusheado.

## Paso 2 — Apuntar el servicio n8n a la imagen custom

En **Easypanel → servicio n8n → pestaña Source**:

1. Cambiá el **Source** de "Docker Image" a **"GitHub"** (o "Dockerfile" si preferís
   pegar el contenido inline).
2. Repo: `fedepasman/RODOLFO` · Branch: `main`.
3. **Build path / Dockerfile path:** `n8n/docker/Dockerfile`.
4. **No toques** el mount del volumen (`/home/node/.n8n`) ni las variables de entorno
   existentes (DB, `N8N_ENCRYPTION_KEY`, host, etc.).

## Paso 3 — Variables de entorno

Las 3 vars de Puppeteer ya vienen en el Dockerfile, no hace falta agregarlas. Verificá
que sigan presentes las que ya tenías, en especial:

```
N8N_ENCRYPTION_KEY=<tu-valor-actual>
NODE_FUNCTION_ALLOW_BUILTIN=*          # ya lo tenías para 'https'; '*' habilita todos
```

## Paso 4 — Deploy

Tocá **Deploy / Rebuild**. La primera build tarda unos minutos (baja Chromium).

## Paso 5 — Verificar que Chromium quedó instalado

En **Easypanel → servicio n8n → Console** (terminal del contenedor):

```bash
chromium-browser --version
# Esperado: "Chromium 1XX.0.XXXX.XX"
```

Si imprime una versión, está OK. Si dice "not found", probá `chromium --version` y
avisame el resultado.

## Paso 6 — Instalar el nodo Puppeteer

En la **UI de n8n → Settings → Community Nodes → Install**:

```
n8n-nodes-puppeteer
```

(El `PUPPETEER_SKIP_DOWNLOAD=true` del Dockerfile evita que intente bajar su propio
Chromium; usa el del sistema vía `PUPPETEER_EXECUTABLE_PATH`.)

---

## Listo

Cuando los pasos 5 y 6 estén ✅, avisame y armo el nodo de scraping del portal
(reemplaza al viejo "Obtener XLS BAC" por HTTP). El navegador va a:

1. Abrir `BuscarAvanzado.aspx`
2. Cargar fechas desde/hasta
3. Click en **Buscar**
4. Leer la grilla de resultados directamente del DOM (sin pasar por el Excel)
5. Devolver las filas al nodo de scoring que ya existe

> Nota: al leer la grilla del DOM nos ahorramos el paso "Parsear Excel" y el manejo
> de descarga de archivos — más simple y más robusto.
