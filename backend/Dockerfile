# /geoconverter/backend/Dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Системные зависимости для pyproj и wget (healthcheck из docker-compose.override.yml)
RUN apt-get update && apt-get install -y --no-install-recommends \
    proj-bin proj-data \
    libxml2 libxslt1.1 \
    wget \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Устанавливаем Python-зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Код приложения
COPY app /app/app

# Каталоги, которые могут использоваться приложением
# (grids и uploads реально подмонтируются volume-ами из docker-compose)
RUN mkdir -p /app/data /app/uploads

ENV UVICORN_HOST=0.0.0.0 \
    UVICORN_PORT=8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
