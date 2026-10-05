FROM node:22-bookworm-slim
ARG SERVICE
WORKDIR /app/${SERVICE}
COPY ${SERVICE}/package*.json ./
RUN npm ci --no-audit --no-fund
COPY ${SERVICE}/ ./
COPY scripts/ /app/scripts/
COPY docs/ /app/docs/
RUN npm run build && chown -R node:node /app
USER node
EXPOSE 3000 3001 3002 3003
CMD ["npm", "start"]
