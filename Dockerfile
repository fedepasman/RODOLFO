# n8n + Chromium para scraping con navegador real (Puppeteer).
#
# Por qué: el portal BAC CABA (buenosairescompras.gob.ar) es ASP.NET WebForms
# con DevExpress + CSRF + ScriptManager + balanceador BIG-IP. El scraping por
# HTTP crudo es bloqueado (pageRedirect a Default.aspx). Un navegador real
# resuelve ViewState/CSRF/cookies de forma nativa.
#
# IMPORTANTE: fijá la MISMA versión de n8n que ya tenés corriendo en Easypanel
# para no introducir un upgrade sorpresa. Reemplazá `latest` por tu tag actual
# (lo ves en Easypanel → servicio n8n → Deployments, o en la UI: abajo a la izq).

FROM docker.n8n.io/n8nio/n8n:2.26.8

USER root

# Chromium + deps para Puppeteer (Debian-based)
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium-browser \
      chromium-common \
      libxss1 \
      libnss3 \
      libfreetype6 \
      libharfbuzz0b \
      ca-certificates \
      fonts-noto \
      fonts-noto-cjk \
      fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

# Puppeteer usa el Chromium del sistema y NO intenta descargar el suyo
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    N8N_REINSTALL_MISSING_PACKAGES=true

USER node
