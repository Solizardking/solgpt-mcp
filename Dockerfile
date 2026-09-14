# Build context = repository root (this package)
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
# Pump program docs (vendored into ./docs)
ENV PUMP_DOCS_ROOT=/app/docs
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080
CMD ["npx", "tsx", "index.ts", "--http"]
