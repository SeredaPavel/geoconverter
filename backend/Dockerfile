# /geoconverter/backend/Dockerfile
# Тонкий рантайм для FastAPI/pyproj: без apt upgrade и без libproj-dev/proj-bin/proj-data
# (гриды монтируются томом /usr/share/proj из docker-compose.yml)

FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Только минимальные системные утилиты (без toolchain и без PROJ пакетов)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Python-зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Приложение
COPY app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
