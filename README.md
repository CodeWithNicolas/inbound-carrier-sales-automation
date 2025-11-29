# Inbound Carrier Sales Automation

> AI-powered voice agent for automating freight carrier qualification, load matching, and rate negotiation.

**Built for Acme Logistics**

---

## Project overwiew

Automates the entire carrier qualification process when carriers call looking for loads:

1. **🔍 Instant FMCSA Verification** - Validates MC/DOT numbers, insurance, safety records
2. **📦 Smart Load Matching** - Searches inventory by location, equipment, and date
3. **💰 Automated Negotiation** - Handles up to 3 rounds of rate negotiation within your margins
4. **📊 Real-time Analytics** - Tracks all calls, outcomes, and performance metrics

**Result:** Your sales team only handles qualified, price-agreed carriers ready to book.

---

## 📁 Repository Structure

```
inbound-carrier-sales-automation/
├── api/                          # FastAPI backend
│   ├── main.py                   # API server with endpoints
│   ├── fmcsa_api/                # FMCSA carrier verification
│   │   └── service.py
│   ├── search_load/              # Load matching logic
│   │   └── service.py
│   ├── evaluate_negotiation/    # Rate negotiation engine
│   │   ├── models.py
│   │   └── service.py
│   ├── metrics/                  # Call tracking and analytics
│   │   ├── models.py
│   │   ├── service.py
│   │   └── storage.py
│   └── requirements.txt          # Python dependencies
│
├── dashboard/                    # React analytics dashboard
│   ├── src/
│   │   ├── App.tsx              # Main app with login
│   │   ├── main.tsx             # Application entry point
│   │   ├── types.ts             # TypeScript type definitions
│   │   ├── components/          # Reusable components
│   │   │   ├── Sidebar.tsx
│   │   │   └── USMap.tsx
│   │   └── views/               # Main view components
│   │       ├── AnalyticsView.tsx
│   │       ├── LoadsView.tsx
│   │       ├── RecentCallsView.tsx
│   │       └── RoutesView.tsx
│   ├── Dockerfile               # Dashboard container
│   ├── nginx.conf               # NGINX configuration
│   ├── vite.config.ts           # Vite build configuration
│   └── package.json             # Node dependencies
│
├── database/                     # Data storage
│   ├── database_of_loads.csv    # Available loads inventory
│   └── demo_calls.json          # Sample call data
│
├── deployment/                   # GCP deployment configs
│   ├── deploy.sh                # One-command deployment script
│   ├── cloudbuild.yaml          # API build configuration
│   ├── cloudbuild-dashboard.yaml # Dashboard build configuration
│   ├── cloudrun-service.template.yaml      # API Cloud Run template
│   └── cloudrun-dashboard.template.yaml    # Dashboard Cloud Run template
│
├── Dockerfile                    # API container
├── cloudrun-service.yaml         # Cloud Run service configuration
├── project-description.md        # Complete project documentation
└── deployment-description.md     # Deployment guide
```

---

## 📚 Documentation

### 📖 [Project Description](./project-description.md)
Complete overview of the solution including:
- How the system works
- API endpoints and specifications
- Dashboard features
- HappyRobot voice agent prompt
- Example call scenarios

### 🚀 [Deployment Guide](./deployment-description.md)
Step-by-step deployment instructions:
- Prerequisites and setup
- GCP project configuration
- Environment variables
- Deployment process

---

## 🔗 Live Services

**Production Deployment:**
- **API:** https://carrier-api-znfljh5y5a-uc.a.run.app
- **Dashboard:** https://carrier-dashboard-znfljh5y5a-uc.a.run.app
- **API Docs:** https://carrier-api-znfljh5y5a-uc.a.run.app/docs

**Access:**
- Dashboard requires API key authentication
- API endpoints require `x-api-key` header

---
