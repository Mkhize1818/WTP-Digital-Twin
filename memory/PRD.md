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
│   ├── Header.js, PFDVisualization.js (6 tab toggle)
│   ├── PFDIsometric.js + PFDIsometric.css (3D isometric PFD)
│   ├── WaterBalance.js (UPGRADED: 6 sections matching Barberton WSB)
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
- [x] 3D Isometric PFD with animated water levels, clickable tanks/sensors, SVG pipe flow
- [x] Sensor analytics drill-down with time series + rolling averages
- [x] Calendar date range picker + preset ranges
- [x] CSV/PDF compliance export
- [x] Leak detection on PFD (6 zones)
- [x] AI Agent (Claude Sonnet 4.5)
- [x] **Water Balance (UPGRADED):**
  - 8 Balance overview cards with L/min and m³/d conversions
  - SVG Sankey-style water balance flow diagram (14 process nodes)
  - Facility-level water balance table (5 facilities)
  - Loss analysis with pie chart (5 categories: treatment, evaporation, seepage, leakage, unaccounted)
  - 24H water balance time series (Recharts AreaChart)
  - Quality/Salt balance table (TDS at 6 measurement points, salt load kg/d)
  - System efficiency bars (4 metrics)
- [x] NRW Analytics tab
- [x] Demand Intelligence tab
- [x] Asset Health tab
- [x] Water Quality tab
- [x] Standalone demo HTML (all features incl. upgraded Water Balance)

## Key API Endpoints
- GET /api/stats, /api/sensors/latest, /api/sensors/{id}/analytics
- GET /api/alerts, /api/anomalies, /api/leaks/zones
- GET /api/reports/compliance, /api/water-balance (ENHANCED)
- GET /api/analytics/nrw, /api/analytics/demand
- GET /api/analytics/asset-health, /api/analytics/water-quality
- POST /api/ai/query

## Water Balance API Response Structure
```json
{
  "intake": { "municipal", "rainfall_runoff", "borehole", "total", "total_m3d" },
  "treatment": { "treated_output", "treatment_loss", "loss_pct" },
  "distribution": { "cip_lines", "pet_lines", "canline", "syrup_room", "total" },
  "recovery": { "nano_recovery_1", "nano_recovery_2", "backwash", "total" },
  "losses": { "treatment", "evaporation", "seepage", "leak_losses", "unaccounted", "total" },
  "balance_summary": { "total_inflows", "total_inflows_m3d", "total_outflows", "total_outflows_m3d", "change_in_storage", "balance_check_pct" },
  "efficiency": { "system_efficiency", "water_use_ratio", "recovery_rate", "loss_rate" },
  "facilities": [5 facility objects with inflows/outflows/storage_change],
  "hourly_balance": [24 hourly entries with inflows/outflows/losses/recovery/net],
  "quality_balance": [6 measurement points with tds_mg_l/flow_l_min/salt_load_kg_d]
}
```

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
