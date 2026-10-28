FROM node:22-bookworm-slim

WORKDIR /app
COPY backend/package*.json ./backend/
RUN npm --prefix backend ci --omit=dev
COPY . .
ENV NODE_ENV=production
EXPOSE 5000
CMD ["npm", "--prefix", "backend", "start"]
