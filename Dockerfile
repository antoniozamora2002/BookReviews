# --- Etapa 1: Construcción (Builder) ---
FROM node:20-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Copiar el código fuente
COPY . .

# Construir la aplicación (crea la carpeta dist/)
RUN npm run build

# --- Etapa 2: Producción (Runner) ---
FROM node:20-alpine AS runner

WORKDIR /app

# Copiar archivos de dependencias nuevamente
COPY package*.json ./

# Instalar SOLO dependencias de producción (más ligero)
RUN npm ci --only=production

# Copiar la carpeta compilada desde la etapa anterior
COPY --from=builder /app/dist ./dist

# Exponer el puerto de la aplicación
EXPOSE 3000

# Comando para iniciar la app en producción
CMD ["node", "dist/main"]