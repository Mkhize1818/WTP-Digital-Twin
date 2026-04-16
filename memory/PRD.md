# Digital Twin - Water Reticulation System (Coke MVP)

## Architecture
- Backend: FastAPI + MongoDB + emergentintegrations (Claude Sonnet 4.5)
- Frontend: React + Tailwind + Recharts + Phosphor Icons + shadcn (Calendar, Popover) + jsPDF
- Database: MongoDB (sensor_readings, alerts, anomalies, chat_messages, leaks)
- 27 simulated instruments, 5-second intervals
- Standalone demo: `/app/standalone_demo.html` (self-contained HTML)

## Code Architecture
```
/app/frontend/src/
├── pages/Dashboard.js
├── hooks/useDashboardData.js, useAIChat.js
├── utils/exportSensorReport.js, exportCompliance.js
├── components/
│   ├── Header.js, PFDVisualization.js (6 tab toggle, cleaned up)
│   ├── PFDIsometric.js + PFDIsometric.css (NEW: 3D isometric PFD)
│   ├── WaterBalance.js, SensorAnalytics.js, AIAgentPanel.js
│   ├── ChatMessage.js, ComplianceExport.js
│   ├── SensorGrid.js, SensorGridItem.js
│   ├── AlertsFeed.js, AnomalyPanel.js
│   └── analytics/
│       ├── ChartPanels.js, NRWAnalytics.js
│       ├── DemandIntelligence.js, AssetHealth.js
│       └── WaterQualityIntelligence.js
/app/backend/server.py (all endpoints + simulation)
/app/standalone_demo.html (full offline demo with 3D PFD)
```

## What's Implemented
- [x] Header: Talbot logo left | Digital Twin centered | CCBA logo right
- [x] 27 instruments with interactive 3D isometric PFD tags
- [x] **3D Isometric PFD** with animated water levels, clickable tanks/sensors, SVG pipe flow animations
- [x] Layout matches original 2D PFD flow (Intake→Treatment→Distribution, Recovery loops)
- [x] Sensor analytics drill-down with time series + rolling averages
- [x] Calendar date range picker + preset ranges
- [x] CSV/PDF compliance export
- [x] Leak detection on PFD (6 zones)
- [x] AI Agent (Claude Sonnet 4.5)
- [x] Code quality pass 1 & 2
- [x] Water Balance tab
- [x] NRW Analytics tab (DMA analysis, MNF, loss separation, pipe risk)
- [x] Demand Intelligence tab (forecast, heatmap, segmentation, seasonal)
- [x] Asset Health tab (condition scores, RUL, break history, maintenance)
- [x] Water Quality tab (live metrics, chlorine decay, spatial grid, events)
- [x] **Standalone demo HTML updated with 3D isometric PFD** (offline, all features)

## Key API Endpoints
- GET /api/stats, /api/sensors/latest, /api/sensors/{id}/analytics
- GET /api/alerts, /api/anomalies, /api/leaks/zones
- GET /api/reports/compliance, /api/water-balance
- GET /api/analytics/nrw, /api/analytics/demand
- GET /api/analytics/asset-health, /api/analytics/water-quality
- POST /api/ai/query

## Prioritized Backlog
### P1
- Connect to real data sources/APIs (currently simulated)
- Scheduled compliance email reports (daily/weekly PDF)
### P2
- Email/SMS alert notifications
- Multi-site support for different Coke facilities
- User auth & role-based access
- Predictive maintenance ML models
- SCADA/PLC data source integration
