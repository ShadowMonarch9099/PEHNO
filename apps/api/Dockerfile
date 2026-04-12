FROM python:3.11-slim

WORKDIR /app

# System dependencies for Pillow and ML libraries
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    g++ \
    libjpeg-dev \
    zlib1g-dev \
    libwebp-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set Python path to include packages
ENV PYTHONPATH="/app:/packages"

EXPOSE 8000
