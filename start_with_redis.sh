#!/bin/sh
npx prisma migrate deploy
if [ ! -f /app/data/db.sqlite ]; then
    cp db.sqlite /app/data/db.sqlite
fi
if [ ! -d /app/data/upload ]; then
    mkdir /app/data/upload
fi
redis-server --daemonize yes
sleep 5
redis-cli -h localhost set foo bar
node /app/.output/server/index.mjs
