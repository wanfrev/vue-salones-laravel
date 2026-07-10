# Stage 1: Build Vue 3 Frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app/client

ARG VITE_API_URL=https://localhost/api
ARG VITE_REVERB_HOST=localhost
ARG VITE_REVERB_APP_KEY=salones-key
ARG VITE_REVERB_PORT=443
ARG VITE_REVERB_SCHEME=https

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_REVERB_HOST=${VITE_REVERB_HOST}
ENV VITE_REVERB_APP_KEY=${VITE_REVERB_APP_KEY}
ENV VITE_REVERB_PORT=${VITE_REVERB_PORT}
ENV VITE_REVERB_SCHEME=${VITE_REVERB_SCHEME}

COPY client/package.json client/package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

# Stage 2: Production Image with FrankenPHP
FROM dunglas/frankenphp:1.5-php8.4-alpine

RUN install-php-extensions \
    pdo_pgsql \
    pgsql \
    redis \
    pcntl \
    opcache \
    intl \
    zip \
    bcmath

RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

WORKDIR /app

COPY backend/ /app/
RUN rm -rf /app/public/build

COPY --from=frontend-builder /app/client/dist /app/public/build

RUN mkdir -p \
    /app/storage/framework/cache/data \
    /app/storage/framework/sessions \
    /app/storage/framework/testing \
    /app/storage/framework/views \
    /app/storage/logs \
    /app/storage/app/public \
    /app/bootstrap/cache \
    && chmod -R 775 /app/storage /app/bootstrap/cache \
    && chown -R www-data:www-data /app/storage /app/bootstrap/cache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
RUN composer install --no-dev --no-interaction --no-progress --optimize-autoloader --no-scripts

COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443 443/udp

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/up || exit 1

CMD ["/app/docker-entrypoint-web.sh"]
