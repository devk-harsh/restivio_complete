FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_AUTH_SERVICE_URL=http://localhost:3000
ARG VITE_HOTEL_SERVICE_URL=http://localhost:3001
ARG VITE_BOOKING_SERVICE_URL=http://localhost:3002
ARG VITE_DEMO_MODE=false
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE
ENV VITE_AUTH_SERVICE_URL=$VITE_AUTH_SERVICE_URL VITE_HOTEL_SERVICE_URL=$VITE_HOTEL_SERVICE_URL VITE_BOOKING_SERVICE_URL=$VITE_BOOKING_SERVICE_URL
RUN npm run build
FROM nginx:1.28-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
