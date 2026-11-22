#!/bin/sh
set -e

echo "=== [HostelSwap Backend] Starting entrypoint script ==="

# Wait for database if PostgreSQL host is configured and not local
if [ -n "$DATABASE_HOST" ] && [ "$DATABASE_HOST" != "localhost" ] && [ "$DATABASE_HOST" != "127.0.0.1" ] && [ "$USE_SQLITE" != "True" ] && [ "$USE_SQLITE" != "1" ]; then
    echo "Waiting for PostgreSQL at $DATABASE_HOST:${DATABASE_PORT:-5432}..."
    python - <<END
import os, sys, time, socket
host = os.environ.get('DATABASE_HOST')
port = int(os.environ.get('DATABASE_PORT', 5432))
for i in range(30):
    try:
        s = socket.create_connection((host, port), timeout=2)
        s.close()
        print("PostgreSQL is available!")
        sys.exit(0)
    except OSError:
        time.sleep(1)
print("Timed out waiting for PostgreSQL!")
sys.exit(1)
END
fi

# Run database migrations if running the web server
if [ "$1" = "gunicorn" ] || [ "$2" = "runserver" ]; then
    echo "Applying database migrations..."
    python manage.py migrate --noinput

    echo "Collecting static files with WhiteNoise..."
    python manage.py collectstatic --noinput
fi

echo "=== [HostelSwap Backend] Executing command: $@ ==="
exec "$@"
