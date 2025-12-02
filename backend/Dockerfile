# /geoconverter/backend/Dockerfile
FROM python:3.11-slim

# Чуть больше удобства логов
ENV PYTHONUNBUFFERED=1

# Системные зависимости:
# - libxml2 / libxslt1.1 — нужны для работы python-docx (через lxml)
# - proj-bin/proj-data — бинарь proj и базовые датчики (grids ты всё равно монтируешь volume-ом)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libxml2 \
    libxslt1.1 \
    proj-bin \
    proj-data \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Ставим Python-зависимости
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код приложения
COPY app /app/app

# Копируем данные:
# - data/grids (если вдруг нет volume — всё равно будет fallback)
# - data/templates (DOCX-шаблоны для выгрузки)
COPY data /app/data

# Каталог для временных загружаемых файлов
RUN mkdir -p /app/uploads

EXPOSE 8000

# Прод-режим: uvicorn без --reload (dev-режим у тебя уже в docker-compose.override.yml)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
