FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

# CHOKIDAR_USEPOLLING makes hot-reload work inside Docker on Windows/macOS
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

CMD ["npm", "start"]
