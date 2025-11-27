# Use a slim Python base image
FROM python:3.12-slim

# Create non-root user for security
RUN useradd -m appuser

# Set workdir
WORKDIR /app

# Install system dependencies (if needed, e.g. for SSL, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency file first (for better Docker cache)
COPY api/requirements.txt .

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Copy the app code and database
COPY api/ ./api/
COPY database/ ./database/

# Expose the port uvicorn will listen on
EXPOSE 8080

# Use env var PORT (Cloud Run sets this) default 8080
ENV PORT=8080

# Run as non-root
USER appuser

# Start the FastAPI app with uvicorn from api directory
CMD ["bash", "-c", "cd api && uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
