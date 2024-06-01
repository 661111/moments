FROM debian:latest
RUN apt update && apt install -y curl libheif-examples git
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 
RUN apt install  -y nodejs
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p /app/data/upload
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/db.sqlite
ENV UPLOAD_DIR=/app/data/upload
ENV RATE_LIMIT_WINDOW_MS=1000
ENV RATE_LIMIT_MAX_REQUESTS=100
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV REDIS_PASSWORD=
ENV REDIS_DATABASE=0
RUN npx prisma migrate dev --name v0_4_2
RUN npm run build
RUN chmod +x /app/start.sh
EXPOSE 3000
CMD /app/start.sh
