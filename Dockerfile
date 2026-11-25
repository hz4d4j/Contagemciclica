# ---- Build stage: frontend (Catalyst) ----
FROM node:22-slim AS frontend-build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Catalyst build: no Supabase code in the output bundle
RUN VITE_APP_MODE=catalyst npx vite build --outDir dist-catalyst

# ---- Runtime stage: backend server + static frontend ----
FROM node:22-slim AS runtime

WORKDIR /app

# Backend dependencies
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# Backend source
COPY server/src ./src
COPY server/schema ./schema

# Frontend static files from build stage
COPY --from=frontend-build /app/dist-catalyst ./public

# Environment defaults (override at runtime)
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Express serves /api/* and static files from ./public
CMD ["node", "src/index.js"]
