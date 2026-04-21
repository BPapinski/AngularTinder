FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p data
RUN rm -f data/db.sqlite3

RUN python manage.py migrate
RUN python manage.py collectstatic --noinput

# Always run - this ensures admin is created even after manual deletion
ARG CACHE_BUST=1
RUN python manage.py create_sample_users

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
