# Deployment Guide

Complete step-by-step guide to deploy the Inbound Carrier Sales Automation solution to Google Cloud Platform.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Get FMCSA API Key](#get-fmcsa-api-key)
4. [Configure Environment](#configure-environment)
5. [Deploy to Google Cloud](#deploy-to-google-cloud)
6. [Verify Deployment](#verify-deployment)
7. [Update Deployment](#update-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

Install the following on your Linux system:

#### 1. **Google Cloud SDK (gcloud CLI)**

```bash
# Using Snap (recommended)
sudo snap install google-cloud-sdk --classic

# Verify installation
gcloud --version
```

#### 2. **Git**

```bash
sudo apt-get update
sudo apt-get install git -y
```

### Google Cloud Platform Account

1. **Create a GCP Account** (if you don't have one):
   - Go to https://cloud.google.com/
   - Click "Get started for free"
   - Follow the registration process
   - You'll get $300 in free credits for 90 days

2. **Enable Billing**:
   - Go to [GCP Console](https://console.cloud.google.com/)
   - Navigate to "Billing" in the menu
   - Link a payment method (required even with free credits)

---

## Initial Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/CodeWithNicolas/inbound-carrier-sales-automation.git

# Navigate to the project directory
cd inbound-carrier-sales-automation
```

### 2. Authenticate with Google Cloud

```bash
# Login to your Google account
gcloud auth login

# This will open a browser window for authentication
# Follow the prompts to authenticate
```

### 3. Create a New GCP Project

```bash
# Create a new project (replace PROJECT_ID with your desired project ID)
# Project ID must be globally unique and 6-30 characters
gcloud projects create YOUR-PROJECT-ID --name="Acme Logistics"

# Example:
# gcloud projects create acme-logistics-prod --name="Acme Logistics"

# Set the project as default
gcloud config set project YOUR-PROJECT-ID
```

### 4. Enable Required APIs

```bash
# Enable Cloud Run API
gcloud services enable run.googleapis.com

# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# Enable Artifact Registry API
gcloud services enable artifactregistry.googleapis.com

# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com
```

## Configure Environment

### 1. Create Environment File

Create a `.env` file in the project root directory:

```bash
# Create .env file
touch .env
```

### 2. Configure Environment Variables

Edit the `.env` file and add the following variables:

```bash
# Required
PROJECT_ID=your-project-id              # The GCP project ID you created
REGION=us-central1                      # Region for Cloud Run deployment
FMCSA_API_KEY=your-fmcsa-api-key       # From FMCSA developer portal
INTERNAL_API_KEY=your-secure-api-key    # Generate a secure random string

# Optional
IMAGE_TAG=latest                        # Docker image tag (defaults to 'latest')
```

### 3. Generate Secure Internal API Key

The `INTERNAL_API_KEY` is used to authenticate requests between your dashboard and API. Generate a secure key:

```bash
# Using OpenSSL
openssl rand -hex 32

# Or using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Copy the generated key and paste it in your `.env` file as the `INTERNAL_API_KEY` value.

### Example .env File

```bash
# Required
PROJECT_ID=acme-logistics-prod
REGION=us-central1
FMCSA_API_KEY=a1b2c3d4-e5f6-7890-abcd-ef1234567890
INTERNAL_API_KEY=e4f8c7b2a9d6e1f4c8a7b3d9e2f6c1a8b5d7e9f2c4a6b8d1e3f5c7a9b2d4e6f8

# Optional (defaults to 'latest' if not set)
IMAGE_TAG=latest
```

---

## Deploy to Google Cloud

### Run Deployment

```bash
# Make the deployment script executable
chmod +x deployment/deploy.sh

# Run the deployment
./deployment/deploy.sh
```

---

## Verify Deployment

### Test API

```bash
# Health check
curl https://YOUR-API-URL/

# Test authentication (replace YOUR_INTERNAL_API_KEY)
curl -H "x-api-key: YOUR_INTERNAL_API_KEY" \
  https://YOUR-API-URL/metrics/summary

# View API documentation in browser
https://YOUR-API-URL/docs
```

### Test Dashboard

1. Open dashboard URL in browser
2. Enter your `INTERNAL_API_KEY` at the login page
3. You should see the analytics dashboard

### View Logs

```bash
# View API logs
gcloud run services logs read carrier-api --region=us-central1 --limit=50

# Follow logs in real-time
gcloud run services logs tail carrier-api --region=us-central1
```

---

## Next Steps

### Configure HappyRobot

In HappyRobot platform, configure these webhook endpoints:
- `POST https://YOUR-API-URL/carrier/validate`
- `GET https://YOUR-API-URL/loads/search`
- `POST https://YOUR-API-URL/negotiation/evaluate`
- `POST https://YOUR-API-URL/calls/log`

Add header: `x-api-key: YOUR_INTERNAL_API_KEY`

---

