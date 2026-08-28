# --- Etapa 1: Construcción (Builder) ---
FROM node:22-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Habilita pnpm segun el campo "packageManager" de package.json
RUN corepack enable

# pnpm-workspace.yaml lleva los overrides y allowBuilds: sin el, el arbol
# de dependencias no coincide con el de local
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copiar el código fuente
COPY . .

# Construir la aplicación (crea la carpeta dist/)
RUN pnpm run build

# --- Etapa 2: Producción (Runner) ---
FROM node:22-alpine AS runner

WORKDIR /app

# Sin esto el guard de typeorm.config.ts no se activa y synchronize quedaria
# encendido en produccion, que es justo lo que hay que evitar
ENV NODE_ENV=production

RUN corepack enable

# Copiar archivos de dependencias nuevamente
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Instalar SOLO dependencias de producción (más ligero)
RUN pnpm install --prod --frozen-lockfile

# Copiar la carpeta compilada desde la etapa anterior
COPY --from=builder /app/dist ./dist

# Exponer el puerto de la aplicación
EXPOSE 3000

# Comando para iniciar la app en producción
CMD ["node", "dist/main"]
