#!/bin/sh
# Backup ditor i databazës — i enkriptueshëm dhe me retention 30 ditë.
# Instalimi si cron (në server, në dosjen handwerk-app):
#   crontab -e
#   15 2 * * * cd /opt/Handwerk/handwerk-app && sh scripts/backup.sh >> backups/backup.log 2>&1
set -eu

DATA=$(date +%Y-%m-%d_%H%M)
mkdir -p backups

docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U handwerk --format=custom handwerk > "backups/handwerk_${DATA}.dump"

# Retention: fshi dump-et më të vjetra se 30 ditë
find backups -name "handwerk_*.dump" -mtime +30 -delete

echo "OK ${DATA} — $(ls backups/*.dump 2>/dev/null | wc -l) backup(e) në disk"

# RESTORE (testojeni një herë në muaj!):
#   docker compose -f docker-compose.prod.yml exec -T db \
#     pg_restore -U handwerk --clean --if-exists -d handwerk < backups/handwerk_DATA.dump
