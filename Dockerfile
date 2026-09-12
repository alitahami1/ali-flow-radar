FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js engine-runtime.js live-feed.js astra-gateway.js astra-advisor.js ./
RUN mkdir /app/data && chown -R node:node /app
USER node
ENV PORT=3000 DATA_DIR=/app/data
EXPOSE 3000
CMD ["node", "astra-gateway.js"]
