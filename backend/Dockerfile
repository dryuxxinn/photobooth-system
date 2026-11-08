FROM python:3.12-slim

WORKDIR /app

# Install system packages for gPhoto2 (Canon DSLR USB tethering) and CUPS printing client
RUN apt-get update && apt-get install -y --no-install-recommends \
    gphoto2 \
    libgphoto2-dev \
    cups-client \
    usbutils \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend source code and templates
COPY backend /app/backend
COPY templates /app/templates

# Create storage and database directories
RUN mkdir -p /app/storage/captures /app/storage/processed /app/storage/thumbnails /app/storage/exports /app/database

ENV PYTHONPATH=/app
ENV STORAGE_BASE_DIR=/app/storage
ENV DATABASE_PATH=/app/database/photobooth.db
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8000

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
