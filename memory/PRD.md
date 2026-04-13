# Digital Twin - Water Reticulation System (Coke MVP)

## Architecture
- Backend: FastAPI + MongoDB + emergentintegrations (Claude Sonnet 4.5)
- Frontend: React + Tailwind + Recharts + Phosphor Icons + shadcn (Calendar, Popover) + jsPDF
- Database: MongoDB (sensor_readings, alerts, anomalies, chat_messages, leaks)
- 27 simulated instruments, 5-second intervals

## Code Architecture
```
/app/frontend/src/
├── pages/Dashboard.js         # Main layout, uses useDashboardData hook
├── hooks/
│   ├── useDashboardData.js    # Data fetching hook (stats, sensors, alerts, anomalies)
│   └── useAIChat.js           # AI chat logic hook (messages, submit, session)
├── utils/
│   ├── exportSensorReport.js  # CSV/PDF export for sensor analytics
│   └── exportCompliance.js    # CSV/PDF export for compliance reports
├── components/
│   ├── Header.js              # Nav with Talbot + Coca-Cola logos
│   ├── PFDVisualization.js    # Interactive PFD with 27 tags + Water Balance toggle
│   ├── WaterBalance.js        # Water balance summary, flow diagram, efficiency gauges
│   ├── SensorAnalytics.js     # Analytics drill-down + calendar picker
│   ├── AIAgentPanel.js        # AI querying panel (uses useAIChat)
│   ├── ChatMessage.js         # Extracted chat message sub-component
│   ├── ComplianceExport.js    # Compliance PDF/CSV reporting
│   ├── SensorGrid.js          # Grid container (uses SensorGridItem)
│   ├── SensorGridItem.js      # Extracted individual sensor card
│   ├── AlertsFeed.js          # Alerts feed
│   ├── AnomalyPanel.js        # Anomaly detection panel
│   └── analytics/ChartPanels.js # Chart sub-components
```

## What's Implemented
- [x] Header: Talbot logo left | Digital Twin centered | CCBA Coca-Cola logo right
- [x] 27 instruments: 5 FIT, 10 LIT, 5 PIT, 2 pH, 1 Cl, 2 EC, 2 DPT
- [x] PFD with labeled clickable instrument tags on actual tank/meter positions
- [x] Calendar date range picker (shadcn Calendar + Popover, two-month view)
- [x] Preset range buttons (1H/6H/24H/7D/ALL) + custom date range
- [x] Sensor analytics drill-down with time series, rolling averages, stats
- [x] CSV/PDF compliance export (dashboard + per-sensor)
- [x] Leak detection on PFD (6 zones, animated indicators)
- [x] AI Agent (Claude Sonnet 4.5)
- [x] Code quality pass 1: secrets.SystemRandom, `is` vs `==` fix
- [x] Code quality pass 2: Custom hooks, component splitting, utils extraction
- [x] Water Balance: Summary cards, flow diagram, production/recovery/losses breakdown, efficiency gauges — integrated into PFD with toggle

## Key API Endpoints
- GET /api/stats — System overview metrics
- GET /api/sensors/latest — Latest 27 sensor readings
- GET /api/sensors/{id}/analytics — Time-series analytics with date range
- GET /api/alerts — Alert feed
- GET /api/anomalies — Anomaly detection data
- GET /api/leaks/zones — Leak zone statuses
- GET /api/reports/compliance — Compliance report with time range
- POST /api/ai/query — AI chat endpoint
- GET /api/water-balance — Water balance calculations (intake, treatment, distribution, recovery, wastewater, losses, efficiency)

## Prioritized Backlog
### P1
- Email/SMS alert notifications
- Multi-site support for different Coke facilities
### P2
- User authentication & role-based access
- Predictive maintenance ML models
- SCADA/PLC data source integration
- Connect to real data sources (currently simulated in-memory)
- Scheduled compliance email (daily/weekly PDF reports)
