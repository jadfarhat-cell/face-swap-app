# Face Swap Application

A modern web and mobile application for face swapping using advanced AI models.

## Features

- Real-time face detection and swapping
- High-quality output
- Support for images and videos
- User-friendly interface
- Cloud-based processing

## Architecture

```
face-swap-app/
├── backend/          # Python FastAPI backend
├── frontend/         # React web interface
├── mobile/          # React Native mobile app
├── models/          # AI models directory
└── docker-compose.yml  # Docker orchestration
```

## Backend

The backend is built with Python 3.10 and FastAPI, handling:
- Face detection (MTCNN)
- Face alignment
- Face swapping using InsightFace
- Image processing and optimization

## Frontend

React-based web interface with:
- Real-time preview
- Batch processing
- Download management
- User authentication

## Setup

See `setup_model.sh` for model download and setup instructions.

## Docker Deployment

```bash
docker-compose up
```

This will start:
- FastAPI backend on port 8000
- React frontend on port 3000
- PostgreSQL database

## API Documentation

Once running, visit `http://localhost:8000/docs` for interactive API documentation.

## Models Used

- MTCNN for face detection
- ArcFace for face recognition
- InsightFace for face swapping
- U-Net for image restoration

## Performance

On GPU (NVIDIA A100):
- Face detection: ~50ms
- Face swap: ~200ms
- Image restoration: ~300ms

## Security

- All processing done server-side
- Temporary files deleted after processing
- HTTPS only in production
- Rate limiting per user

## License

MIT License - See LICENSE file
