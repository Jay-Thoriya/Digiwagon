# Slim image - uses the lightweight (fastembed/ONNX) deps so it fits free tiers.
FROM python:3.11-slim

WORKDIR /app

# Install deps first so Docker caches this layer when only code changes.
COPY requirements-deploy.txt .
RUN pip install --no-cache-dir -r requirements-deploy.txt

COPY . .

# Render/Fly inject the port via $PORT; default to 8000 for local runs.
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
