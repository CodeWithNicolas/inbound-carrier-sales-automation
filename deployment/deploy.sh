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

echo "Using project:    ${PROJECT_ID}"
echo "Using region:     ${REGION}"
echo "Using image URL:  ${IMAGE_URL}"

# --- gcloud project ---
gcloud config set project "${PROJECT_ID}"

# --- ensure Artifact Registry repo exists ---
gcloud artifacts repositories create carrier-api-repo \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Container images for inbound carrier sales API" \
  2>/dev/null || echo "Artifact Registry repo already exists"

# --- build & push image using Cloud Build config in deployment/ ---
gcloud builds submit \
  --config "${SCRIPT_DIR}/cloudbuild.yaml" \
  --substitutions=_IMAGE_URL="${IMAGE_URL}" \
  "${REPO_ROOT}"

# --- secrets in Secret Manager ---
echo -n "${FMCSA_API_KEY}" | gcloud secrets create fmcsa-api-key \
  --replication-policy="automatic" \
  --data-file=- 2>/dev/null || \
echo -n "${FMCSA_API_KEY}" | gcloud secrets versions add fmcsa-api-key --data-file=-

echo -n "${INTERNAL_API_KEY}" | gcloud secrets create internal-api-key \
  --replication-policy="automatic" \
  --data-file=- 2>/dev/null || \
echo -n "${INTERNAL_API_KEY}" | gcloud secrets versions add internal-api-key --data-file=-

# --- render Cloud Run manifest from template into deployment/cloudrun-service.yaml ---
env IMAGE_URL="${IMAGE_URL}" \
  envsubst < "${SCRIPT_DIR}/cloudrun-service.template.yaml" > "${SCRIPT_DIR}/cloudrun-service.yaml"

# --- deploy to Cloud Run ---
gcloud run services replace "${SCRIPT_DIR}/cloudrun-service.yaml" \
  --region="${REGION}" \
  --platform=managed

# --- print URL ---
SERVICE_URL=$(gcloud run services describe carrier-api \
  --region="${REGION}" \
  --platform=managed \
  --format='value(status.url)')

echo "Deployed carrier-api to: ${SERVICE_URL}"
