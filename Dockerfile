# Base: node:20-alpine (tiene apk y musl compatibles con Chromium Alpine).
# NO se usa docker.n8n.io/n8nio/n8n porque esa imagen es distroless
# (sin apt-get ni apk) y no permite instalar paquetes del sistema.
FROM node:22-alpine

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

RUN npm install -g n8n@2.26.8 puppeteer@21

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_PATH=/usr/local/lib/node_modules \
    N8N_REINSTALL_MISSING_PACKAGES=true

RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node

USER node

EXPOSE 5678

CMD ["n8n", "start"]
