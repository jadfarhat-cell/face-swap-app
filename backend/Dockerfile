FROM python:3.11-slim

# ffmpeg for video reassembly, libgl1 + libglib2.0 for OpenCV headless
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Persist uploads/outputs/models as volume mount points
RUN mkdir -p uploads outputs models

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
