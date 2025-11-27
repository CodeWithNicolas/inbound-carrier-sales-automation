#!/usr/bin/env bash
set -euo pipefail

# --- figure out paths ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR%/deployment}"

cd "${REPO_ROOT}"

# --- load .env from repo root ---
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
else
  echo ".env file not found in repo root. Copy .env.example to .env and fill values."
  exit 1
fi

: "${PROJECT_ID:?PROJECT_ID not set}"
: "${REGION:?REGION not set}"
: "${FMCSA_API_KEY:?FMCSA_API_KEY not set}"
: "${INTERNAL_API_KEY:?INTERNAL_API_KEY not set}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/carrier-api-repo/carrier-api:${IMAGE_TAG}"
DASHBOARD_IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/carrier-dashboard-repo/carrier-dashboard:${IMAGE_TAG}"

echo "Using project:           ${PROJECT_ID}"
echo "Using region:            ${REGION}"
echo "Using API image URL:     ${IMAGE_URL}"
echo "Using Dashboard image:   ${DASHBOARD_IMAGE_URL}"

# --- gcloud project ---
gcloud config set project "${PROJECT_ID}"

# --- enable services ---
gcloud services enable secretmanager.googleapis.com >/dev/null 2>&1 || true

# --- ensure Artifact Registry repos exist ---
gcloud artifacts repositories create carrier-api-repo \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Container images for inbound carrier sales API" \
  2>/dev/null || echo "API Artifact Registry repo already exists"

gcloud artifacts repositories create carrier-dashboard-repo \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Container images for inbound carrier sales dashboard" \
  2>/dev/null || echo "Dashboard Artifact Registry repo already exists"

# --- build & push API image using Cloud Build config in deployment/ ---
echo "Building and pushing API image..."
gcloud builds submit \
  --config "${SCRIPT_DIR}/cloudbuild.yaml" \
  --substitutions=_IMAGE_URL="${IMAGE_URL}" \
  "${REPO_ROOT}"

# --- secrets in Secret Manager (do this before deploying) ---
echo "Creating/updating secrets in Secret Manager..."
echo -n "${FMCSA_API_KEY}" | gcloud secrets create fmcsa-api-key \
  --replication-policy="automatic" \
  --data-file=- 2>/dev/null || \
echo -n "${FMCSA_API_KEY}" | gcloud secrets versions add fmcsa-api-key --data-file=-

echo -n "${INTERNAL_API_KEY}" | gcloud secrets create internal-api-key \
  --replication-policy="automatic" \
  --data-file=- 2>/dev/null || \
echo -n "${INTERNAL_API_KEY}" | gcloud secrets versions add internal-api-key --data-file=-

# --- deploy API first to get the URL ---
echo "Deploying API to Cloud Run..."
env IMAGE_URL="${IMAGE_URL}" \
    SERVICE_NAME="carrier-api" \
    SERVICE_ACCOUNT_EMAIL="${PROJECT_ID}-compute@developer.gserviceaccount.com" \
    FMCSA_SECRET_NAME="fmcsa-api-key" \
    INTERNAL_SECRET_NAME="internal-api-key" \
  envsubst < "${SCRIPT_DIR}/cloudrun-service.template.yaml" > "${SCRIPT_DIR}/cloudrun-service.yaml"

gcloud run services replace "${SCRIPT_DIR}/cloudrun-service.yaml" \
  --region="${REGION}" \
  --platform=managed

# --- get API URL ---
API_SERVICE_URL=$(gcloud run services describe carrier-api \
  --region="${REGION}" \
  --platform=managed \
  --format='value(status.url)')

echo "API deployed at: ${API_SERVICE_URL}"

# --- build & push Dashboard image with API URL ---
echo "Building and pushing Dashboard image with API URL..."
gcloud builds submit \
  --config "${SCRIPT_DIR}/cloudbuild-dashboard.yaml" \
  --substitutions=_DASHBOARD_IMAGE_URL="${DASHBOARD_IMAGE_URL}",_API_URL="${API_SERVICE_URL}",_INTERNAL_API_KEY="${INTERNAL_API_KEY}" \
  "${REPO_ROOT}"

# --- deploy Dashboard to Cloud Run ---
echo "Deploying Dashboard to Cloud Run..."
env DASHBOARD_IMAGE_URL="${DASHBOARD_IMAGE_URL}" \
    API_URL="${API_SERVICE_URL}" \
  envsubst < "${SCRIPT_DIR}/cloudrun-dashboard.template.yaml" > "${SCRIPT_DIR}/cloudrun-dashboard.yaml"

gcloud run services replace "${SCRIPT_DIR}/cloudrun-dashboard.yaml" \
  --region="${REGION}" \
  --platform=managed

# --- print Dashboard URL ---
DASHBOARD_SERVICE_URL=$(gcloud run services describe carrier-dashboard \
  --region="${REGION}" \
  --platform=managed \
  --format='value(status.url)')

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo "API URL:       ${API_SERVICE_URL}"
echo "Dashboard URL: ${DASHBOARD_SERVICE_URL}"
echo "=========================================="
