# Digital Twin - Water Reticulation System (Coke MVP)

## Architecture
- Backend: FastAPI + MongoDB + emergentintegrations (Claude Sonnet 4.5)
- Frontend: React + Tailwind + Recharts + Phosphor Icons + shadcn + jsPDF
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
│   ├── Header.js, PFDVisualization.js (7 tabs + date filter)
│   ├── PFDIsometric.js + PFDIsometric.css (3D isometric PFD)
│   ├── PlantOverview.js (NEW: Canvas 2D 3D plant schematic)
│   ├── DateRangeFilter.js (NEW: global date filter)
│   ├── WaterBalance.js (Enhanced Barberton WSB-style)
│   ├── SensorAnalytics.js, AIAgentPanel.js
│   ├── ChatMessage.js, ComplianceExport.js
│   ├── SensorGrid.js, SensorGridItem.js
│   ├── AlertsFeed.js, AnomalyPanel.js
│   └── analytics/
│       ├── ChartPanels.js, NRWAnalytics.js
│       ├── DemandIntelligence.js, AssetHealth.js
│       └── WaterQualityIntelligence.js
/app/backend/server.py (all endpoints + simulation)
/app/standalone_demo.html (full offline demo)
```

## What's Implemented
- [x] Header: Talbot logo left | Digital Twin centered | CCBA logo right
- [x] 27 instruments with interactive 3D isometric PFD tags
- [x] 3D Isometric PFD with animated water levels, clickable tanks/sensors
- [x] **Plant Overview (NEW):** Canvas 2D isometric 3D plant schematic with ~45 equipment, tank water levels, flow paths, camera orbit/zoom, view modes, clickable for analytics
- [x] **Date Range Filter (NEW):** Presets (1H/6H/24H/7D/30D) + custom date picker, shown on all analytics tabs
- [x] Sensor analytics drill-down with time series + rolling averages
- [x] CSV/PDF compliance export, Calendar date range picker
- [x] Leak detection on PFD (6 zones)
- [x] AI Agent (Claude Sonnet 4.5)
- [x] Enhanced Water Balance (Sankey, facility table, loss analysis, 24H trend, TDS/salt, efficiency)
- [x] NRW Analytics, Demand Intelligence, Asset Health, Water Quality Intelligence
- [x] Standalone demo HTML (all 7 tabs, 3D plant, offline)

## 7 Dashboard Tabs
1. Process Flow (3D Isometric PFD)
2. Plant Overview (3D Canvas plant schematic)
3. Water Balance (Barberton WSB-style)
4. NRW Analytics
5. Demand Intelligence
6. Asset Health
7. Water Quality Intelligence

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
- Backend date filtering for analytics endpoints
### P2
- Email/SMS alert notifications
- Multi-site support for different Coke facilities
- User auth & role-based access
- Predictive maintenance ML models
- SCADA/PLC data source integration
