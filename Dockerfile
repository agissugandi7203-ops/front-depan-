# --- Build Stage ---
FROM node:20-alpine AS build

WORKDIR /app

# Salin package manifests
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Definisikan Build Args agar Vite bisa mengembed URL API produksi saat build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

ARG VITE_SUPABASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL

ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Salin source code
COPY . .

# Build static assets
RUN npm run build

# --- Serve Stage ---
FROM nginx:alpine

# Salin hasil build ke direktori Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Salin Nginx template config (Nginx image akan meng-envsubst file ini ke /etc/nginx/conf.d/default.conf secara otomatis)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Default PORT (Cloud Run akan menimpa ini secara dinamis)
ENV PORT=8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
